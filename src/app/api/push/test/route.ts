import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  ?? "BFGjUXqEPn9ncQLGzjOnt1QLC3i5Dmhx7Dg9lUyyBDbZjMvaJ4yFc8j-BkaPCklrX7XYAOYGqIa9Kf6bBhdfM2Y";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY             ?? "108wgfg4xWvMsaFf5F8LgZ02GHrm0jnGKvGPy64nOWs";

webpush.setVapidDetails("mailto:admin@catastro.com", VAPID_PUBLIC, VAPID_PRIVATE);

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
      ok:      false,
      count:   0,
      message: "❌ Sin suscripción activa. Desactiva y vuelve a activar las notificaciones (ícono de campana).",
    });
  }

  const results: { ok: boolean; error?: string }[] = [];

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: "🔔 Prueba de notificación",
          body:  "¡Funciona! Las notificaciones push están activas.",
          url:   "/dashboard",
          tag:   "push-test",
        }),
        { TTL: 60 }
      );
      results.push({ ok: true });
    } catch (err: any) {
      // Clean up stale subscription
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        results.push({ ok: false, error: `Suscripción expirada (${err.statusCode}) — se eliminó. Reactiva las notificaciones.` });
      } else {
        results.push({ ok: false, error: `Error ${err.statusCode ?? "?"}: ${err.message ?? err}` });
      }
    }
  }

  const allOk    = results.every((r) => r.ok);
  const anyOk    = results.some((r) => r.ok);
  const errors   = results.filter((r) => !r.ok).map((r) => r.error);

  let message: string;
  if (allOk) {
    message = `✅ Notificación enviada (${results.length} dispositivo${results.length !== 1 ? "s" : ""}). Si no aparece en 5 seg: Edge → verifica Windows → Sistema → Notificaciones → Microsoft Edge.`;
  } else if (anyOk) {
    message = `⚠️ Enviado a ${results.filter((r) => r.ok).length} de ${results.length} dispositivos. Errores: ${errors.join("; ")}`;
  } else {
    message = `❌ Falló en todos los dispositivos: ${errors.join("; ")}. Desactiva y reactiva las notificaciones.`;
  }

  return NextResponse.json({ ok: anyOk, count: results.length, message, results });
}
