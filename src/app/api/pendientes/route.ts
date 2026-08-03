import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Trabajo sin atender que corresponde a quien consulta.
// Alimenta la alerta persistente del navegador.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ total: 0, detalle: [] });

  const role = session.user.role;

  try {
    // Digitalizador: planos que ventanilla dejó esperando revisión
    if (role === "DIGITALIZADOR") {
      const verificaciones = await prisma.llamadoVerificacion.count({
        where: { estado: "PENDIENTE" },
      });
      return NextResponse.json({
        total: verificaciones,
        detalle: verificaciones
          ? [{
              tipo:  "verificaciones",
              n:     verificaciones,
              texto: `${verificaciones} plano${verificaciones === 1 ? "" : "s"} esperando verificación`,
              url:   "/dashboard",
            }]
          : [],
      });
    }

    // Administrador y encargado: solicitudes y devoluciones por gestionar
    if (role === "ADMINISTRADOR" || role === "ENCARGADO") {
      const [solicitudes, devoluciones] = await Promise.all([
        prisma.request.count({ where: { estado: "PENDIENTE" } }),
        prisma.request.count({ where: { estado: "DEVOLUCION_SOLICITADA" } }),
      ]);

      const detalle = [];
      if (solicitudes) {
        detalle.push({
          tipo:  "solicitudes",
          n:     solicitudes,
          texto: `${solicitudes} solicitud${solicitudes === 1 ? "" : "es"} de plano por aprobar`,
          url:   "/dashboard/entregados",
        });
      }
      if (devoluciones) {
        detalle.push({
          tipo:  "devoluciones",
          n:     devoluciones,
          texto: `${devoluciones} devolución${devoluciones === 1 ? "" : "es"} por confirmar`,
          url:   "/dashboard/entregados",
        });
      }

      return NextResponse.json({ total: solicitudes + devoluciones, detalle });
    }

    return NextResponse.json({ total: 0, detalle: [] });
  } catch (error) {
    console.error("Error fetching pendientes:", error);
    return NextResponse.json({ total: 0, detalle: [] });
  }
}
