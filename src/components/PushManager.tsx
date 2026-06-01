"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Send, AlertTriangle } from "lucide-react";

// Read from env var so it stays consistent with the server (push.ts).
// Falls back to the hardcoded key only if the env var is not set.
const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  "BFGjUXqEPn9ncQLGzjOnt1QLC3i5Dmhx7Dg9lUyyBDbZjMvaJ4yFc8j-BkaPCklrX7XYAOYGqIa9Kf6bBhdfM2Y";

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
  const [testMsg,    setTestMsg]    = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then(async (reg) => {
        reg.update().catch(() => {});
        const sub = await reg.pushManager.getSubscription();
        if (!sub) { setSubscribed(false); return; }
        const ok = await syncToServer(sub);
        setSubscribed(ok);
        navigator.serviceWorker.addEventListener("controllerchange", async () => {
          const updated = await reg.pushManager.getSubscription();
          if (updated) await syncToServer(updated);
        });
      })
      .catch(() => {});
  }, []);

  const subscribe = async () => {
    setLoading(true);
    setTestMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setTestMsg("Permiso denegado en el navegador. Revisa la configuración de notificaciones.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      // Always unsubscribe first — stale endpoints are the #1 cause of silent failures on Edge
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
      if (!ok) throw new Error("No se pudo guardar en servidor");
      setSubscribed(true);
      setTestMsg("✅ Notificaciones activadas. Usa el botón de prueba para verificar.");
    } catch (e: any) {
      setTestMsg(`Error: ${e?.message ?? "No se pudo activar"}`);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    setTestMsg("");
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
    setTestMsg("Enviando...");
    try {
      const res  = await fetch("/api/push/test");
      const data = await res.json();
      setTestMsg(data.message ?? "Enviado");
      // Clear message after 8s
      setTimeout(() => setTestMsg(""), 8000);
    } catch {
      setTestMsg("Error al enviar prueba.");
    }
  };

  if (!supported) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {/* Main subscribe/unsubscribe toggle */}
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading}
          title={subscribed ? "Desactivar notificaciones push" : "Activar notificaciones push"}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
            subscribed
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          {loading ? (
            <span className="h-5 w-5 block border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : subscribed ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
        </button>

        {/* Test button — only when subscribed */}
        {subscribed && (
          <button
            onClick={testPush}
            title="Enviar notificación de prueba a este dispositivo"
            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Feedback message */}
      {testMsg && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[220px] text-right leading-snug">
          {testMsg}
        </p>
      )}

      {/* Edge/Windows tip shown when subscribed */}
      {subscribed && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[220px] text-right leading-snug hidden lg:block">
          Edge: verifica Configuración de Windows → Sistema → Notificaciones → Microsoft Edge
        </p>
      )}
    </div>
  );
}
