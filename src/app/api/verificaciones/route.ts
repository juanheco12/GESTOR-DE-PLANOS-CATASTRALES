import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { notificarAdmins } from "@/lib/notificarAdmins";

const CONCEPTO_LABEL: Record<string, string> = {
  PROCEDE:         "PROCEDE",
  NO_PROCEDE:      "NO PROCEDE",
  REQUIERE_AJUSTE: "REQUIERE AJUSTE",
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const verifs = await prisma.verificacion.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id:            true,
        fmi:           true,
        radicado:      true,
        cumple:        true,
        resultado:     true,
        observaciones: true,
        imagenNombre:  true,
        // imagenData excluded — potentially large; fetched only for the report
        createdAt:     true,
        // Tiempos del llamado de ventanilla, para medir la duración de la revisión
        llamado: {
          select: {
            id: true, createdAt: true, tomadoEn: true, finalizadoEn: true,
            esDerechoPeticion: true, formato: true,
            solicitante: { select: { name: true, email: true } },
          },
        },
      },
    });
    return NextResponse.json(verifs);
  } catch (error) {
    console.error("Error fetching verificaciones:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { fmi, radicado, cumple, resultado, observaciones, imagenNombre, imagenData, llamadoId } =
      await req.json();

    if (!fmi?.trim() || !radicado?.trim() || cumple === undefined || cumple === null) {
      return NextResponse.json({ error: "FMI, radicado y resultado son requeridos" }, { status: 400 });
    }

    const RESULTADOS = ["PROCEDE", "NO_PROCEDE", "REQUIERE_AJUSTE"];
    const concepto = RESULTADOS.includes(resultado)
      ? resultado
      : cumple ? "PROCEDE" : "NO_PROCEDE";

    // El concepto desfavorable es el respaldo documental del acto técnico:
    // sin observación escrita no puede cerrarse. Validado también en el servidor.
    if (concepto !== "PROCEDE" && !observaciones?.trim()) {
      return NextResponse.json(
        { error: "Un concepto de NO PROCEDE o REQUIERE AJUSTE exige observación escrita." },
        { status: 400 }
      );
    }

    // Si viene de un llamado de ventanilla, valida que sea de este digitalizador
    let llamado = null;
    if (llamadoId) {
      llamado = await prisma.llamadoVerificacion.findUnique({
        where:  { id: llamadoId },
        select: { id: true, estado: true, radicado: true, solicitanteId: true, digitalizadorId: true },
      });
      if (!llamado || llamado.digitalizadorId !== session.user.id || llamado.estado !== "EN_PROCESO") {
        llamado = null;   // llamado ajeno o ya cerrado: se guarda la verificación suelta
      }
    }

    const verif = await prisma.$transaction(async (tx) => {
      const creada = await tx.verificacion.create({
        data: {
          fmi:           fmi.trim(),
          radicado:      radicado.trim(),
          cumple,
          resultado:     concepto,
          observaciones: observaciones?.trim() || null,
          imagenNombre:  imagenNombre || null,
          imagenData:    imagenData   || null,
          userId:        session.user.id,
        },
      });

      if (llamado) {
        await tx.llamadoVerificacion.update({
          where: { id: llamado.id },
          data:  { estado: "COMPLETADO", finalizadoEn: new Date(), verificacionId: creada.id },
        });
        await tx.notification.create({
          data: {
            message: `Verificación del radicado ${llamado.radicado}: ${CONCEPTO_LABEL[concepto]}.`,
            userId:  llamado.solicitanteId,
          },
        });
      }

      // El administrador queda enterado de todo concepto técnico emitido
      const quien = session.user.name ?? session.user.email ?? "El digitalizador";
      await notificarAdmins(
        tx,
        `${quien} emitió concepto ${CONCEPTO_LABEL[concepto]} para el radicado ${radicado.trim()}.`,
        { excluirUserId: session.user.id }
      );

      return creada;
    });

    if (llamado) {
      await sendPushToUser(llamado.solicitanteId, {
        title: `Plano ${CONCEPTO_LABEL[concepto]}`,
        body:  `Radicado ${llamado.radicado} — ${observaciones?.trim() || "Verificación completada."}`,
        url:   "/dashboard",
        tag:   `llamado-${llamado.id}`,
      }).catch((err) => console.error("[Push] verificacion:", err));
    }

    return NextResponse.json(verif, { status: 201 });
  } catch (error) {
    console.error("Error creating verificacion:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
