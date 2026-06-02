"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, BookOpen, User, Building2, Briefcase, FileText, Phone, MessageSquare, Loader2 } from "lucide-react";

interface Props {
  planId:   string;
  radicado: string;
  userName: string;
}

const ENTIDADES = [
  "Secretaría de Planeación",
  "Secretaría de Gobierno",
  "Secretaría de Infraestructura",
  "Alcaldía Municipal",
  "Notaría",
  "Juzgado",
  "Otra entidad",
];

export default function RegistrarPrestamoModal({ planId, radicado, userName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombreReceptor: "",
    entidad:        "Secretaría de Planeación",
    cargo:          "",
    motivo:         "",
    telefono:       "",
    observaciones:  "",
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.nombreReceptor.trim() || !form.cargo.trim() || !form.motivo.trim()) {
      setError("Complete todos los campos obligatorios.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/prestamos", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ planId, ...form }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al registrar préstamo");
        setOpen(false);
        setForm({ nombreReceptor: "", entidad: "Secretaría de Planeación", cargo: "", motivo: "", telefono: "", observaciones: "" });
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
      >
        <BookOpen className="mr-2 h-4 w-4" />
        Registrar Préstamo
      </button>

      {/* Backdrop + Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isPending && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Registrar Préstamo Externo</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Plano <span className="font-medium">{radicado}</span></p>
              </div>
              <button
                onClick={() => !isPending && setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Autocompletados (informativos) */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span>Entrega: <strong className="text-slate-700 dark:text-slate-300">{userName}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Fecha: <strong className="text-slate-700 dark:text-slate-300">{new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}</strong></span>
                </div>
              </div>

              {/* Nombre receptor */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-red-500">*</span> Nombre completo del receptor
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={form.nombreReceptor}
                    onChange={set("nombreReceptor")}
                    required
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Entidad */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-red-500">*</span> Entidad o dependencia
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={form.entidad}
                    onChange={set("entidad")}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {ENTIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                {form.entidad === "Otra entidad" && (
                  <input
                    type="text"
                    placeholder="Especifica la entidad…"
                    className="mt-2 w-full px-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    onChange={(e) => setForm((prev) => ({ ...prev, entidad: e.target.value }))}
                  />
                )}
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-red-500">*</span> Cargo del solicitante
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ej. Revisor de Planeación"
                    value={form.cargo}
                    onChange={set("cargo")}
                    required
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-red-500">*</span> Motivo del préstamo
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    rows={2}
                    placeholder="Ej. Revisión técnica para proceso de mutación…"
                    value={form.motivo}
                    onChange={set("motivo")}
                    required
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
              </div>

              {/* Teléfono (opcional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Número de contacto <span className="text-xs text-slate-400">(opcional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Ej. 3001234567"
                    value={form.telefono}
                    onChange={set("telefono")}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Observaciones (opcional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones adicionales <span className="text-xs text-slate-400">(opcional)</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    rows={2}
                    placeholder="Alguna nota adicional…"
                    value={form.observaciones}
                    onChange={set("observaciones")}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}

              {/* Actions */}
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
                  className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                  {isPending ? "Registrando…" : "Registrar Préstamo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
