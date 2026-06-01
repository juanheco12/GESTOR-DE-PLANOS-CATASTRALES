import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlanState } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") as PlanState | null;

  const planes = await prisma.plan.findMany({
    where: estado ? { estado } : undefined,
    orderBy: { fechaIngreso: "desc" },
    select: {
      id:           true,
      radicado:     true,
      predial:      true,
      propietario:  true,
      estado:       true,
      fechaIngreso: true,
      _count:       { select: { requests: true } },
    },
  });

  return NextResponse.json(planes);
}
