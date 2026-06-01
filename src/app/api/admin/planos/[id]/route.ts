import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlanState } from "@prisma/client";

// PATCH: change plan estado (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { estado } = await req.json() as { estado: PlanState };

  if (!["DISPONIBLE", "PRESTADO", "ARCHIVADO", "PENDIENTE_REVISION"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id }, select: { id: true, estado: true } });
  if (!plan) return NextResponse.json({ error: "Plano no encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.plan.update({ where: { id }, data: { estado } });
    await tx.history.create({
      data: {
        planId: id,
        userId: session.user.id,
        accion: "EDICION",
        detalles: `Admin cambió estado de ${plan.estado} a ${estado}.`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
