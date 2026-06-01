"use client";

import { useState } from "react";
import { Send, Bell, BellOff, Users } from "lucide-react";

export default function NotificacionesTab() {
  const [testMsg,      setTestMsg]      = useState("");
  const [testLoading,  setTestLoading]  = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");

  const sendTest = async () => {
    setTestLoading(true);
    setTestMsg("Enviando prueba a tus dispositivos…");
    try {
      const res  = await fetch("/api/push/test");
      const data = await res.json();
      setTestMsg(data.message ?? "Enviado");
    } catch {
      setTestMsg("Error al enviar la prueba.");
    } finally {
      setTestLoading(false);
    }
  };

  const sendBroadcast = async () => {
    const msg = broadcastText.trim();
    if (!msg) return;
    if (!confirm(`¿Enviar la notificación "${msg}" a todos los usuarios con notificaciones activas?`)) return;
    setBroadcastLoading(true);
    setBroadcastMsg("Enviando…");
    try {
      const res  = await fetch("/api/admin/push/broadcast", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title: "📢 Mensaje del administrador", body: msg, url: "/dashboard" }),
      });
      const data = await res.json();
      setBroadcastMsg(data.message ?? "Enviado");
    } catch {
      setBroadcastMsg("Error al enviar el broadcast.");
    } finally {
      setBroadcastLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Notificaciones Push</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Prueba y gestiona las notificaciones push del sistema.
        </p>
      </div>

      {/* Test section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Bell className="h-4 w-4 text-blue-500" />
          Probar mis notificaciones
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Envía una notificación de prueba a todos tus dispositivos donde tengas la campana activada.
          Útil para verificar que Edge / Windows está configurado correctamente.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={sendTest}
            disabled={testLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {testLoading ? (
              <span className="h-4 w-4 block border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar prueba
          </button>
        </div>
        {testMsg && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{testMsg}</p>
        )}
        <div className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
          <strong>Si no aparece la notificación en Edge:</strong>{" "}
          Configuración de Windows → Sistema → Notificaciones → Microsoft Edge → activado.
          Asegúrate de que Focus Assist / No molestar esté desactivado.
        </div>
      </div>

      {/* Broadcast section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Users className="h-4 w-4 text-emerald-500" />
          Enviar mensaje a todos
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Envía una notificación push a todos los usuarios con suscripción activa en el sistema.
        </p>
        <textarea
          rows={2}
          placeholder="Escribe el mensaje para todos los usuarios…"
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={sendBroadcast}
          disabled={broadcastLoading || !broadcastText.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {broadcastLoading ? (
            <span className="h-4 w-4 block border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Enviar a todos
        </button>
        {broadcastMsg && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{broadcastMsg}</p>
        )}
      </div>
    </div>
  );
}
