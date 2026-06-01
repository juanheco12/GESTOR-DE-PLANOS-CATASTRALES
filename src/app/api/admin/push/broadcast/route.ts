import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  ?? "BFGjUXqEPn9ncQLGzjOnt1QLC3i5Dmhx7Dg9lUyyBDbZjMvaJ4yFc8j-BkaPCklrX7XYAOYGqIa9Kf6bBhdfM2Y";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY             ?? "108wgfg4xWvMsaFf5F8LgZ02GHrm0jnGKvGPy64nOWs";

webpush.setVapidDetails("mailto:admin@catastro.com", VAPID_PUBLIC, VAPID_PRIVATE);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { title, body, url = "/dashboard" } = await req.json();
  if (!body) return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 });

  const subs = await prisma.pushSubscription.findMany();

  let sent = 0;
  let failed = 0;

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: title ?? "📢 Catastro Montería", body, url, tag: "broadcast" }),
        { TTL: 3600 }
      );
      sent++;
    } catch (err: any) {
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }
  }

  const message = sent > 0
    ? `✅ Enviado a ${sent} dispositivo${sent !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} fallaron)` : ""}.`
    : `❌ No se pudo enviar a ningún dispositivo (${failed} fallaron).`;

  return NextResponse.json({ ok: sent > 0, sent, failed, message });
}
