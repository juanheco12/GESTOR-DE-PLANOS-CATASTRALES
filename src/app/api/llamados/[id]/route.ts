import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { notificarAdmins } from "@/lib/notificarAdmins";

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
  planId:        true,
  plan:          { select: { id: true, radicado: true, mutacion: true } },
} as const;

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "CANCELADO"];

// Quienes atienden ventanilla y por tanto radican el plano
const ROLES_VENTANILLA = ["RADICADORA", "ENCARGADO", "ADMINISTRADOR"];

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
      select: {
        id: true, estado: true, radicado: true, fmi: true, nota: true,
        solicitanteId: true, digitalizadorId: true, planId: true,
        esDerechoPeticion: true,
        verificacion: { select: { cumple: true, resultado: true } },
      },
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
        const ident = llamado.radicado ? `radicado ${llamado.radicado}` : "un plano de ventanilla";
        await tx.notification.create({
          data: {
            message: `${nombre} tomó la verificación del ${ident}.`,
            userId:  llamado.solicitanteId,
          },
        });
        await notificarAdmins(tx, `${nombre} tomó la verificación del ${ident}.`, {
          excluirUserId: session.user.id,
        });
        return upd;
      });

      await sendPushToUser(llamado.solicitanteId, {
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

      const quien = session.user.name ?? session.user.email ?? "Ventanilla";
      const ident = llamado.radicado ? `radicado ${llamado.radicado}` : "un plano de ventanilla";

      const actualizado = await prisma.$transaction(async (tx) => {
        const upd = await tx.llamadoVerificacion.update({
          where:  { id },
          data:   { estado: "CANCELADO", finalizadoEn: new Date() },
          select: SELECT_LLAMADO,
        });
        await notificarAdmins(tx, `${quien} canceló la verificación del ${ident}.`, {
          excluirUserId: session.user.id,
        });
        return upd;
      });
      return NextResponse.json(actualizado);
    }

    // ── Radicar el plano tras el visto bueno del digitalizador ──
    if (accion === "radicar") {
      if (!ROLES_VENTANILLA.includes(session.user.role)) {
        return NextResponse.json(
          { error: "Solo ventanilla puede radicar el plano." },
          { status: 403 }
        );
      }

      const concepto =
        llamado.verificacion?.resultado ??
        (llamado.verificacion?.cumple ? "PROCEDE" : null);

      if (concepto !== "PROCEDE") {
        return NextResponse.json(
          { error: "Solo se radica un plano con concepto PROCEDE del digitalizador." },
          { status: 409 }
        );
      }
      if (llamado.planId) {
        return NextResponse.json(
          { error: "Este plano ya fue radicado." },
          { status: 409 }
        );
      }

      const rad = body.radicado?.trim();
      if (!rad) {
        return NextResponse.json(
          { error: "El número de radicado es obligatorio para radicar el plano." },
          { status: 400 }
        );
      }
      // Si el plano ya se registró por la vía normal, se enlaza en vez de
      // duplicarlo: el trabajo del digitalizador debe quedar asociado igual.
      const existente = await prisma.plan.findUnique({
        where:  { radicado: rad },
        select: { id: true },
      });

      // El receptor solo hace falta al crear: el plano existente ya lo tiene
      if (!existente && !body.receivedById) {
        return NextResponse.json(
          { error: "Indica quién recibió el plano." },
          { status: 400 }
        );
      }

      const quien = session.user.name ?? session.user.email ?? "Ventanilla";

      const actualizado = await prisma.$transaction(async (tx) => {
        const plan = existente ?? await tx.plan.create({
          data: {
            radicado:        rad,
            mutacion:        body.mutacion?.trim() || "Otro",
            formato:         body.formato?.trim()  || "OTRO",
            predial:         llamado.fmi,
            observaciones:   llamado.nota,
            receivedById:    body.receivedById,
            registradoPorId: session.user.id,
            estado:          "DISPONIBLE",
          },
          select: { id: true },
        });

        await tx.history.create({
          data: {
            planId:   plan.id,
            userId:   session.user.id,
            accion:   existente ? "VERIFICACION" : "REGISTRO",
            detalles: existente
              ? "Asociado a la verificación previa del digitalizador (concepto PROCEDE)."
              : "Radicado en ventanilla tras concepto PROCEDE del digitalizador.",
          },
        });

        const upd = await tx.llamadoVerificacion.update({
          where:  { id },
          data:   {
            planId:   plan.id,
            radicado: rad,
            formato:  body.formato?.trim() || undefined,
          },
          select: SELECT_LLAMADO,
        });

        // El digitalizador ve reflejado que su visto bueno terminó en radicación
        if (llamado.digitalizadorId) {
          await tx.notification.create({
            data: {
              message: existente
                ? `${quien} asoció tu verificación al plano ${rad}, ya registrado en el sistema.`
                : `${quien} radicó el plano que aprobaste, con el número ${rad}.`,
              userId:  llamado.digitalizadorId,
              planoId: plan.id,
            },
          });
        }

        await notificarAdmins(tx, existente
          ? `${quien} asoció el plano ${rad} a la verificación del digitalizador.`
          : `${quien} radicó el plano ${rad} tras el visto bueno del digitalizador.`, {
          planoId:       plan.id,
          excluirUserId: session.user.id,
        });

        return upd;
      });

      if (llamado.digitalizadorId) {
        await sendPushToUser(llamado.digitalizadorId, {
          title: "Plano radicado",
          body:  `${quien} radicó con el número ${rad} el plano que aprobaste.`,
          url:   "/dashboard",
          tag:   `llamado-${id}`,
        }).catch((err) => console.error("[Push] radicar:", err));
      }

      return NextResponse.json({ ...actualizado, planoYaExistia: Boolean(existente) });
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
