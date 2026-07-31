import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToRoles } from "@/lib/push";

// Roles de ventanilla que pueden llamar al digitalizador
const ROLES_SOLICITANTES = ["RADICADORA", "ENCARGADO", "ADMINISTRADOR"];

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

// GET — el digitalizador ve todos los llamados; ventanilla ve solo los suyos
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const role = session.user.role;
  const esDigitalizador = role === "DIGITALIZADOR";

  if (!esDigitalizador && !ROLES_SOLICITANTES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const llamados = await prisma.llamadoVerificacion.findMany({
      where: esDigitalizador ? {} : { solicitanteId: session.user.id },
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
      take: 100,
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
    const { radicado, fmi, nota } = await req.json();

    if (!radicado?.trim()) {
      return NextResponse.json({ error: "El número de radicado es requerido" }, { status: 400 });
    }

    // Evita llamados duplicados para el mismo radicado que aún estén sin atender
    const abierto = await prisma.llamadoVerificacion.findFirst({
      where: {
        radicado: radicado.trim(),
        estado:   { in: ["PENDIENTE", "EN_PROCESO"] },
      },
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

    const nombre = session.user.name ?? session.user.email ?? "Ventanilla";

    const llamado = await prisma.$transaction(async (tx) => {
      const creado = await tx.llamadoVerificacion.create({
        data: {
          radicado:      radicado.trim(),
          fmi:           fmi?.trim()  || null,
          nota:          nota?.trim() || null,
          solicitanteId: session.user.id,
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
            message: `${nombre} solicita verificar el plano con radicado ${radicado.trim()}.`,
            userId:  d.id,
          })),
        });
      }

      return creado;
    });

    // Push fuera de la transacción — que un fallo de red no revierta el llamado
    sendPushToRoles(["DIGITALIZADOR"], {
      title: "Verificación solicitada",
      body:  `${nombre} necesita revisar el radicado ${radicado.trim()}.`,
      url:   "/dashboard",
      tag:   "llamado-verificacion",
    }).catch((err) => console.error("[Push] llamado:", err));

    return NextResponse.json(llamado, { status: 201 });
  } catch (error) {
    console.error("Error creating llamado:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
