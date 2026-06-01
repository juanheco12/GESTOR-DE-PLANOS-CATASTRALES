import webpush from "web-push";
import { prisma } from "./prisma";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  ?? "BFGjUXqEPn9ncQLGzjOnt1QLC3i5Dmhx7Dg9lUyyBDbZjMvaJ4yFc8j-BkaPCklrX7XYAOYGqIa9Kf6bBhdfM2Y";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY             ?? "108wgfg4xWvMsaFf5F8LgZ02GHrm0jnGKvGPy64nOWs";

webpush.setVapidDetails("mailto:admin@catastro.com", VAPID_PUBLIC, VAPID_PRIVATE);

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
  tag?:  string;
}

async function deliver(subId: string, endpoint: string, p256dh: string, auth: string, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload),
      { TTL: 4 * 60 * 60 }   // 4h — notifications survive while browser is closed
    );
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await prisma.pushSubscription.delete({ where: { id: subId } }).catch(() => {});
    } else {
      console.error(`[Push] Delivery failed (status=${err.statusCode ?? "?"}):`, err.message ?? err);
    }
  }
}

// Single DB round-trip: join subscriptions with users by role
export async function sendPushToRoles(roles: string[], payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({
    where: { user: { role: { in: roles as any[] }, isActive: true } },
  });
  await Promise.allSettled(subs.map((s) => deliver(s.id, s.endpoint, s.p256dh, s.auth, payload)));
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled(subs.map((s) => deliver(s.id, s.endpoint, s.p256dh, s.auth, payload)));
}
