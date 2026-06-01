"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, CornerDownLeft, RotateCcw, AlertTriangle, Lock, PackageCheck } from "lucide-react";

interface Props {
  requestId: string;
  estado: string;
  adminEntregaId: string | null;
  adminEntregaNombre: string | null;
  currentUserId: string;
  currentUserRole: string;
}

export default function ActionButtons({
  requestId,
  estado,
  adminEntregaId,
  adminEntregaNombre,
  currentUserId,
  currentUserRole,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const isOwner =
    !adminEntregaId ||
    adminEntregaId === currentUserId ||
    currentUserRole === "ADMINISTRADOR";

  const handleAction = async (accion: string, mensaje: string) => {
    if (!confirm(mensaje)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/${requestId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ accion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar la solicitud");

      if (accion === "MARCAR_LISTO") {
        router.refresh();
      } else {
        router.push("/dashboard/entregados");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const LockBanner = () => (
    <div className="flex items-start gap-3 p-4 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
      <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Asignado a otro receptor</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span className="font-medium">{adminEntregaNombre ?? "Otro encargado"}</span> está gestionando este plano.
          Solo esa persona puede continuar el proceso.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* ── PENDIENTE: cualquier receptor puede aceptar ── */}
      {estado === "PENDIENTE" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Al aceptar, este proceso quedará asignado a ti. Solo tú podrás confirmar la entrega y gestionar la devolución.
            </p>
          </div>
          <button
            onClick={() =>
              handleAction(
                "MARCAR_LISTO",
                "¿Aceptas esta solicitud? El proceso quedará asignado a ti y podrás confirmar la entrega cuando el ejecutor pase por la oficina."
              )
            }
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            {loading ? "Procesando..." : "Aceptar solicitud"}
          </button>
        </div>
      )}

      {/* ── LISTO_PARA_ENTREGA: esperando que el ejecutor confirme ── */}
      {estado === "LISTO_PARA_ENTREGA" && (
        isOwner ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <PackageCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Esperando confirmación del ejecutor</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  El ejecutor debe confirmar la recepción desde su panel "Mis Solicitudes". Si el ejecutor no puede hacerlo, usa el botón de respaldo.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                handleAction(
                  "CONFIRMAR_ENTREGA",
                  "¿Confirmas manualmente que el ejecutor recibió el plano físicamente?"
                )
              }
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-60 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              {loading ? "Registrando..." : "Confirmar entrega (respaldo)"}
            </button>
          </div>
        ) : (
          <LockBanner />
        )
      )}

      {/* ── ENTREGADO: el ejecutor tiene el plano ── */}
      {estado === "ENTREGADO" && (
        isOwner ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
              <RotateCcw className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">El ejecutor tiene el plano</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Si el ejecutor entrega el plano físicamente sin haberlo registrado en el sistema, usa este botón para registrar la devolución.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                handleAction(
                  "FORZAR_DEVOLUCION",
                  "¿Confirmas que el ejecutor te entregó el plano físicamente? Se registrará la devolución."
                )
              }
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors shadow-sm"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              {loading ? "Registrando..." : "Registrar devolución manual"}
            </button>
          </div>
        ) : (
          <LockBanner />
        )
      )}

      {/* ── DEVOLUCION_SOLICITADA: ejecutor quiere devolver ── */}
      {estado === "DEVOLUCION_SOLICITADA" && (
        isOwner ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
              <CornerDownLeft className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <p className="text-sm text-purple-800 dark:text-purple-300">
                El ejecutor solicitó la devolución. Confirma que recibiste el plano físicamente para archivarlo.
              </p>
            </div>
            <button
              onClick={() =>
                handleAction(
                  "ACEPTAR_DEVOLUCION",
                  "¿Confirmas que recibiste el plano físicamente y lo devuelves al archivo?"
                )
              }
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors shadow-sm"
            >
              <CornerDownLeft className="mr-2 h-5 w-5" />
              {loading ? "Procesando..." : "Confirmar recepción y archivar"}
            </button>
          </div>
        ) : (
          <LockBanner />
        )
      )}

      {estado === "DEVUELTO" && (
        <p className="text-slate-500 dark:text-slate-400 italic text-sm p-2">
          Este plano ya fue devuelto y archivado correctamente.
        </p>
      )}
    </div>
  );
}
