"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, CornerDownLeft, Clock, RotateCcw, AlertTriangle } from "lucide-react";

export default function ActionButtons({ requestId, estado }: { requestId: string; estado: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async (accion: string) => {
    const mensajes: Record<string, string> = {
      MARCAR_LISTO: "¿Confirmas que entregas físicamente el plano al ejecutor? El ejecutor deberá firmar digitalmente.",
      ACEPTAR_DEVOLUCION: "¿Confirmas que recibiste el plano físicamente y lo devuelves al archivo?",
      FORZAR_DEVOLUCION: "¿Confirmas que el ejecutor te entregó el plano físicamente? Se registrará la devolución.",
    };
    if (!confirm(mensajes[accion] ?? "¿Confirmar esta acción?")) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/solicitudes/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar la solicitud");
      }

      // Redirigir para que el servidor recargue el estado actualizado
      if (accion === "MARCAR_LISTO") {
        router.refresh(); // Actualiza la misma página para mostrar estado LISTO_PARA_ENTREGA
      } else {
        router.push("/dashboard/entregados"); // Devolución completada → volver a la lista
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* PENDIENTE → Admin aprueba y el ejecutor verá la alerta para firmar */}
      {estado === "PENDIENTE" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Al aprobar, el ejecutor verá la alerta en su panel y deberá firmar digitalmente para confirmar la recepción.
            </p>
          </div>
          <button
            onClick={() => handleAction("MARCAR_LISTO")}
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            {loading ? "Procesando..." : "Aprobar y notificar al ejecutor"}
          </button>
        </div>
      )}

      {/* LISTO_PARA_ENTREGA → Esperando firma del ejecutor */}
      {estado === "LISTO_PARA_ENTREGA" && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Esperando firma digital del ejecutor</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              El ejecutor verá la alerta en su panel ("Mis Solicitudes") y deberá firmar digitalmente para completar la entrega.
            </p>
          </div>
        </div>
      )}

      {/* ENTREGADO → El ejecutor tiene el plano. Admin puede registrar devolución manual */}
      {estado === "ENTREGADO" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
            <RotateCcw className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">El ejecutor tiene el plano físicamente</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Si el ejecutor trajo el plano sin registrarlo en el sistema, usa este botón para registrar la devolución manualmente.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleAction("FORZAR_DEVOLUCION")}
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            {loading ? "Registrando..." : "Registrar devolución"}
          </button>
        </div>
      )}

      {/* DEVOLUCION_SOLICITADA → El ejecutor solicitó devolución vía software */}
      {estado === "DEVOLUCION_SOLICITADA" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
            <CornerDownLeft className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <p className="text-sm text-purple-800 dark:text-purple-300">
              El ejecutor solicitó la devolución del plano. Confirma que lo recibiste físicamente para devolverlo al archivo.
            </p>
          </div>
          <button
            onClick={() => handleAction("ACEPTAR_DEVOLUCION")}
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <CornerDownLeft className="mr-2 h-5 w-5" />
            {loading ? "Procesando..." : "Confirmar recepción y archivar"}
          </button>
        </div>
      )}

      {estado === "DEVUELTO" && (
        <p className="text-slate-500 dark:text-slate-400 italic text-sm p-2">Este plano ya fue devuelto y archivado correctamente.</p>
      )}
    </div>
  );
}
