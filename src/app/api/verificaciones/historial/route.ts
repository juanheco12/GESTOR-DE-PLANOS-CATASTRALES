import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET ?fmi=140-12345 — revisiones anteriores del mismo folio.
// Permite advertir al digitalizador de que el plano ya pasó por revisión
// y enlazar la nueva como subsanación de la observación previa.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fmi = searchParams.get("fmi")?.trim();

  // "N/A" identifica predios sin folio: no son el mismo predio entre sí
  if (!fmi || fmi.toUpperCase() === "N/A") return NextResponse.json([]);

  try {
    const previas = await prisma.verificacion.findMany({
      where:   { fmi },
      orderBy: { createdAt: "desc" },
      take:    10,
      select: {
        id:            true,
        radicado:      true,
        cumple:        true,
        resultado:     true,
        observaciones: true,
        createdAt:     true,
        subsanaId:     true,
        user:    { select: { name: true, email: true } },
        llamado: { select: { plan: { select: { radicado: true } } } },
      },
    });
    return NextResponse.json(previas);
  } catch (error) {
    console.error("Error fetching historial por FMI:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
