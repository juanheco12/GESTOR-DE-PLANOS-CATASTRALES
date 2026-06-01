import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [plans, history, requests, users, receivers] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { radicado: "asc" },
      include: {
        receivedBy:    { select: { name: true } },
        registradoPor: { select: { name: true } },
      },
    }),
    prisma.history.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { radicado: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.request.findMany({
      orderBy: { fechaSolicitud: "desc" },
      include: {
        plan: { select: { radicado: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    }),
    prisma.receiver.findMany({ orderBy: { name: "asc" } }),
  ]);

  const backup = {
    generado:  new Date().toISOString(),
    sistema:   "Gestor de Planos Catastrales — Catastro Montería",
    totales: {
      planos:     plans.length,
      historial:  history.length,
      solicitudes: requests.length,
      usuarios:   users.length,
    },
    planos:     plans,
    historial:  history,
    solicitudes: requests,
    usuarios:   users,
    receptores: receivers,
  };

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type":        "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-catastro-${fecha}.json"`,
    },
  });
}
