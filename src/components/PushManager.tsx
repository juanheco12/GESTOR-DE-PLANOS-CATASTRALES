"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

const VAPID_PUBLIC = "BFGjUXqEPn9ncQLGzjOnt1QLC3i5Dmhx7Dg9lUyyBDbZjMvaJ4yFc8j-BkaPCklrX7XYAOYGqIa9Kf6bBhdfM2Y";

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64  = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw  = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushManager() {
  const [supported,  setSupported]  = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) { setSubscribed(false); return; }
        // Re-sync existing browser subscription with server in case it was lost from DB
        const res = await fetch("/api/push/subscribe", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(sub),
        });
        setSubscribed(res.ok);
      })
      .catch(() => {});
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setLoading(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:    true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      const res = await fetch("/api/push/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("Error al guardar la suscripción en el servidor");

      setSubscribed(true);
    } catch {
      // permission denied or error
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

  if (!supported) return null;

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      title={subscribed ? "Desactivar notificaciones push" : "Activar notificaciones del sistema"}
      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
        subscribed
          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
          : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
    </button>
  );
}
