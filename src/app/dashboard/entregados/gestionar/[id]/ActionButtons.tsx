"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, CornerDownLeft, Clock, RotateCcw, AlertTriangle } from "lucide-react";

export default function ActionButtons({ requestId, estado }: { requestId: string; estado: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleAction = async (accion: string) => {
    if (!confirm(
      accion === "MARCAR_LISTO"
        ? "¿Confirmas que entregas físicamente el plano al ejecutor? Quedará pendiente de firma digital."
        : accion === "ACEPTAR_DEVOLUCION" || accion === "FORZAR_DEVOLUCION"
        ? "¿Confirmas que recibiste el plano físicamente y lo devuelves al archivo?"
        : "¿Confirmar esta acción?"
    )) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al procesar la solicitud");
      }

      setDone(true);
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          Acción registrada correctamente. Recarga la página para ver el estado actualizado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* PENDIENTE: Admin aprueba y entrega físicamente */}
      {estado === "PENDIENTE" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Al confirmar, se notifica al ejecutor que puede recoger el plano. El ejecutor deberá firmar digitalmente para completar la entrega.
            </p>
          </div>
          <button
            onClick={() => handleAction("MARCAR_LISTO")}
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors disabled:opacity-60 shadow-sm"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            {loading ? "Procesando..." : "Aprobar y notificar al ejecutor"}
          </button>
        </div>
      )}

      {/* LISTO_PARA_ENTREGA: Esperando firma del ejecutor */}
      {estado === "LISTO_PARA_ENTREGA" && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Esperando firma digital del ejecutor</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              El ejecutor verá la alerta en su panel y deberá firmar digitalmente para confirmar la recepción del plano.
            </p>
          </div>
        </div>
      )}

      {/* ENTREGADO: El ejecutor ya tiene el plano — admin puede forzar devolución */}
      {estado === "ENTREGADO" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
            <RotateCcw className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">El ejecutor tiene el plano</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Si el ejecutor trajo el plano físicamente sin registrarlo en el sistema, puedes registrar la devolución manualmente aquí.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleAction("FORZAR_DEVOLUCION")}
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-xl font-medium transition-colors disabled:opacity-60 shadow-sm"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            {loading ? "Procesando..." : "Registrar devolución manual"}
          </button>
        </div>
      )}

      {/* DEVOLUCION_SOLICITADA: El ejecutor solicitó devolución por software */}
      {estado === "DEVOLUCION_SOLICITADA" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
            <CornerDownLeft className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <p className="text-sm text-purple-800 dark:text-purple-300">
              El ejecutor ha solicitado la devolución. Confirma que recibiste el plano físicamente para devolverlo al archivo.
            </p>
          </div>
          <button
            onClick={() => handleAction("ACEPTAR_DEVOLUCION")}
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-60 shadow-sm"
          >
            <CornerDownLeft className="mr-2 h-5 w-5" />
            {loading ? "Procesando..." : "Confirmar recepción y archivar"}
          </button>
        </div>
      )}

      {estado === "DEVUELTO" && (
        <p className="text-slate-500 dark:text-slate-400 italic text-sm">Este plano ya fue devuelto y archivado.</p>
      )}
    </div>
  );
}
