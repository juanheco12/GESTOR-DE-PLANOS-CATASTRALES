import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToRoles } from "@/lib/push";

const ALLOWED_ROLES = ["ADMINISTRADOR", "ENCARGADO", "RADICADORA"];

// PATCH: register return
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const prestamo = await prisma.prestamo.findUnique({
    where: { id },
    include: { plan: { select: { id: true, radicado: true } } },
  });

  if (!prestamo) return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
  if (prestamo.fechaDevolucion) return NextResponse.json({ error: "Ya fue devuelto" }, { status: 409 });

  const quien = session.user.name ?? session.user.email ?? "Usuario";
  const fecha = new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "short",
    timeStyle: "short",
  });
  const detalles = `Plano devuelto por ${prestamo.nombreReceptor} (${prestamo.entidad}). Recibido por ${quien} el ${fecha}.`;

  await prisma.$transaction(async (tx) => {
    await tx.prestamo.update({
      where: { id },
      data: {
        fechaDevolucion: new Date(),
        devueltoPorId:   session.user.id,
      },
    });

    await tx.plan.update({
      where: { id: prestamo.planId },
      data:  { estado: "DISPONIBLE" },
    });

    await tx.history.create({
      data: {
        planId:  prestamo.planId,
        userId:  session.user.id,
        accion:  "DEVOLUCION_EXTERNA",
        detalles,
      },
    });
  });

  await sendPushToRoles(
    ["ADMINISTRADOR", "ENCARGADO"],
    {
      title: "✅ Plano devuelto",
      body:  `Plano ${prestamo.plan.radicado} devuelto por ${prestamo.nombreReceptor}. Ya está disponible.`,
      url:   `/dashboard/buscar/${prestamo.planId}`,
      tag:   `devolucion-${prestamo.planId}`,
    }
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
