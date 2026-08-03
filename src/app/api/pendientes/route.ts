import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Verificaciones de plano sin atender. Alimenta el aviso de escritorio.
// El resto de movimientos siguen avisándose por notificación push.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ total: 0, detalle: [] });

  const role = session.user.role;
  if (role !== "DIGITALIZADOR" && role !== "ADMINISTRADOR") {
    return NextResponse.json({ total: 0, detalle: [] });
  }

  try {
    const n = await prisma.llamadoVerificacion.count({ where: { estado: "PENDIENTE" } });

    return NextResponse.json({
      total: n,
      detalle: n
        ? [{
            tipo:  "verificaciones",
            n,
            texto: `${n} plano${n === 1 ? "" : "s"} esperando verificación`,
            url:   "/dashboard",
          }]
        : [],
    });
  } catch (error) {
    console.error("Error fetching pendientes:", error);
    return NextResponse.json({ total: 0, detalle: [] });
  }
}
