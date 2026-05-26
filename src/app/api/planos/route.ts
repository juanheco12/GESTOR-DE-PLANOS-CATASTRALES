import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMINISTRADOR" && session.user.role !== "ENCARGADO")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await req.json();

    // Solo los 4 campos obligatorios
    if (!data.radicado || !data.mutacion || !data.formato || !data.receivedById) {
      return NextResponse.json({ error: "Radicado, tipo de trámite, soporte físico y receptor son obligatorios." }, { status: 400 });
    }

    // Predial: si viene, solo dígitos máximo 30 (no obligatorio)
    if (data.predial && !/^\d{1,30}$/.test(data.predial)) {
      return NextResponse.json({ error: "El número predial solo puede contener dígitos (máximo 30)." }, { status: 400 });
    }

    // Crear el plano y registrar en el historial
    const result = await prisma.$transaction(async (tx) => {
      const receiverExists = await tx.receiver.findUnique({ where: { id: data.receivedById } });
      if (!receiverExists) throw new Error("Receptor no válido");

      const newPlan = await tx.plan.create({
        data: {
          radicado: data.radicado,
          mutacion: data.mutacion,
          formato: data.formato,
          propietario: data.propietario || null,
          predial: data.predial || null,
          veredaBarrio: data.veredaBarrio || null,
          profesionalResponsable: data.profesionalResponsable || null,
          observaciones: data.observaciones || null,
          ubicacionFisica: data.ubicacionFisica || null,
          receivedById: data.receivedById,
          estado: "DISPONIBLE"
        }
      });

      await tx.history.create({
        data: {
          planId: newPlan.id,
          userId: session.user.id,
          accion: "REGISTRO",
          detalles: "El plano fue ingresado al sistema."
        }
      });

      return newPlan;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creando plano:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Ya existe un plano con este número de radicado." }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const planos = await prisma.plan.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(planos);
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
