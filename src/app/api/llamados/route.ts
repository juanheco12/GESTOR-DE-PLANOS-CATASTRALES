import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToRoles } from "@/lib/push";

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
    const { radicado, fmi, nota, formato, esDerechoPeticion } = await req.json();

    const rad = radicado?.trim() || null;
    const folio = fmi?.trim() || null;

    const esCheckIn = esDerechoPeticion === true;

    // El derecho de petición sí exige radicado: es el número con el que se responde
    if (esCheckIn && !rad) {
      return NextResponse.json(
        { error: "El derecho de petición requiere el número de radicado" },
        { status: 400 }
      );
    }

    // Para el resto basta con algo que identifique el plano
    if (!rad && !folio) {
      return NextResponse.json(
        { error: "Indica al menos el número de radicado o el FMI" },
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
    const ident  = rad ? `radicado ${rad}` : `FMI ${folio}`;
    const ahora  = new Date();

    const llamado = await prisma.$transaction(async (tx) => {
      const creado = await tx.llamadoVerificacion.create({
        data: {
          radicado:          rad,
          fmi:               folio,
          nota:              nota?.trim() || null,
          formato:           formato?.trim() || null,
          esDerechoPeticion: esCheckIn,
          solicitanteId:     session.user.id,
          // El check-in queda registrado y cerrado de inmediato: no espera
          // al digitalizador porque no está en la oficina.
          estado:            esCheckIn ? "COMPLETADO" : "PENDIENTE",
          finalizadoEn:      esCheckIn ? ahora : null,
        },
        select: SELECT_LLAMADO,
      });

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
              : `${nombre} solicita verificar el plano con ${ident}.`,
            userId: d.id,
          })),
        });
      }

      return creado;
    });

    // Push fuera de la transacción — que un fallo de red no revierta el llamado
    sendPushToRoles(["DIGITALIZADOR"], {
      title: esCheckIn ? "Derecho de petición registrado" : "Verificación solicitada",
      body:  esCheckIn
        ? `${nombre} dejó registrado un derecho de petición (${ident}).`
        : `${nombre} necesita revisar el ${ident}.`,
      url:   "/dashboard",
      tag:   "llamado-verificacion",
    }).catch((err) => console.error("[Push] llamado:", err));

    return NextResponse.json(llamado, { status: 201 });
  } catch (error) {
    console.error("Error creating llamado:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
