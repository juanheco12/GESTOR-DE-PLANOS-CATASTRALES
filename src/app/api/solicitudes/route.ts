import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { planId, observaciones } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "ID del plano es requerido" }, { status: 400 });
    }

    // Verificar que el plano existe y está disponible
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "El plano no existe" }, { status: 404 });
    }

    if (plan.estado !== "DISPONIBLE") {
      return NextResponse.json({ error: "El plano no está disponible actualmente" }, { status: 400 });
    }

    // Crear la solicitud y registrar el historial
    const result = await prisma.$transaction(async (tx) => {
      const solicitud = await tx.request.create({
        data: {
          planId,
          userId: session.user.id,
          observaciones,
          estado: "PENDIENTE"
        }
      });

      // Actualizar el estado del plano a pendiente de revisión/entrega
      await tx.plan.update({
        where: { id: planId },
        data: { estado: "PENDIENTE_REVISION" }
      });

      await tx.history.create({
        data: {
          planId,
          userId: session.user.id,
          accion: "SOLICITUD",
          detalles: `El usuario ${session.user.name} solicitó el plano.`
        }
      });

      return solicitud;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creando solicitud:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
