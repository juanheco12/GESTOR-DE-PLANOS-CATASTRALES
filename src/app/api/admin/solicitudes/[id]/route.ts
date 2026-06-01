import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: restore plan to DISPONIBLE without deleting the request
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const request = await prisma.request.findUnique({
    where: { id },
    select: { planId: true },
  });

  if (!request) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  await prisma.plan.update({
    where: { id: request.planId },
    data: { estado: "DISPONIBLE" },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: remove the request entirely and restore plan if needed
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const request = await prisma.request.findUnique({
    where: { id },
    include: { plan: { select: { id: true, estado: true } } },
  });

  if (!request) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  // Restore plan to DISPONIBLE from any non-disponible state when the request is deleted
  const nonDisponibleStates = ["PRESTADO", "PENDIENTE_REVISION", "ARCHIVADO"];
  const activeRequestStates = ["PENDIENTE", "LISTO_PARA_ENTREGA", "ENTREGADO", "DEVOLUCION_SOLICITADA"];
  const shouldRestorePlan = nonDisponibleStates.includes(request.plan.estado);

  await prisma.$transaction(async (tx) => {
    await tx.request.delete({ where: { id } });

    if (shouldRestorePlan) {
      // Only restore if no other active requests remain for this plan
      const otherActive = await tx.request.count({
        where: {
          planId: request.planId,
          estado: { in: activeRequestStates },
        },
      });
      if (otherActive === 0) {
        await tx.plan.update({
          where: { id: request.planId },
          data: { estado: "DISPONIBLE" },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
