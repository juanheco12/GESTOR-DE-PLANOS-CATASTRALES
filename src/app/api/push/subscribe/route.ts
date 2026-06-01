import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sub = await req.json();
  const { endpoint, keys } = sub;
  if (!endpoint || !keys?.p256dh || !keys?.auth)
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });

  try {
    await prisma.pushSubscription.upsert({
      where:  { endpoint },
      create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
    });
  } catch (err) {
    console.error("[Push/subscribe] DB upsert failed:", err);
    return NextResponse.json({ error: "Error al guardar la suscripción" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Endpoint requerido" }, { status: 400 });

  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });
  } catch (err) {
    console.error("[Push/subscribe] DB delete failed:", err);
    return NextResponse.json({ error: "Error al eliminar la suscripción" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
