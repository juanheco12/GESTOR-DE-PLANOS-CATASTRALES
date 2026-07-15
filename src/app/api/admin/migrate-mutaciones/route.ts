import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// One-time migration: rename "Otro" mutacion to "Derecho de Petición".
// Only callable by ADMINISTRADOR.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const result = await prisma.plan.updateMany({
      where: { mutacion: "Otro" },
      data:  { mutacion: "Derecho de Petición" },
    });
    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
