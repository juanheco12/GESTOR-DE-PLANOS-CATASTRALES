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

    // 4. LlamadoState enum (CREATE TYPE no admite IF NOT EXISTS)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "LlamadoState" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // 5. LlamadoVerificacion table (ventanilla pide revisión al digitalizador)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LlamadoVerificacion" (
        "id"              TEXT           NOT NULL,
        "radicado"        TEXT           NOT NULL,
        "fmi"             TEXT,
        "nota"            TEXT,
        "estado"          "LlamadoState" NOT NULL DEFAULT 'PENDIENTE',
        "solicitanteId"   TEXT           NOT NULL,
        "digitalizadorId" TEXT,
        "verificacionId"  TEXT,
        "createdAt"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "tomadoEn"        TIMESTAMP(3),
        "finalizadoEn"    TIMESTAMP(3),
        CONSTRAINT "LlamadoVerificacion_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "LlamadoVerificacion_solicitanteId_fkey"
          FOREIGN KEY ("solicitanteId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "LlamadoVerificacion_digitalizadorId_fkey"
          FOREIGN KEY ("digitalizadorId") REFERENCES "User"("id")
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "LlamadoVerificacion_verificacionId_fkey"
          FOREIGN KEY ("verificacionId") REFERENCES "Verificacion"("id")
          ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "LlamadoVerificacion_verificacionId_key" ON "LlamadoVerificacion"("verificacionId")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "LlamadoVerificacion_estado_idx" ON "LlamadoVerificacion"("estado")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "LlamadoVerificacion_solicitanteId_idx" ON "LlamadoVerificacion"("solicitanteId")`
    );

    // 6. LlamadoVerificacion: radicado opcional + check-in de derecho de petición
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "LlamadoVerificacion" ALTER COLUMN "radicado" DROP NOT NULL`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "LlamadoVerificacion" ADD COLUMN IF NOT EXISTS "formato" TEXT`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "LlamadoVerificacion" ADD COLUMN IF NOT EXISTS "esDerechoPeticion" BOOLEAN NOT NULL DEFAULT false`
    );

    return NextResponse.json({ ok: true, message: "Migraciones aplicadas correctamente." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
