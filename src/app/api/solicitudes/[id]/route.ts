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
    const { accion, firma } = data;

    // Traer solicitud junto con el plano para usar el radicado en mensajes
    const request = await prisma.request.findUnique({
      where: { id },
      include: { plan: { select: { radicado: true, id: true } } },
    });
    if (!request) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const isAdmin    = session.user.role === "ADMINISTRADOR" || session.user.role === "ENCARGADO";
    const radicado   = request.plan.radicado;
    const planId     = request.planId;
    const quien      = session.user.name ?? session.user.email ?? "Encargado";

    let result;

    // ── ENCARGADO autoriza entrega ──
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
            detalles: `${quien} autorizó la entrega del plano. Pendiente de firma del ejecutor.`,
          },
        });

        // Notificar al EJECUTOR que su plano está listo para recoger
        await tx.notification.create({
          data: {
            message: `Tu plano ${radicado} está listo para recoger. Dirígete a la oficina para firmarlo.`,
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

        // Notificar a todos los ADMINISTRADOR sobre la acción del encargado
        const admins = await tx.user.findMany({
          where: { role: "ADMINISTRADOR", isActive: true },
          select: { id: true },
        });
        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((u) => ({
              message: `${quien} autorizó la entrega del plano ${radicado} al ejecutor.`,
              userId:  u.id,
              planoId: planId,
            })),
          });
        }

        // Push al EJECUTOR: su plano está listo para recoger
        await sendPushToUser(request.userId, {
          title: "✅ Plano autorizado",
          body:  `El plano ${radicado} está listo para recoger.`,
          url:   `/dashboard/solicitudes`,
          tag:   `listo-${id}`,
        }).catch(() => {});

        return reqUpdated;
      });
    }

    // ── EJECUTOR firma y recibe el plano ──
    else if (accion === "FIRMAR" && request.userId === session.user.id) {
      if (!firma) return NextResponse.json({ error: "Firma requerida" }, { status: 400 });

      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
          where: { id },
          data: { estado: "ENTREGADO", firma, fechaEntrega: new Date() },
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
            detalles: "El ejecutor firmó y recibió el plano físicamente.",
          },
        });

        // Notificar a ADMINISTRADOR y ENCARGADO que el ejecutor ya lo retiró
        const destinatarios = await tx.user.findMany({
          where: { role: { in: ["ADMINISTRADOR", "ENCARGADO"] }, isActive: true },
          select: { id: true },
        });
        if (destinatarios.length > 0) {
          await tx.notification.createMany({
            data: destinatarios.map((u) => ({
              message: `${quien} firmó y retiró físicamente el plano ${radicado}.`,
              userId:  u.id,
              planoId: planId,
            })),
          });
        }

        await sendPushToRoles(["ENCARGADO", "ADMINISTRADOR"], {
          title: "📤 Plano retirado",
          body:  `${quien} firmó y retiró el plano ${radicado}.`,
          url:   `/dashboard/entregados`,
          tag:   `firma-${id}`,
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

        // Notificar a ENCARGADO y ADMINISTRADOR
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

    // ── ENCARGADO acepta devolución ──
    else if (accion === "ACEPTAR_DEVOLUCION" && isAdmin) {
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

        // Quitar alerta de devolución del propio ENCARGADO
        if (session.user.role === "ENCARGADO") {
          await tx.notification.updateMany({
            where: { userId: session.user.id, planoId: planId, isRead: false },
            data:  { isRead: true },
          });
        }

        // Notificar a ADMINISTRADOR sobre la acción
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

        return reqUpdated;
      });
    }

    // ── ADMIN fuerza devolución ──
    else if (accion === "FORZAR_DEVOLUCION" && isAdmin && request.estado === "ENTREGADO") {
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
