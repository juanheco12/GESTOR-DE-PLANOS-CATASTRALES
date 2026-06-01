import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToRoles, sendPushToUser } from "@/lib/push";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { accion } = await req.json();

    const request = await prisma.request.findUnique({
      where: { id },
      include: { plan: { select: { radicado: true, id: true } } },
    });
    if (!request) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const isAdmin  = session.user.role === "ADMINISTRADOR" || session.user.role === "ENCARGADO";
    const radicado = request.plan.radicado;
    const planId   = request.planId;
    const quien    = session.user.name ?? session.user.email ?? "Encargado";

    const isOwner =
      !request.adminEntregaId ||
      request.adminEntregaId === session.user.id ||
      session.user.role === "ADMINISTRADOR";

    let result;

    // ── 1. ENCARGADO acepta solicitud y queda asignado ──────────────────────────
    if (accion === "MARCAR_LISTO" && isAdmin) {
      result = await prisma.$transaction(async (tx) => {
        const updated = await tx.request.update({
          where: { id },
          data: { estado: "LISTO_PARA_ENTREGA", adminEntregaId: session.user.id },
        });
        await tx.history.create({
          data: {
            planId,
            userId:   session.user.id,
            accion:   "ENTREGA_AUTORIZADA",
            detalles: `${quien} aceptó la solicitud. Pendiente de recepción por el ejecutor.`,
          },
        });

        // Notificación en sistema al EJECUTOR
        await tx.notification.create({
          data: {
            message: `Tu plano ${radicado} está listo. Dirígete al receptor para recoger el plano.`,
            userId:  request.userId,
            planoId: planId,
          },
        });

        // Limpiar alerta del ENCARGADO propio
        if (session.user.role === "ENCARGADO") {
          await tx.notification.updateMany({
            where: { userId: session.user.id, planoId: planId, isRead: false },
            data:  { isRead: true },
          });
        }

        // Notificación en sistema a ADMINISTRADOR
        const admins = await tx.user.findMany({
          where: { role: "ADMINISTRADOR", isActive: true },
          select: { id: true },
        });
        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((u) => ({
              message: `${quien} aceptó la solicitud del plano ${radicado}.`,
              userId:  u.id,
              planoId: planId,
            })),
          });
        }

        return updated;
      });

      // Push al EJECUTOR: su plano está listo para recoger
      await sendPushToUser(request.userId, {
        title: "✅ Plano listo para recoger",
        body:  `${quien} aprobó tu solicitud. Dirígete al receptor para recoger el plano ${radicado}.`,
        url:   "/dashboard/solicitudes",
        tag:   `listo-${id}`,
      }).catch(() => {});
    }

    // ── 2. EJECUTOR confirma recepción / ENCARGADO como respaldo ────────────────
    else if (accion === "CONFIRMAR_ENTREGA" && (request.userId === session.user.id || isAdmin)) {
      if (isAdmin && !isOwner) {
        return NextResponse.json(
          { error: "Este plano fue asignado a otro receptor. Solo ese receptor puede confirmar la entrega." },
          { status: 403 }
        );
      }

      const calledByEjecutor = request.userId === session.user.id;

      result = await prisma.$transaction(async (tx) => {
        const updated = await tx.request.update({
          where: { id },
          data: { estado: "ENTREGADO", fechaEntrega: new Date() },
        });
        await tx.plan.update({
          where: { id: planId },
          data:  { estado: "PRESTADO" },
        });
        await tx.history.create({
          data: {
            planId,
            userId:   session.user.id,
            accion:   "FIRMA_ENTREGA",
            detalles: calledByEjecutor
              ? `${quien} confirmó que recibió físicamente el plano ${radicado}.`
              : `${quien} registró la entrega del plano ${radicado} al ejecutor.`,
          },
        });

        if (calledByEjecutor) {
          // Notificar al ENCARGADO asignado
          if (request.adminEntregaId) {
            await tx.notification.create({
              data: {
                message: `${quien} confirmó que recibió el plano ${radicado}.`,
                userId:  request.adminEntregaId,
                planoId: planId,
              },
            });
          }
          // Notificar a todos los ADMINISTRADOR
          const admins = await tx.user.findMany({
            where: { role: "ADMINISTRADOR", isActive: true },
            select: { id: true },
          });
          if (admins.length > 0) {
            await tx.notification.createMany({
              data: admins.map((u) => ({
                message: `${quien} confirmó la recepción del plano ${radicado}.`,
                userId:  u.id,
                planoId: planId,
              })),
            });
          }
        } else {
          // Notificar al EJECUTOR que el plano fue registrado
          await tx.notification.create({
            data: {
              message: `El plano ${radicado} fue registrado como entregado. Ya está en tu poder.`,
              userId:  request.userId,
              planoId: planId,
            },
          });
          // Notificar a ADMINISTRADOR
          const admins = await tx.user.findMany({
            where: { role: "ADMINISTRADOR", isActive: true },
            select: { id: true },
          });
          if (admins.length > 0) {
            await tx.notification.createMany({
              data: admins.map((u) => ({
                message: `${quien} confirmó la entrega del plano ${radicado} al ejecutor.`,
                userId:  u.id,
                planoId: planId,
              })),
            });
          }
        }

        return updated;
      });

      if (calledByEjecutor) {
        // Push al ENCARGADO asignado. Si no hay asignado, broadcast a todos los ENCARGADOs.
        if (request.adminEntregaId) {
          await sendPushToUser(request.adminEntregaId, {
            title: "📦 Plano recibido por ejecutor",
            body:  `${quien} confirmó la recepción del plano ${radicado}.`,
            url:   "/dashboard/entregados",
            tag:   `recibido-${id}`,
          }).catch(() => {});
        } else {
          await sendPushToRoles(["ENCARGADO"], {
            title: "📦 Plano recibido por ejecutor",
            body:  `${quien} confirmó la recepción del plano ${radicado}.`,
            url:   "/dashboard/entregados",
            tag:   `recibido-${id}`,
          }).catch(() => {});
        }
        // Push a todos los ADMINISTRADOR
        await sendPushToRoles(["ADMINISTRADOR"], {
          title: "📦 Plano recibido",
          body:  `${quien} confirmó la recepción del plano ${radicado}.`,
          url:   "/dashboard/entregados",
          tag:   `recibido-${id}`,
        }).catch(() => {});
      } else {
        // Push al EJECUTOR
        await sendPushToUser(request.userId, {
          title: "📦 Plano entregado",
          body:  `El plano ${radicado} fue registrado como entregado. Ya está en tu poder.`,
          url:   "/dashboard/solicitudes",
          tag:   `entregado-${id}`,
        }).catch(() => {});
      }
    }

    // ── 3. EJECUTOR solicita devolución ─────────────────────────────────────────
    else if (accion === "SOLICITAR_DEVOLUCION" && request.userId === session.user.id) {
      result = await prisma.$transaction(async (tx) => {
        const updated = await tx.request.update({
          where: { id },
          data: { estado: "DEVOLUCION_SOLICITADA" },
        });
        await tx.history.create({
          data: {
            planId,
            userId:   session.user.id,
            accion:   "DEVOLUCION_SOLICITADA",
            detalles: `${quien} solicitó la devolución del plano.`,
          },
        });

        // Notificar al ENCARGADO asignado + todos los ADMIN
        const destinatarios = await tx.user.findMany({
          where: { role: { in: ["ADMINISTRADOR", "ENCARGADO"] }, isActive: true },
          select: { id: true },
        });
        if (destinatarios.length > 0) {
          await tx.notification.createMany({
            data: destinatarios.map((u) => ({
              message: `${quien} solicitó devolver el plano ${radicado}.`,
              userId:  u.id,
              planoId: planId,
            })),
          });
        }

        return updated;
      });

      // Push al ENCARGADO asignado específicamente
      if (request.adminEntregaId) {
        await sendPushToUser(request.adminEntregaId, {
          title: "↩️ Devolución solicitada",
          body:  `${quien} quiere devolver el plano ${radicado}. Requiere tu confirmación.`,
          url:   "/dashboard/entregados",
          tag:   `devolucion-${id}`,
        }).catch(() => {});
      }
      // Push a ADMINISTRADOR
      await sendPushToRoles(["ADMINISTRADOR"], {
        title: "↩️ Devolución solicitada",
        body:  `${quien} quiere devolver el plano ${radicado}.`,
        url:   "/dashboard/entregados",
        tag:   `devolucion-${id}`,
      }).catch(() => {});
    }

    // ── 4. ENCARGADO (asignado) acepta devolución ───────────────────────────────
    else if (accion === "ACEPTAR_DEVOLUCION" && isAdmin) {
      if (!isOwner) {
        return NextResponse.json(
          { error: "Este plano fue asignado a otro receptor. Solo ese receptor puede aceptar la devolución." },
          { status: 403 }
        );
      }

      result = await prisma.$transaction(async (tx) => {
        const updated = await tx.request.update({
          where: { id },
          data: { estado: "DEVUELTO", fechaDevolucion: new Date() },
        });
        await tx.plan.update({
          where: { id: planId },
          data:  { estado: "DISPONIBLE" },
        });
        await tx.history.create({
          data: {
            planId,
            userId:   session.user.id,
            accion:   "PLANO_ARCHIVADO",
            detalles: `${quien} recibió y archivó el plano devuelto.`,
          },
        });

        if (session.user.role === "ENCARGADO") {
          await tx.notification.updateMany({
            where: { userId: session.user.id, planoId: planId, isRead: false },
            data:  { isRead: true },
          });
        }

        // Notificar al EJECUTOR
        await tx.notification.create({
          data: {
            message: `Tu devolución del plano ${radicado} fue confirmada. El plano ya está disponible.`,
            userId:  request.userId,
            planoId: planId,
          },
        });

        // Notificar a ADMINISTRADOR
        const admins = await tx.user.findMany({
          where: { role: "ADMINISTRADOR", isActive: true },
          select: { id: true },
        });
        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((u) => ({
              message: `${quien} aceptó la devolución del plano ${radicado}. Ahora está disponible.`,
              userId:  u.id,
              planoId: planId,
            })),
          });
        }

        return updated;
      });

      // Push al EJECUTOR
      await sendPushToUser(request.userId, {
        title: "✅ Devolución confirmada",
        body:  `El plano ${radicado} fue recibido y archivado correctamente.`,
        url:   "/dashboard/solicitudes",
        tag:   `devolucion-ok-${id}`,
      }).catch(() => {});
      // Push a ADMINISTRADOR
      await sendPushToRoles(["ADMINISTRADOR"], {
        title: "📥 Plano devuelto y archivado",
        body:  `${quien} confirmó la devolución del plano ${radicado}.`,
        url:   `/dashboard/buscar/${planId}`,
        tag:   `archivado-${id}`,
      }).catch(() => {});
    }

    // ── 5. ENCARGADO (asignado) fuerza devolución manual ────────────────────────
    else if (accion === "FORZAR_DEVOLUCION" && isAdmin && request.estado === "ENTREGADO") {
      if (!isOwner) {
        return NextResponse.json(
          { error: "Este plano fue asignado a otro receptor. Solo ese receptor puede registrar la devolución." },
          { status: 403 }
        );
      }

      result = await prisma.$transaction(async (tx) => {
        const updated = await tx.request.update({
          where: { id },
          data: { estado: "DEVUELTO", fechaDevolucion: new Date() },
        });
        await tx.plan.update({
          where: { id: planId },
          data:  { estado: "DISPONIBLE" },
        });
        await tx.history.create({
          data: {
            planId,
            userId:   session.user.id,
            accion:   "DEVOLUCION",
            detalles: `${quien} registró la devolución manual del plano (sin solicitud previa del ejecutor).`,
          },
        });

        // Notificar al EJECUTOR
        await tx.notification.create({
          data: {
            message: `El plano ${radicado} fue registrado como devuelto y está disponible nuevamente.`,
            userId:  request.userId,
            planoId: planId,
          },
        });

        return updated;
      });

      // Push al EJECUTOR
      await sendPushToUser(request.userId, {
        title: "↩️ Plano devuelto",
        body:  `El plano ${radicado} fue registrado como devuelto al archivo.`,
        url:   "/dashboard/solicitudes",
        tag:   `forzado-${id}`,
      }).catch(() => {});
    }

    else {
      return NextResponse.json({ error: "Acción no válida o sin permisos" }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error actualizando solicitud:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
