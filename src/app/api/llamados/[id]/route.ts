import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

const SELECT_LLAMADO = {
  id:                true,
  radicado:          true,
  fmi:               true,
  nota:              true,
  formato:           true,
  esDerechoPeticion: true,
  estado:            true,
  createdAt:         true,
  tomadoEn:          true,
  finalizadoEn:      true,
  solicitante:   { select: { name: true, email: true } },
  digitalizador: { select: { name: true, email: true } },
  verificacion:  { select: { id: true, cumple: true, resultado: true, observaciones: true } },
} as const;

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "CANCELADO"];

// PATCH — acción: "tomar" (digitalizador) | "cancelar" (solicitante)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { accion } = body;

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

    // ── Edición libre (solo administrador) ──
    if (accion === "editar") {
      if (session.user.role !== "ADMINISTRADOR") {
        return NextResponse.json(
          { error: "Solo el administrador puede modificar un llamado." },
          { status: 403 }
        );
      }

      const data: Record<string, unknown> = {};

      if (body.radicado !== undefined)          data.radicado          = body.radicado?.trim() || null;
      if (body.fmi !== undefined)               data.fmi               = body.fmi?.trim()      || null;
      if (body.nota !== undefined)              data.nota              = body.nota?.trim()     || null;
      if (body.formato !== undefined)           data.formato           = body.formato?.trim()  || null;
      if (body.esDerechoPeticion !== undefined) data.esDerechoPeticion = body.esDerechoPeticion === true;

      if (body.estado !== undefined) {
        if (!ESTADOS.includes(body.estado)) {
          return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
        }
        data.estado = body.estado;
        // Mantiene las marcas de tiempo coherentes con el estado
        if (body.estado === "PENDIENTE") {
          data.tomadoEn = null;
          data.finalizadoEn = null;
        } else if (body.estado === "EN_PROCESO") {
          data.finalizadoEn = null;
        } else if (!llamado.digitalizadorId) {
          data.finalizadoEn = new Date();
        }
      }

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
      }

      const actualizado = await prisma.llamadoVerificacion.update({
        where:  { id },
        data,
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

// DELETE — solo el administrador puede borrar un llamado
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json(
      { error: "Solo el administrador puede eliminar llamados." },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    // deleteMany en vez de delete: no hace RETURNING de todas las columnas,
    // así el borrado no depende de que el esquema esté al día.
    const { count } = await prisma.llamadoVerificacion.deleteMany({ where: { id } });
    if (count === 0) {
      return NextResponse.json({ error: "El registro ya no existe." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error deleting llamado:", error);
    return NextResponse.json(
      { error: `No se pudo eliminar: ${error?.message ?? "error desconocido"}` },
      { status: 500 }
    );
  }
}
