import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Applies pending DDL migrations that can't run at build time.
// Idempotent — safe to call multiple times. Only callable by ADMINISTRADOR.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    // 1. RequestState enum: CANCELADO value
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "RequestState" ADD VALUE IF NOT EXISTS 'CANCELADO'`
    );

    // 2. Role enum: DIGITALIZADOR value
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DIGITALIZADOR'`
    );

    // 3. Verificacion table (pre-filing plan checks by digitalizador / ejecutor)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Verificacion" (
        "id"            TEXT         NOT NULL,
        "fmi"           TEXT         NOT NULL,
        "radicado"      TEXT         NOT NULL,
        "cumple"        BOOLEAN      NOT NULL,
        "observaciones" TEXT,
        "imagenNombre"  TEXT,
        "imagenData"    TEXT,
        "userId"        TEXT         NOT NULL,
        "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Verificacion_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Verificacion_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    return NextResponse.json({ ok: true, message: "Migraciones aplicadas correctamente." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
