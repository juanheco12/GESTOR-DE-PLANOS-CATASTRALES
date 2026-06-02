"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, RotateCcw, ChevronDown, ChevronUp, Clock, CheckCircle2, Loader2 } from "lucide-react";

type Prestamo = {
  id: string;
  nombreReceptor: string;
  entidad: string;
  cargo: string;
  motivo: string;
  telefono: string | null;
  observaciones: string | null;
  fechaEntrega: string;
  fechaDevolucion: string | null;
  entregadoPor: { name: string | null; email: string | null };
  devueltoPor:  { name: string | null } | null;
};

interface Props {
  prestamos: Prestamo[];
  canManage: boolean;
}

function PrestamoCard({ p, canManage }: { p: Prestamo; canManage: boolean }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const activo = !p.fechaDevolucion;

  const handleDevolucion = () => {
    if (!confirm(`¿Confirmar devolución del plano por parte de ${p.nombreReceptor} (${p.entidad})?`)) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/prestamos/${p.id}`, { method: "PATCH" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al registrar devolución");
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <div className={`rounded-xl border ${activo ? "border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-900/10" : "border-slate-200 dark:border-slate-700"} overflow-hidden`}>
      {/* Header row */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activo ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400" : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"}`}>
          {activo ? <BookOpen className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {p.nombreReceptor}
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">— {p.cargo}, {p.entidad}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 shrink-0" />
            {new Date(p.fechaEntrega).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}
            {p.fechaDevolucion && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                · Devuelto: {new Date(p.fechaDevolucion).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activo && canManage && (
            <button
              onClick={handleDevolucion}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {isPending ? "Registrando…" : "Registrar devolución"}
            </button>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-slate-100 dark:border-slate-800 mt-0 pt-3">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Motivo</span>
            <span className="text-slate-700 dark:text-slate-300">{p.motivo}</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Entregado por</span>
            <span className="text-slate-700 dark:text-slate-300">{p.entregadoPor.name ?? p.entregadoPor.email}</span>
          </div>
          {p.telefono && (
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Teléfono</span>
              <span className="text-slate-700 dark:text-slate-300">{p.telefono}</span>
            </div>
          )}
          {p.devueltoPor && (
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Recibido por</span>
              <span className="text-slate-700 dark:text-slate-300">{p.devueltoPor.name}</span>
            </div>
          )}
          {p.observaciones && (
            <div className="sm:col-span-2">
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Observaciones</span>
              <span className="text-slate-700 dark:text-slate-300">{p.observaciones}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="px-4 pb-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export default function HistorialPrestamos({ prestamos, canManage }: Props) {
  if (prestamos.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 italic">
        No hay préstamos externos registrados para este plano.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {prestamos.map((p) => (
        <PrestamoCard key={p.id} p={p} canManage={canManage} />
      ))}
    </div>
  );
}
