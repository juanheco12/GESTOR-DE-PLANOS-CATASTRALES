import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// One-time endpoint to apply pending enum migrations that can't run at build time.
// Only callable by ADMINISTRADOR.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "RequestState" ADD VALUE IF NOT EXISTS 'CANCELADO'`
    );
    return NextResponse.json({ ok: true, message: "Migración aplicada correctamente." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
