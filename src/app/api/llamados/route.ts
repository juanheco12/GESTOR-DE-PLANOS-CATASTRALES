import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToRoles } from "@/lib/push";
import { notificarAdmins } from "@/lib/notificarAdmins";

// Roles de ventanilla que pueden llamar al digitalizador
const ROLES_SOLICITANTES = ["RADICADORA", "ENCARGADO", "ADMINISTRADOR"];

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

// GET — digitalizador y administrador ven todos; el resto solo los suyos.
// Con ?desde=&hasta= (ISO) devuelve el periodo completo, para el informe mensual.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const role = session.user.role;
  const veTodos = role === "DIGITALIZADOR" || role === "ADMINISTRADOR";

  if (!veTodos && !ROLES_SOLICITANTES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const esPeriodo = Boolean(desde && hasta);

  const where: Record<string, unknown> = veTodos ? {} : { solicitanteId: session.user.id };
  if (esPeriodo) {
    where.createdAt = { gte: new Date(desde!), lte: new Date(hasta!) };
  }

  try {
    const llamados = await prisma.llamadoVerificacion.findMany({
      where,
      orderBy: esPeriodo ? { createdAt: "asc" } : [{ estado: "asc" }, { createdAt: "desc" }],
      take: esPeriodo ? 5000 : 100,
      select: SELECT_LLAMADO,
    });
    return NextResponse.json(llamados);
  } catch (error) {
    console.error("Error fetching llamados:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — ventanilla llama al digitalizador para revisar un plano
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!ROLES_SOLICITANTES.includes(session.user.role)) {
    return NextResponse.json(
      { error: "Solo ventanilla puede llamar al digitalizador." },
      { status: 403 }
    );
  }

  try {
    const { radicado, fmi, nota, formato, esDerechoPeticion, receivedById } = await req.json();

    const rad = radicado?.trim() || null;
    const folio = fmi?.trim() || null;

    const esCheckIn = esDerechoPeticion === true;

    // El folio identifica el predio: obligatorio, o "N/A" si no tiene
    if (!folio) {
      return NextResponse.json(
        { error: "Indica el folio de matrícula, o N/A si el predio no tiene" },
        { status: 400 }
      );
    }

    // El derecho de petición además exige radicado, porque registra un plano
    if (esCheckIn && !rad) {
      return NextResponse.json(
        { error: "El derecho de petición requiere el número de radicado" },
        { status: 400 }
      );
    }

    // Evita llamados duplicados sin atender para el mismo radicado
    if (rad && !esCheckIn) {
      const abierto = await prisma.llamadoVerificacion.findFirst({
        where: { radicado: rad, estado: { in: ["PENDIENTE", "EN_PROCESO"] } },
        select: { id: true, estado: true },
      });
      if (abierto) {
        return NextResponse.json(
          {
            error:
              abierto.estado === "PENDIENTE"
                ? "Ya hay un llamado pendiente para este radicado."
                : "El digitalizador ya está revisando este radicado.",
          },
          { status: 409 }
        );
      }
    }

    const nombre = session.user.name ?? session.user.email ?? "Ventanilla";
    const ident  = rad ? `radicado ${rad}` : folio ? `FMI ${folio}` : "un plano en ventanilla";
    const ahora  = new Date();

    // El derecho de petición entra al inventario como un plano más.
    // Si el radicado ya está registrado se reutiliza en vez de duplicarlo.
    let planExistente: { id: string } | null = null;
    if (esCheckIn && rad) {
      planExistente = await prisma.plan.findUnique({
        where:  { radicado: rad },
        select: { id: true },
      });
    }

    const llamado = await prisma.$transaction(async (tx) => {
      let planId: string | null = planExistente?.id ?? null;

      if (esCheckIn && rad && !planId) {
        const plan = await tx.plan.create({
          data: {
            radicado:        rad,
            mutacion:        "Derecho de Petición",
            formato:         formato?.trim() || "OTRO",
            predial:         folio,
            observaciones:   nota?.trim() || null,
            receivedById:    receivedById || null,
            registradoPorId: session.user.id,
            estado:          "DISPONIBLE",
          },
          select: { id: true },
        });
        planId = plan.id;

        await tx.history.create({
          data: {
            planId,
            userId:   session.user.id,
            accion:   "REGISTRO",
            detalles: "Derecho de petición registrado desde ventanilla.",
          },
        });
      }

      const creado = await tx.llamadoVerificacion.create({
        data: {
          radicado:          rad,
          fmi:               folio,
          nota:              nota?.trim() || null,
          formato:           formato?.trim() || null,
          esDerechoPeticion: esCheckIn,
          solicitanteId:     session.user.id,
          planId,
          // El derecho de petición queda registrado y cerrado de inmediato:
          // no espera al digitalizador porque no está en la oficina.
          estado:            esCheckIn ? "COMPLETADO" : "PENDIENTE",
          finalizadoEn:      esCheckIn ? ahora : null,
        },
        select: SELECT_LLAMADO,
      });

      // El registro del plano se avisa igual que cualquier otro ingreso
      if (esCheckIn && planId && !planExistente) {
        const destinatarios = await tx.user.findMany({
          where:  { role: { in: ["ENCARGADO", "ADMINISTRADOR"] }, isActive: true },
          select: { id: true },
        });
        if (destinatarios.length > 0) {
          await tx.notification.createMany({
            data: destinatarios.map((u) => ({
              message: `${nombre} registró el derecho de petición ${rad} como plano en el sistema.`,
              userId:  u.id,
              planoId: planId,
            })),
          });
        }
      }

      // Notifica a todos los digitalizadores activos
      const digitalizadores = await tx.user.findMany({
        where:  { role: "DIGITALIZADOR", isActive: true },
        select: { id: true },
      });
      if (digitalizadores.length > 0) {
        await tx.notification.createMany({
          data: digitalizadores.map((d) => ({
            message: esCheckIn
              ? `${nombre} registró un derecho de petición (${ident}) mientras no estabas.`
              : `${nombre} solicita verificar ${ident}.`,
            userId: d.id,
          })),
        });
      }

      // El administrador queda enterado de toda solicitud de verificación.
      // El derecho de petición ya se avisó arriba junto con el plano.
      if (!esCheckIn) {
        await notificarAdmins(tx, `${nombre} solicitó verificar ${ident}.`, {
          excluirUserId: session.user.id,
        });
      }

      return creado;
    });

    // Push fuera de la transacción — que un fallo de red no revierta el llamado
    await sendPushToRoles(["DIGITALIZADOR"], {
      title: esCheckIn ? "Derecho de petición registrado" : "Plano por verificar",
      body:  esCheckIn
        ? `${nombre} dejó registrado un derecho de petición (${ident}).`
        : `${nombre} necesita revisar ${ident}.`,
      url:   "/dashboard",
      tag:   "llamado-verificacion",
      // La solicitud de verificación resalta, permanece en pantalla y al
      // tocarla abre directamente el panel de llamados del digitalizador
      ...(esCheckIn
        ? {}
        : { image: "/aviso-verificacion.png", requireInteraction: true, panel: "verificacion" as const }),
    }).catch((err) => console.error("[Push] llamado:", err));

    if (esCheckIn && !planExistente) {
      await sendPushToRoles(["ENCARGADO", "ADMINISTRADOR"], {
        title: "📋 Derecho de petición registrado",
        body:  `Radicado ${rad} ingresado al sistema por ${nombre}.`,
        url:   "/dashboard/buscar",
        tag:   `plano-dp-${rad}`,
      }).catch((err) => console.error("[Push] plano DP:", err));
    }

    return NextResponse.json(
      { ...llamado, planoYaExistia: Boolean(planExistente) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating llamado:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un plano registrado con este número de radicado." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
