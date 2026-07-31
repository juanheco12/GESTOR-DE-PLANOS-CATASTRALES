import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToRoles } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { planId, observaciones } = await req.json();

    if (session.user.role !== "EJECUTOR" && session.user.role !== "DIGITALIZADOR") {
      return NextResponse.json({ error: "Solo ejecutores y digitalizadores pueden solicitar planos." }, { status: 403 });
    }

    if (!planId) {
      return NextResponse.json({ error: "ID del plano es requerido" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "El plano no existe" }, { status: 404 });
    }

    if (plan.estado !== "DISPONIBLE") {
      return NextResponse.json({ error: "El plano no está disponible actualmente" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const solicitud = await tx.request.create({
        data: {
          planId,
          userId:       session.user.id,
          observaciones,
          estado:       "PENDIENTE",
        },
      });

      await tx.plan.update({
        where: { id: planId },
        data:  { estado: "PENDIENTE_REVISION" },
      });

      await tx.history.create({
        data: {
          planId,
          userId:   session.user.id,
          accion:   "SOLICITUD",
          detalles: `El usuario ${session.user.name} solicitó el plano.`,
        },
      });

      // ENCARGADO recibe alerta para gestionar la solicitud
      // ADMINISTRADOR recibe todo para tener visibilidad completa
      const destinatarios = await tx.user.findMany({
        where: { role: { in: ["ENCARGADO", "ADMINISTRADOR"] }, isActive: true },
        select: { id: true },
      });

      if (destinatarios.length > 0) {
        const mensaje = `${session.user.name ?? "Un ejecutor"} solicitó el plano ${plan.radicado}. Requiere autorización.`;
        await tx.notification.createMany({
          data: destinatarios.map((u) => ({
            message: mensaje,
            userId:  u.id,
            planoId: planId,
          })),
        });
      }

      return solicitud;
    });

    await sendPushToRoles(["ENCARGADO", "ADMINISTRADOR"], {
      title: "🔔 Nueva solicitud de plano",
      body:  `${session.user.name ?? "Un ejecutor"} solicitó el radicado ${plan.radicado}.`,
      url:   "/dashboard/entregados",
      tag:   `solicitud-${result.id}`,
    }).catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creando solicitud:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
