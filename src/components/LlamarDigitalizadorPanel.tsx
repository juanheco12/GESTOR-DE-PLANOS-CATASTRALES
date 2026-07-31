"use client";

import { useEffect, useState } from "react";
import {
  BellRing, X, Plus, FileText, Check, XCircle,
  Clock, Loader2, UserCheck,
} from "lucide-react";

interface Llamado {
  id:           string;
  radicado:     string;
  fmi:          string | null;
  nota:         string | null;
  estado:       "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO";
  createdAt:    string;
  tomadoEn:     string | null;
  finalizadoEn: string | null;
  digitalizador: { name: string | null; email: string | null } | null;
  verificacion:  { id: string; cumple: boolean; observaciones: string | null } | null;
}

const ESTADO_LABEL: Record<Llamado["estado"], string> = {
  PENDIENTE:  "Esperando al digitalizador",
  EN_PROCESO: "En revisión",
  COMPLETADO: "Verificado",
  CANCELADO:  "Cancelado",
};

const ESTADO_STYLE: Record<Llamado["estado"], string> = {
  PENDIENTE:  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  EN_PROCESO: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  COMPLETADO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELADO:  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });

export default function LlamarDigitalizadorPanel() {
  const [open,     setOpen]     = useState(false);
  const [tab,      setTab]      = useState<"nuevo" | "historial">("nuevo");
  const [llamados, setLlamados] = useState<Llamado[]>([]);
  const [loading,  setLoading]  = useState(false);

  const [radicado, setRadicado] = useState("");
  const [fmi,      setFmi]      = useState("");
  const [nota,     setNota]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  // Cuántos llamados propios siguen abiertos — se muestra en el botón flotante
  const [abiertos, setAbiertos] = useState(0);

  const cargar = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/llamados");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLlamados(data);
        setAbiertos(data.filter((l: Llamado) => l.estado === "PENDIENTE" || l.estado === "EN_PROCESO").length);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sondeo del contador mientras el panel está cerrado
  useEffect(() => {
    const contar = async () => {
      try {
        const res  = await fetch("/api/llamados");
        const data = await res.json();
        if (Array.isArray(data)) {
          setAbiertos(data.filter((l: Llamado) => l.estado === "PENDIENTE" || l.estado === "EN_PROCESO").length);
        }
      } catch { /* silencioso: el badge se refresca en el siguiente ciclo */ }
    };
    contar();
    const t = setInterval(contar, 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open && tab === "historial") cargar();
  }, [open, tab]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!radicado.trim()) { setError("El número de radicado es requerido"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/llamados", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ radicado: radicado.trim(), fmi: fmi.trim(), nota: nota.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar el llamado");

      setSuccess(true);
      setAbiertos((n) => n + 1);
      setTimeout(() => {
        setRadicado(""); setFmi(""); setNota("");
        setSuccess(false);
      }, 2200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelar = async (id: string) => {
    if (!confirm("¿Cancelar este llamado?")) return;
    const res = await fetch(`/api/llamados/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ accion: "cancelar" }),
    });
    if (res.ok) cargar();
    else alert((await res.json()).error ?? "No se pudo cancelar");
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-colors";

  return (
    <>
      {/* ── Botón flotante ── */}
      <button
        onClick={() => { setOpen(true); setTab("nuevo"); }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center"
        title="Llamar al digitalizador"
        aria-label="Llamar al digitalizador"
      >
        <BellRing className="h-6 w-6" />
        {abiertos > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-slate-950">
            {abiertos}
          </span>
        )}
      </button>

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Llamar al Digitalizador
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
              {(["nuevo", "historial"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === t
                      ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {t === "nuevo" ? <Plus className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  {t === "nuevo" ? "Nuevo Llamado" : "Mis Llamados"}
                </button>
              ))}
            </div>

            {/* ── TAB: Nuevo llamado ── */}
            {tab === "nuevo" && (
              <form onSubmit={enviar} className="flex-1 overflow-y-auto p-5 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  El digitalizador recibirá una notificación con este llamado. Quedará registrada
                  la fecha y hora en que lo solicitaste y en que fue atendido.
                </p>

                {error && (
                  <p className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" /> Llamado enviado al digitalizador
                  </p>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Número de Radicado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={radicado}
                    onChange={(e) => setRadicado(e.target.value)}
                    placeholder="Ej: 2025-0123"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    FMI <span className="text-slate-400 text-xs font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={fmi}
                    onChange={(e) => setFmi(e.target.value)}
                    placeholder="Ej: 060-123456"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nota <span className="text-slate-400 text-xs font-normal">(opcional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Ej: El usuario está esperando en ventanilla 2"
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving || success}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <BellRing className="h-4 w-4" />}
                  {saving ? "Enviando…" : success ? "¡Enviado!" : "Llamar al Digitalizador"}
                </button>
              </form>
            )}

            {/* ── TAB: Mis llamados ── */}
            {tab === "historial" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                {loading ? (
                  <div className="py-10 text-center text-sm text-slate-400">Cargando…</div>
                ) : llamados.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    Todavía no has hecho ningún llamado.
                  </div>
                ) : (
                  llamados.map((l) => (
                    <div
                      key={l.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${ESTADO_STYLE[l.estado]}`}>
                          {ESTADO_LABEL[l.estado]}
                        </span>
                        {(l.estado === "PENDIENTE" || l.estado === "EN_PROCESO") && (
                          <button
                            onClick={() => cancelar(l.id)}
                            className="text-xs text-slate-400 hover:text-red-500 hover:underline shrink-0"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Radicado: {l.radicado}
                      </p>
                      {l.fmi && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">FMI: {l.fmi}</p>
                      )}
                      {l.nota && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">{l.nota}</p>
                      )}

                      {/* Línea de tiempo */}
                      <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          Llamado: {fechaHora(l.createdAt)}
                        </p>
                        {l.tomadoEn && (
                          <p className="flex items-center gap-1.5">
                            <UserCheck className="h-3 w-3 shrink-0" />
                            Tomado por {l.digitalizador?.name ?? "digitalizador"}: {fechaHora(l.tomadoEn)}
                          </p>
                        )}
                        {l.finalizadoEn && l.estado === "COMPLETADO" && (
                          <p className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 shrink-0" />
                            Finalizado: {fechaHora(l.finalizadoEn)}
                          </p>
                        )}
                      </div>

                      {/* Resultado */}
                      {l.verificacion && (
                        <div
                          className={`mt-2.5 p-2.5 rounded-lg text-xs ${
                            l.verificacion.cumple
                              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300"
                              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                          }`}
                        >
                          <p className="font-bold flex items-center gap-1">
                            {l.verificacion.cumple
                              ? <><Check className="h-3.5 w-3.5" /> PROCEDE</>
                              : <><XCircle className="h-3.5 w-3.5" /> NO PROCEDE</>}
                          </p>
                          {l.verificacion.observaciones && (
                            <p className="mt-1 leading-snug">{l.verificacion.observaciones}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
