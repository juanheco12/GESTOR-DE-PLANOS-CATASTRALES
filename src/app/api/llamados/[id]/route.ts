import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

const SELECT_LLAMADO = {
  id:           true,
  radicado:     true,
  fmi:          true,
  nota:         true,
  estado:       true,
  createdAt:    true,
  tomadoEn:     true,
  finalizadoEn: true,
  solicitante:   { select: { name: true, email: true } },
  digitalizador: { select: { name: true, email: true } },
  verificacion:  { select: { id: true, cumple: true, observaciones: true } },
} as const;

// PATCH — acción: "tomar" (digitalizador) | "cancelar" (solicitante)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const { accion } = await req.json();

    const llamado = await prisma.llamadoVerificacion.findUnique({
      where:  { id },
      select: { id: true, estado: true, radicado: true, solicitanteId: true, digitalizadorId: true },
    });
    if (!llamado) {
      return NextResponse.json({ error: "Llamado no encontrado" }, { status: 404 });
    }

    // ── Tomar verificación ──
    if (accion === "tomar") {
      if (session.user.role !== "DIGITALIZADOR") {
        return NextResponse.json(
          { error: "Solo el digitalizador puede tomar una verificación." },
          { status: 403 }
        );
      }
      if (llamado.estado !== "PENDIENTE") {
        return NextResponse.json(
          { error: "Este llamado ya fue tomado o cerrado." },
          { status: 409 }
        );
      }

      const nombre = session.user.name ?? session.user.email ?? "El digitalizador";

      const actualizado = await prisma.$transaction(async (tx) => {
        const upd = await tx.llamadoVerificacion.update({
          where:  { id },
          data:   { estado: "EN_PROCESO", digitalizadorId: session.user.id, tomadoEn: new Date() },
          select: SELECT_LLAMADO,
        });
        await tx.notification.create({
          data: {
            message: `${nombre} tomó la verificación del radicado ${llamado.radicado}.`,
            userId:  llamado.solicitanteId,
          },
        });
        return upd;
      });

      sendPushToUser(llamado.solicitanteId, {
        title: "Verificación tomada",
        body:  `${nombre} está revisando el radicado ${llamado.radicado}.`,
        url:   "/dashboard",
        tag:   `llamado-${id}`,
      }).catch((err) => console.error("[Push] tomar llamado:", err));

      return NextResponse.json(actualizado);
    }

    // ── Cancelar ──
    if (accion === "cancelar") {
      const esDueno = llamado.solicitanteId === session.user.id;
      if (!esDueno && session.user.role !== "ADMINISTRADOR") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      if (llamado.estado === "COMPLETADO") {
        return NextResponse.json(
          { error: "No se puede cancelar un llamado ya completado." },
          { status: 409 }
        );
      }

      const actualizado = await prisma.llamadoVerificacion.update({
        where:  { id },
        data:   { estado: "CANCELADO", finalizadoEn: new Date() },
        select: SELECT_LLAMADO,
      });
      return NextResponse.json(actualizado);
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error updating llamado:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
