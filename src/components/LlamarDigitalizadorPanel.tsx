"use client";

import { useEffect, useState } from "react";
import {
  ClipboardCheck, X, Plus, FileText, Check, XCircle,
  Clock, Loader2, UserCheck, Trash2, Pencil, LogIn, FilePlus2,
} from "lucide-react";

interface Receptor { id: string; name: string }

interface Llamado {
  id:                string;
  radicado:          string | null;
  fmi:               string | null;
  nota:              string | null;
  formato:           string | null;
  esDerechoPeticion: boolean;
  estado:            "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO";
  createdAt:         string;
  tomadoEn:          string | null;
  finalizadoEn:      string | null;
  solicitante:   { name: string | null; email: string | null } | null;
  digitalizador: { name: string | null; email: string | null } | null;
  verificacion:  { id: string; cumple: boolean; observaciones: string | null } | null;
}

const FORMATO_OPTIONS = [
  { value: "FISICO", label: "Físico (Plano impreso)" },
  { value: "CD",     label: "CD" },
  { value: "USB",    label: "USB" },
  { value: "OTRO",   label: "Otro Formato" },
];

const ESTADO_OPTIONS = [
  { value: "PENDIENTE",  label: "Pendiente" },
  { value: "EN_PROCESO", label: "En revisión" },
  { value: "COMPLETADO", label: "Verificado" },
  { value: "CANCELADO",  label: "Cancelado" },
];

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

