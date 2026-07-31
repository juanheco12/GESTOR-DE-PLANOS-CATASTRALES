import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

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
        observaciones: true,
        imagenNombre:  true,
        // imagenData excluded — potentially large; fetched only for the report
        createdAt:     true,
        // Tiempos del llamado de ventanilla, para medir la duración de la revisión
        llamado: {
          select: {
            id: true, tomadoEn: true, finalizadoEn: true, esDerechoPeticion: true,
            formato: true,
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
    const { fmi, radicado, cumple, observaciones, imagenNombre, imagenData, llamadoId } = await req.json();

    if (!fmi?.trim() || !radicado?.trim() || cumple === undefined || cumple === null) {
      return NextResponse.json({ error: "FMI, radicado y resultado son requeridos" }, { status: 400 });
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
            message: `Verificación del radicado ${llamado.radicado}: ${cumple ? "PROCEDE" : "NO PROCEDE"}.`,
            userId:  llamado.solicitanteId,
          },
        });
      }

      return creada;
    });

    if (llamado) {
      sendPushToUser(llamado.solicitanteId, {
        title: cumple ? "Plano PROCEDE" : "Plano NO PROCEDE",
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
