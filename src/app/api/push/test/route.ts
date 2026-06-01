import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
  });

  if (subs.length === 0) {
    return NextResponse.json({
      count: 0,
      message: "No hay suscripciones activas para tu usuario. Desactiva y vuelve a activar las notificaciones.",
    });
  }

  await sendPushToUser(session.user.id, {
    title: "🔔 Prueba de notificación",
    body:  "¡Funciona! Las notificaciones push están configuradas correctamente.",
    url:   "/dashboard",
    tag:   "push-test",
  });

  return NextResponse.json({
    count:   subs.length,
    message: `Notificación enviada a ${subs.length} dispositivo${subs.length !== 1 ? "s" : ""}. Si no aparece en 5 segundos, desactiva y vuelve a activar las notificaciones.`,
  });
}
