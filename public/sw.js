const CACHE = "catastro-v4";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); } catch { return; }

  const {
    title = "Catastro Montería",
    body  = "",
    url   = "/dashboard",
    tag   = "catastro",
    image,                    // banner grande, para los avisos que deben resaltar
    requireInteraction = false,
  } = data;

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        tag,
        renotify:  true,
        requireInteraction,
        ...(image ? { image, icon: image } : {}),
        data: { url },
      }),
      // Avisa a las pestañas abiertas para que refresquen al instante,
      // sin esperar al siguiente ciclo de sondeo.
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        for (const client of list) {
          client.postMessage({ type: "catastro-push", title, body, tag });
        }
      }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
