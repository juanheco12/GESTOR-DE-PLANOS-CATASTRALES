import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const solicitudes = await prisma.request.findMany({
    orderBy: { fechaSolicitud: "desc" },
    include: {
      plan: { select: { id: true, radicado: true, predial: true, estado: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(solicitudes);
}