// Cuánto tardó el digitalizador entre tomar el plano y cerrarlo
function duracion(l: Llamado): string | null {
  if (!l.tomadoEn || !l.finalizadoEn) return null;
  const ms = new Date(l.finalizadoEn).getTime() - new Date(l.tomadoEn).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const min = Math.round(ms / 60000);
  if (min < 1)  return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const formatoLabel = (v: string | null) =>
  FORMATO_OPTIONS.find((f) => f.value === v)?.label ?? v ?? null;

export default function LlamarDigitalizadorPanel({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open,     setOpen]     = useState(false);
  const [tab,      setTab]      = useState<"nuevo" | "historial">("nuevo");
  const [llamados, setLlamados] = useState<Llamado[]>([]);
  const [loading,  setLoading]  = useState(false);

  // formulario
  const [radicado, setRadicado] = useState("");
  const [fmi,      setFmi]      = useState("");
  const [nota,     setNota]     = useState("");
  const [formato,  setFormato]  = useState("");
  const [checkIn,  setCheckIn]  = useState(false);
  const [receptor, setReceptor] = useState("");
  const [receptores, setReceptores] = useState<Receptor[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);
  const [yaExistia, setYaExistia] = useState(false);

  // edición del administrador
  const [editando, setEditando] = useState<string | null>(null);
  const [edit,     setEdit]     = useState({ radicado: "", fmi: "", nota: "", formato: "", estado: "" });
  const [editErr,  setEditErr]  = useState("");
  const [guardando, setGuardando] = useState(false);

  const [abiertos, setAbiertos] = useState(0);

  const contarAbiertos = (data: Llamado[]) =>
    data.filter((l) => l.estado === "PENDIENTE" || l.estado === "EN_PROCESO").length;

  const cargar = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/llamados");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLlamados(data);
        setAbiertos(contarAbiertos(data));
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
        if (Array.isArray(data)) setAbiertos(contarAbiertos(data));
      } catch { /* silencioso: se reintenta en el siguiente ciclo */ }
    };
    contar();
    const t = setInterval(contar, 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open && tab === "historial") cargar();
  }, [open, tab]);

  // El derecho de petición registra un plano, que lleva receptor físico
  useEffect(() => {
    if (!checkIn || receptores.length > 0) return;
    fetch("/api/receivers")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setReceptores(d); })
      .catch(() => { /* el receptor es opcional; el registro no depende de esto */ });
  }, [checkIn, receptores.length]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    // Sin DP el llamado es solo un aviso al digitalizador: no exige datos.
    // Con DP sí, porque se registra un plano y el radicado lo identifica.
    if (checkIn && !radicado.trim()) {
      setError("El derecho de petición requiere el número de radicado");
      return;
    }
    if (checkIn && !formato) {
      setError("Selecciona el tipo de formato para el derecho de petición");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/llamados", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          radicado: radicado.trim(),
          fmi:      fmi.trim(),
          nota:     nota.trim(),
          formato,
          esDerechoPeticion: checkIn,
          receivedById: checkIn ? receptor || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");

      setSuccess(true);
      setYaExistia(Boolean(data.planoYaExistia));
      if (!checkIn) setAbiertos((n) => n + 1);
      setTimeout(() => {
        setRadicado(""); setFmi(""); setNota(""); setFormato("");
        setCheckIn(false); setReceptor("");
        setSuccess(false); setYaExistia(false);
      }, 2800);
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

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este registro definitivamente? No se puede deshacer.")) return;
    const res = await fetch(`/api/llamados/${id}`, { method: "DELETE" });
    if (res.ok) setLlamados((prev) => prev.filter((l) => l.id !== id));
    else alert((await res.json()).error ?? "No se pudo eliminar");
  };

  const abrirEdicion = (l: Llamado) => {
    setEditando(editando === l.id ? null : l.id);
    setEdit({
      radicado: l.radicado ?? "",
      fmi:      l.fmi ?? "",
      nota:     l.nota ?? "",
      formato:  l.formato ?? "",
      estado:   l.estado,
    });
    setEditErr("");
  };

  const guardarEdicion = async (id: string) => {
    setGuardando(true);
    setEditErr("");
    try {
      const res = await fetch(`/api/llamados/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ accion: "editar", ...edit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setLlamados((prev) => prev.map((l) => (l.id === id ? data : l)));
      setEditando(null);
    } catch (err: any) {
      setEditErr(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-colors";
  const miniInput =
    "w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100";

  return (
    <>
      {/* ── Botón flotante ── */}
      <button
        onClick={() => { setOpen(true); setTab("nuevo"); }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center"
        title="Verificación de plano"
        aria-label="Verificación de plano"
      >
        <ClipboardCheck className="h-6 w-6" />
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
                <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Verificación de Plano
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
                  {t === "nuevo" ? "Nueva Solicitud" : isAdmin ? "Todos los Registros" : "Mis Solicitudes"}
                </button>
              ))}
            </div>

            {/* ── TAB: Nueva solicitud ── */}
            {tab === "nuevo" && (
              <form onSubmit={enviar} className="flex-1 overflow-y-auto p-5 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  Queda registrada la fecha y hora en que lo solicitaste, en que el
                  digitalizador lo tomó y cuánto tardó en revisarlo.
                </p>

                {error && (
                  <p className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
                    {error}
                  </p>
                )}
                {success && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg border border-emerald-100 dark:border-emerald-800">
                    <p className="flex items-center gap-2 font-medium">
                      <Check className="h-4 w-4 shrink-0" />
                      {checkIn ? "Derecho de petición registrado" : "Solicitud enviada al digitalizador"}
                    </p>
                    {checkIn && (
                      <p className="text-xs mt-1 leading-snug">
                        {yaExistia
                          ? "Ya existía un plano con ese radicado; se enlazó al existente."
                          : "El plano quedó registrado en el sistema como Derecho de Petición."}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Número de Radicado{" "}
                    {checkIn
                      ? <span className="text-red-500">*</span>
                      : <span className="text-slate-400 text-xs font-normal">(opcional)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={radicado}
                      onChange={(e) => setRadicado(e.target.value)}
                      placeholder="Ej: 2025-0123"
                      className={`${inputClass} pr-14 ${checkIn ? "border-purple-500 dark:border-purple-500" : ""}`}
                    />
                    {/* Check-in de derecho de petición: el digitalizador no está */}
                    <button
                      type="button"
                      onClick={() => setCheckIn(!checkIn)}
                      title={
                        checkIn
                          ? "Derecho de petición activo — toca para quitarlo"
                          : "Registrar como derecho de petición (el digitalizador no está)"
                      }
                      aria-pressed={checkIn}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide transition-colors ${
                        checkIn
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                      }`}
                    >
                      DP
                    </button>
                  </div>
                  <p className={`text-[11px] mt-1 leading-snug ${
                    checkIn ? "text-purple-600 dark:text-purple-400" : "text-slate-400"
                  }`}>
                    {checkIn
                      ? "Se registra como plano en el sistema, con trámite Derecho de Petición."
                      : "Toca DP si el digitalizador no está y entra como derecho de petición."}
                  </p>
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
                    Tipo de Formato
                    {checkIn
                      ? <span className="text-red-500 ml-1">*</span>
                      : <span className="text-slate-400 text-xs font-normal ml-1">(opcional)</span>}
                  </label>
                  <select
                    value={formato}
                    onChange={(e) => setFormato(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seleccione</option>
                    {FORMATO_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* El derecho de petición crea un plano, que lleva receptor físico */}
                {checkIn && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Recibido por <span className="text-slate-400 text-xs font-normal">(opcional)</span>
                    </label>
                    <select
                      value={receptor}
                      onChange={(e) => setReceptor(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Sin asignar</option>
                      {receptores.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}

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
                  className={`w-full py-3 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
                    checkIn ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {saving
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : checkIn ? <FilePlus2 className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
                  {saving
                    ? "Guardando…"
                    : success
                      ? "¡Listo!"
                      : checkIn ? "Registrar Derecho de Petición" : "Solicitar Verificación"}
                </button>
              </form>
            )}

            {/* ── TAB: Historial ── */}
            {tab === "historial" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                {loading ? (
                  <div className="py-10 text-center text-sm text-slate-400">Cargando…</div>
                ) : llamados.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    Todavía no hay registros.
                  </div>
                ) : (
                  llamados.map((l) => (
                    <div
                      key={l.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${ESTADO_STYLE[l.estado]}`}>
                            {ESTADO_LABEL[l.estado]}
                          </span>
                          {l.esDerechoPeticion && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                              <LogIn className="h-3 w-3" /> Derecho de Petición
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(l.estado === "PENDIENTE" || l.estado === "EN_PROCESO") && (
                            <button
                              onClick={() => cancelar(l.id)}
                              className="text-xs text-slate-400 hover:text-red-500 hover:underline"
                            >
                              Cancelar
                            </button>
                          )}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => abrirEdicion(l)}
                                className="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => eliminar(l.id)}
                                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {l.radicado ? `Radicado: ${l.radicado}` : l.fmi ? `FMI: ${l.fmi}` : "Sin identificar"}
                      </p>
                      {l.radicado && l.fmi && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">FMI: {l.fmi}</p>
                      )}
                      {l.formato && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Formato: {formatoLabel(l.formato)}
                        </p>
                      )}
                      {isAdmin && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Solicitó: {l.solicitante?.name ?? l.solicitante?.email ?? "—"}
                        </p>
                      )}
                      {l.nota && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">{l.nota}</p>
                      )}

                      {/* Línea de tiempo */}
                      <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          Registrado: {fechaHora(l.createdAt)}
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
                            {duracion(l) && (
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                · tardó {duracion(l)}
                              </span>
                            )}
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

                      {/* Edición del administrador */}
                      {isAdmin && editando === l.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">Radicado</label>
                              <input
                                value={edit.radicado}
                                onChange={(e) => setEdit({ ...edit, radicado: e.target.value })}
                                className={miniInput}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">FMI</label>
                              <input
                                value={edit.fmi}
                                onChange={(e) => setEdit({ ...edit, fmi: e.target.value })}
                                className={miniInput}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">Formato</label>
                              <select
                                value={edit.formato}
                                onChange={(e) => setEdit({ ...edit, formato: e.target.value })}
                                className={miniInput}
                              >
                                <option value="">Sin formato</option>
                                {FORMATO_OPTIONS.map((f) => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">Estado</label>
                              <select
                                value={edit.estado}
                                onChange={(e) => setEdit({ ...edit, estado: e.target.value })}
                                className={miniInput}
                              >
                                {ESTADO_OPTIONS.map((s) => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1">Nota</label>
                            <input
                              value={edit.nota}
                              onChange={(e) => setEdit({ ...edit, nota: e.target.value })}
                              className={miniInput}
                            />
                          </div>
                          {editErr && <p className="text-[11px] text-red-500">{editErr}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => guardarEdicion(l.id)}
                              disabled={guardando}
                              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                            >
                              {guardando ? "Guardando…" : "Guardar cambios"}
                            </button>
                            <button
                              onClick={() => setEditando(null)}
                              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                              Cancelar
                            </button>
                          </div>
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
