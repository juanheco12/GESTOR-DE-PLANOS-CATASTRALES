"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Wrench, MessageSquare, Loader2 } from "lucide-react";

interface Props {
  planId: string;
  radicado: string;
  inconsistencias: string | null;
}

export default function SubsanarInconsistenciaBoton({ planId, radicado, inconsistencias }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [novedad, setNovedad] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!novedad.trim()) {
      setError("Describe la novedad antes de continuar.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/planos/${planId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ novedad }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al subsanar la inconsistencia");
        setOpen(false);
        setNovedad("");
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
      >
        <Wrench className="mr-2 h-4 w-4" />
        Subsanar inconsistencia
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isPending && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Subsanar Inconsistencia</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Plano <span className="font-medium">{radicado}</span></p>
              </div>
              <button
                onClick={() => !isPending && setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {inconsistencias && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium mb-0.5">Inconsistencia detectada previamente:</p>
                  <p>{inconsistencias}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-red-500">*</span> Novedad: trajeron un nuevo plano para subsanar
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    rows={3}
                    placeholder="Describe qué nuevo plano se trajo y cómo subsana la inconsistencia…"
                    value={novedad}
                    onChange={(e) => setNovedad(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !isPending && setOpen(false)}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                  {isPending ? "Guardando…" : "Registrar subsanación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
