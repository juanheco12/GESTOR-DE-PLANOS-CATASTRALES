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

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const data = await req.json();
    const { accion } = data;

    const request = await prisma.request.findUnique({
      where: { id },
      include: { plan: { select: { radicado: true, id: true } } },
    });
    if (!request) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const isAdmin   = session.user.role === "ADMINISTRADOR" || session.user.role === "ENCARGADO";
    const radicado  = request.plan.radicado;
    const planId    = request.planId;
    const quien     = session.user.name ?? session.user.email ?? "Encargado";

    // Helper: is the current user the assigned receiver (or ADMINISTRADOR override)?
    const isOwner = !request.adminEntregaId
      || request.adminEntregaId === session.user.id
      || session.user.role === "ADMINISTRADOR";

    let result;

    // ── ENCARGADO acepta solicitud y queda asignado ──
    if (accion === "MARCAR_LISTO" && isAdmin) {
      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
          where: { id },
          data: { estado: "LISTO_PARA_ENTREGA", adminEntregaId: session.user.id },
        });
        await tx.history.create({
          data: {
            planId,
            userId:   session.user.id,
            accion:   "ENTREGA_AUTORIZADA",
            detalles: `${quien} aceptó la solicitud. Pendiente de entrega física al ejecutor.`,
          },
        });

        // Notificar al EJECUTOR
        await tx.notification.create({
          data: {
            message: `Tu plano ${radicado} está listo para recoger. Dirígete a la oficina para retirarlo.`,
            userId:  request.userId,
            planoId: planId,
          },
        });

        // Quitar alerta de solicitud del propio ENCARGADO
        if (session.user.role === "ENCARGADO") {
          await tx.notification.updateMany({
            where: { userId: session.user.id, planoId: planId, isRead: false },
            data:  { isRead: true },
          });
        }

        // Notificar a ADMINISTRADOR
        const admins = await tx.user.findMany({
          where: { role: "ADMINISTRADOR", isActive: true },
          select: { id: true },
        });
        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((u) => ({
              message: `${quien} aceptó la solicitud del plano ${radicado} y lo preparará para entrega.`,
              userId:  u.id,
              planoId: planId,
            })),
          });
        }

        await sendPushToUser(request.userId, {
          title: "✅ Plano listo para recoger",
          body:  `El plano ${radicado} está listo. Pasa por la oficina a retirarlo.`,
          url:   `/dashboard/solicitudes`,
          tag:   `listo-${id}`,
        }).catch(() => {});

        return reqUpdated;
      });
    }

    // ── ENCARGADO (asignado) confirma entrega física — sin firma ──
    else if (accion === "CONFIRMAR_ENTREGA" && isAdmin) {
      if (!isOwner) {
        return NextResponse.json(
          { error: "Este plano fue asignado a otro receptor. Solo ese receptor puede confirmar la entrega." },
          { status: 403 }
        );
      }

      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
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
            detalles: `${quien} confirmó la entrega física del plano ${radicado} al ejecutor.`,
          },
        });

        // Notificar al EJECUTOR
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

        await sendPushToUser(request.userId, {
          title: "📦 Plano entregado",
          body:  `El plano ${radicado} fue confirmado como entregado.`,
          url:   `/dashboard/solicitudes`,
          tag:   `entregado-${id}`,
        }).catch(() => {});

        return reqUpdated;
      });
    }

    // ── EJECUTOR solicita devolución ──
    else if (accion === "SOLICITAR_DEVOLUCION" && request.userId === session.user.id) {
      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
          where: { id },
          data: { estado: "DEVOLUCION_SOLICITADA" },
        });
        await tx.history.create({
          data: {
            planId,
            userId:   session.user.id,
            accion:   "DEVOLUCION_SOLICITADA",
            detalles: "El ejecutor solicitó la devolución del plano.",
          },
        });

        // Notificar solo al receptor asignado (y a admins)
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

        await sendPushToRoles(["ENCARGADO", "ADMINISTRADOR"], {
          title: "↩️ Devolución solicitada",
          body:  `${quien} quiere devolver el plano ${radicado}.`,
          url:   `/dashboard/entregados`,
          tag:   `devolucion-${id}`,
        }).catch(() => {});

        return reqUpdated;
      });
    }

    // ── ENCARGADO (asignado) acepta devolución ──
    else if (accion === "ACEPTAR_DEVOLUCION" && isAdmin) {
      if (!isOwner) {
        return NextResponse.json(
          { error: "Este plano fue asignado a otro receptor. Solo ese receptor puede aceptar la devolución." },
          { status: 403 }
        );
      }

      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
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

        await tx.notification.create({
          data: {
            message: `Tu devolución del plano ${radicado} fue confirmada. El plano ya está disponible en el sistema.`,
            userId:  request.userId,
            planoId: planId,
          },
        });

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

        await sendPushToRoles(["ADMINISTRADOR"], {
          title: "📥 Plano devuelto",
          body:  `${quien} aceptó la devolución del plano ${radicado}. Disponible.`,
          url:   `/dashboard/buscar/${planId}`,
          tag:   `archivado-${id}`,
        }).catch(() => {});

        await sendPushToUser(request.userId, {
          title: "✅ Devolución confirmada",
          body:  `El plano ${radicado} fue recibido y archivado correctamente.`,
          url:   `/dashboard/solicitudes`,
          tag:   `devolucion-ok-${id}`,
        }).catch(() => {});

        return reqUpdated;
      });
    }

    // ── ADMIN/ENCARGADO (asignado) fuerza devolución sin solicitud del ejecutor ──
    else if (accion === "FORZAR_DEVOLUCION" && isAdmin && request.estado === "ENTREGADO") {
      if (!isOwner) {
        return NextResponse.json(
          { error: "Este plano fue asignado a otro receptor. Solo ese receptor puede registrar la devolución." },
          { status: 403 }
        );
      }

      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
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
        return reqUpdated;
      });
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
