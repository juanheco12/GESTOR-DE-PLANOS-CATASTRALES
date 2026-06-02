import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToRoles } from "@/lib/push";

const ALLOWED_ROLES = ["ADMINISTRADOR", "ENCARGADO", "RADICADORA"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const planId = req.nextUrl.searchParams.get("planId");
  if (!planId) return NextResponse.json({ error: "planId requerido" }, { status: 400 });

  const prestamos = await prisma.prestamo.findMany({
    where: { planId },
    orderBy: { fechaEntrega: "desc" },
    include: {
      entregadoPor: { select: { name: true, email: true } },
      devueltoPor:  { select: { name: true } },
    },
  });

  return NextResponse.json(prestamos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { planId, nombreReceptor, entidad, cargo, motivo, telefono, observaciones } = body;

  if (!planId || !nombreReceptor || !cargo || !motivo) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, radicado: true, estado: true },
  });
  if (!plan) return NextResponse.json({ error: "Plano no encontrado" }, { status: 404 });

  if (plan.estado === "PRESTADO") {
    return NextResponse.json({ error: "El plano ya está prestado" }, { status: 409 });
  }

  const quien = session.user.name ?? session.user.email ?? "Usuario";
  const fecha = new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "short",
    timeStyle: "short",
  });
  const detalles = `Plano entregado a ${nombreReceptor} — ${cargo} de ${entidad}. Entregado por ${quien} el ${fecha}.`;

  const prestamo = await prisma.$transaction(async (tx) => {
    const p = await tx.prestamo.create({
      data: {
        planId,
        entregadoPorId: session.user.id,
        nombreReceptor: nombreReceptor.trim(),
        entidad:        (entidad ?? "Secretaría de Planeación").trim(),
        cargo:          cargo.trim(),
        motivo:         motivo.trim(),
        telefono:       telefono?.trim() || null,
        observaciones:  observaciones?.trim() || null,
      },
    });

    await tx.plan.update({
      where: { id: planId },
      data:  { estado: "PRESTADO" },
    });

    await tx.history.create({
      data: {
        planId,
        userId:  session.user.id,
        accion:  "PRESTAMO_EXTERNO",
        detalles,
      },
    });

    return p;
  });

  await sendPushToRoles(
    ["ADMINISTRADOR", "ENCARGADO"],
    {
      title: "📋 Préstamo registrado",
      body:  `Plano ${plan.radicado} entregado a ${nombreReceptor} (${entidad}).`,
      url:   `/dashboard/buscar/${planId}`,
      tag:   `prestamo-${planId}`,
    }
  ).catch(() => {});

  return NextResponse.json(prestamo, { status: 201 });
}
