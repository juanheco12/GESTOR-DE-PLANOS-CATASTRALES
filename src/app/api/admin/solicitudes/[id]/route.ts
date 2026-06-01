import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // If plan is PRESTADO and this request was the active one, restore plan to DISPONIBLE
  const activeStates = ["ENTREGADO", "DEVOLUCION_SOLICITADA", "LISTO_PARA_ENTREGA"];
  const shouldRestorePlan =
    request.plan.estado === "PRESTADO" && activeStates.includes(request.estado);

  await prisma.$transaction(async (tx) => {
    await tx.request.delete({ where: { id } });

    if (shouldRestorePlan) {
      // Only restore if no other active requests exist for this plan
      const otherActive = await tx.request.count({
        where: {
          planId: request.planId,
          estado: { in: ["ENTREGADO", "DEVOLUCION_SOLICITADA", "LISTO_PARA_ENTREGA"] },
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
