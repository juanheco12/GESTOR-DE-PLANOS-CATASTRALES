import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { notificarAdmins } from "@/lib/notificarAdmins";

const MAX_ADJUNTOS   = 2;
// En base64 el contenido crece un tercio; 4 MB de texto ≈ 3 MB de archivo
const MAX_PESO_TOTAL = 4 * 1024 * 1024;

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
        // imagenNombre/imagenData: un único archivo, esquema anterior
        imagenNombre:  true,
        // El contenido no viaja en la lista: se pide al ver o al reportar
        adjuntos: { select: { id: true, nombre: true }, orderBy: { createdAt: "asc" } },
        createdAt:     true,
        subsanaId:     true,
        subsana: {
          select: {
            id: true, createdAt: true, resultado: true, cumple: true, observaciones: true,
          },
        },
        // Tiempos del llamado de ventanilla, para medir la duración de la revisión
        llamado: {
          select: {
            id: true, radicado: true, createdAt: true, tomadoEn: true, finalizadoEn: true,
            esDerechoPeticion: true, formato: true, planId: true,
            plan: { select: { id: true, radicado: true, mutacion: true } },
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
    const { fmi, radicado, cumple, resultado, observaciones, llamadoId, subsanaId, adjuntos } =
      await req.json();

    // Cada revisión admite un par de archivos de respaldo. El tope total
    // deja margen frente al límite de tamaño de la petición.
    const archivos: { nombre: string; data: string }[] = Array.isArray(adjuntos)
      ? adjuntos
          .filter((a) => a?.data && a?.nombre)
          .slice(0, MAX_ADJUNTOS)
          .map((a) => ({ nombre: String(a.nombre), data: String(a.data) }))
      : [];

    const pesoTotal = archivos.reduce((acc, a) => acc + a.data.length, 0);
    if (pesoTotal > MAX_PESO_TOTAL) {
      return NextResponse.json(
        { error: "Los archivos adjuntos superan el tamaño permitido en conjunto." },
        { status: 413 }
      );
    }

    // Solo el concepto técnico es obligatorio: el plano puede llegar a
    // revisión sin radicar, y el radicado se asigna después en ventanilla.
    if (cumple === undefined || cumple === null) {
      return NextResponse.json({ error: "El concepto técnico es requerido" }, { status: 400 });
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
          fmi:           fmi?.trim()      || null,
          radicado:      radicado?.trim() || null,
          subsanaId:     subsanaId        || null,
          cumple,
          resultado:     concepto,
          observaciones: observaciones?.trim() || null,
          userId:        session.user.id,
          ...(archivos.length > 0
            ? { adjuntos: { create: archivos } }
            : {}),
        },
      });

      if (llamado) {
        await tx.llamadoVerificacion.update({
          where: { id: llamado.id },
          data:  { estado: "COMPLETADO", finalizadoEn: new Date(), verificacionId: creada.id },
        });
        const ident = llamado.radicado ? ` del radicado ${llamado.radicado}` : "";
        await tx.notification.create({
          data: {
            message:
              concepto === "PROCEDE"
                ? `El plano${ident} PROCEDE. Ya puedes radicarlo desde Verificación de Plano.`
                : `Verificación${ident}: ${CONCEPTO_LABEL[concepto]}.`,
            userId: llamado.solicitanteId,
          },
        });
      }

      // El administrador queda enterado de todo concepto técnico emitido
      const quien = session.user.name ?? session.user.email ?? "El digitalizador";
      await notificarAdmins(
        tx,
        `${quien} emitió concepto ${CONCEPTO_LABEL[concepto]}${
          radicado?.trim() ? ` para el radicado ${radicado.trim()}`
            : fmi?.trim()  ? ` para el FMI ${fmi.trim()}`
            : " para un plano de ventanilla"
        }.`,
        { excluirUserId: session.user.id }
      );

      return creada;
    });

    if (llamado) {
      await sendPushToUser(llamado.solicitanteId, {
        title: `Plano ${CONCEPTO_LABEL[concepto]}`,
        body:  concepto === "PROCEDE"
          ? "Visto bueno del digitalizador. Ya puedes radicar el plano."
          : `${observaciones?.trim() || "Revisa las observaciones del digitalizador."}`,
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
