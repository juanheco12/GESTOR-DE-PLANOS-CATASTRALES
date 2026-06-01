"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";

const VAPID_PUBLIC = "BFGjUXqEPn9ncQLGzjOnt1QLC3i5Dmhx7Dg9lUyyBDbZjMvaJ4yFc8j-BkaPCklrX7XYAOYGqIa9Kf6bBhdfM2Y";

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64  = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw  = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function syncToServer(sub: PushSubscription): Promise<boolean> {
  const res = await fetch("/api/push/subscribe", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(sub),
  });
  return res.ok;
}

export default function PushManager() {
  const [supported,  setSupported]  = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [testing,    setTesting]    = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);

    navigator.serviceWorker
      // updateViaCache:"none" forces Edge/Chrome to always fetch the latest sw.js
      // instead of serving a cached copy — critical for SW updates to propagate
      .register("/sw.js", { updateViaCache: "none" })
      .then(async (reg) => {
        // Proactively check for a new SW version on every page load
        reg.update().catch(() => {});

        const sub = await reg.pushManager.getSubscription();
        if (!sub) { setSubscribed(false); return; }

        // Re-sync existing browser subscription with DB (survives server restarts)
        const ok = await syncToServer(sub);
        setSubscribed(ok);

        // If a new SW activates mid-session, re-sync the subscription
        navigator.serviceWorker.addEventListener("controllerchange", async () => {
          const updated = await reg.pushManager.getSubscription();
          if (updated) await syncToServer(updated);
        });
      })
      .catch(() => {});
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;

      // Always unsubscribe first so we get a fresh endpoint.
      // Stale endpoints are the #1 cause of silent push failures on Edge.
      const old = await reg.pushManager.getSubscription();
      if (old) {
        await fetch("/api/push/subscribe", {
          method:  "DELETE",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ endpoint: old.endpoint }),
        }).catch(() => {});
        await old.unsubscribe().catch(() => {});
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      const ok = await syncToServer(sub);
      if (!ok) throw new Error();
      setSubscribed(true);
    } catch {
      alert("No se pudo activar las notificaciones. Verifica los permisos del navegador.");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      await fetch("/api/push/subscribe", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      setSubscribed(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const testPush = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/push/test");
      const data = await res.json();
      alert(data.message ?? "Notificación enviada. Espera unos segundos.");
    } catch {
      alert("Error al enviar notificación de prueba.");
    } finally {
      setTesting(false);
    }
  };

  if (!supported) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        title={subscribed ? "Desactivar notificaciones push" : "Activar notificaciones push"}
        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
          subscribed
            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </button>

      {/* Test button only when subscribed — lets users verify delivery works */}
      {subscribed && (
        <button
          onClick={testPush}
          disabled={testing}
          title="Enviar notificación de prueba"
          className="p-2 rounded-lg transition-colors text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
