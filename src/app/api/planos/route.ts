import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToRoles } from "@/lib/push";
import { notificarAdmins } from "@/lib/notificarAdmins";

const ROLES_REGISTRO = ["ADMINISTRADOR", "ENCARGADO", "RADICADORA"];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ROLES_REGISTRO.includes(session.user.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await req.json();

    if (!data.radicado || !data.mutacion || !data.formato || !data.receivedById) {
      return NextResponse.json({ error: "Radicado, tipo de trámite, soporte físico y receptor son obligatorios." }, { status: 400 });
    }

const result = await prisma.$transaction(async (tx) => {
      const receiverExists = await tx.receiver.findUnique({ where: { id: data.receivedById } });
      if (!receiverExists) throw new Error("Receptor no válido");

      const newPlan = await tx.plan.create({
        data: {
          radicado:              data.radicado,
          mutacion:              data.mutacion,
          formato:               data.formato,
          propietario:           data.propietario   || null,
          predial:               data.predial        || null,
          veredaBarrio:          data.veredaBarrio   || null,
          profesionalResponsable: data.profesionalResponsable || null,
          observaciones:         data.observaciones  || null,
          ubicacionFisica:       data.ubicacionFisica || null,
          receivedById:          data.receivedById,
          registradoPorId:       session.user.id,
          estado:                "DISPONIBLE",
        },
      });

      await tx.history.create({
        data: {
          planId:   newPlan.id,
          userId:   session.user.id,
          accion:   "REGISTRO",
          detalles: "El plano fue ingresado al sistema.",
        },
      });

      const registrador = await tx.user.findUnique({
        where:  { id: session.user.id },
        select: { name: true },
      });
      const mensaje =
        `${registrador?.name ?? "Un funcionario"} registró el plano ${data.radicado} ` +
        `y fue entregado físicamente a ${receiverExists.name}.`;

      // Cuando registra la RADICADORA, el ENCARGADO también recibe la alerta
      if (session.user.role === "RADICADORA") {
        const encargados = await tx.user.findMany({
          where:  { role: "ENCARGADO", isActive: true },
          select: { id: true },
        });
        if (encargados.length > 0) {
          await tx.notification.createMany({
            data: encargados.map((u) => ({
              message: mensaje,
              userId:  u.id,
              planoId: newPlan.id,
            })),
          });
        }
      }

      // El ADMINISTRADOR recibe constancia de todo registro, lo haga quien lo haga
      await notificarAdmins(tx, mensaje, {
        planoId:       newPlan.id,
        excluirUserId: session.user.id,
      });

      return newPlan;
    });

    // Push notification — awaited so Vercel doesn't kill the function before it's sent
    await sendPushToRoles(["ENCARGADO", "ADMINISTRADOR"], {
      title: "📋 Plano registrado",
      body:  `Radicado ${data.radicado} ingresado al sistema.`,
      url:   `/dashboard/buscar/${result.id}`,
      tag:   `plano-${result.id}`,
    }).catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creando plano:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un plano con este número de radicado." }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const planos = await prisma.plan.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(planos);
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
