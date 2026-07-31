"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClipboardCheck, X, Plus, FileText, Check, XCircle,
  Trash2, Download, Upload, ImageIcon,
} from "lucide-react";

interface Verificacion {
  id:            string;
  fmi:           string;
  radicado:      string;
  cumple:        boolean;
  observaciones: string | null;
  imagenNombre:  string | null;
  createdAt:     string;
}

// ────────────────────────────────────────────────────────────
// PDF Report generation (opens new window, triggers print)
// ────────────────────────────────────────────────────────────
function buildReportHTML(verifs: Verificacion[], userName: string): string {
  const now = new Date().toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const total      = verifs.length;
  const proceden   = verifs.filter((v) => v.cumple).length;
  const noProceden = total - proceden;

  const rows = verifs.map((v) => `
    <tr>
      <td>${new Date(v.createdAt).toLocaleDateString("es-CO", {
        timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric",
      })}</td>
      <td>${escHtml(v.fmi)}</td>
      <td>${escHtml(v.radicado)}</td>
      <td class="${v.cumple ? "cumple" : "nocumple"}">${v.cumple ? "✔ PROCEDE" : "✘ NO PROCEDE"}</td>
      <td>${escHtml(v.observaciones ?? "—")}</td>
      <td>${v.imagenNombre ? `📎 ${escHtml(v.imagenNombre)}` : "—"}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte de Verificaciones</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:28px}
    header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;border-bottom:2px solid #0f766e;padding-bottom:10px}
    h1{font-size:15px;color:#0f766e}
    .meta{font-size:9px;color:#64748b;margin-top:2px}
    .stats{display:flex;gap:12px;margin-bottom:14px}
    .stat{padding:8px 18px;border-radius:6px;text-align:center;min-width:70px}
    .stat.total{background:#f1f5f9}
    .stat.si{background:#dcfce7;color:#15803d}
    .stat.no{background:#fee2e2;color:#b91c1c}
    .stat .num{font-size:22px;font-weight:700;line-height:1.1}
    .stat .lbl{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{background:#0f766e;color:#fff;padding:6px 8px;text-align:left;font-size:9.5px;font-weight:600}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:10px}
    tr:nth-child(even) td{background:#f8fafc}
    .cumple{color:#15803d;font-weight:700}
    .nocumple{color:#b91c1c;font-weight:700}
    footer{margin-top:14px;font-size:9px;color:#94a3b8;text-align:center}
    @media print{@page{margin:15mm}body{padding:0}}
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Reporte de Verificaciones de Planos</h1>
      <p class="meta">Digitalizador: ${escHtml(userName)} &nbsp;·&nbsp; Generado: ${now}</p>
    </div>
    <img src="" alt="" style="height:36px;opacity:.15"/>
  </header>

  <div class="stats">
    <div class="stat total"><div class="num">${total}</div><div class="lbl">Total</div></div>
    <div class="stat si"><div class="num">${proceden}</div><div class="lbl">Proceden</div></div>
    <div class="stat no"><div class="num">${noProceden}</div><div class="lbl">No proceden</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Fecha</th><th>FMI</th><th>Radicado</th>
        <th>Resultado</th><th>Observaciones</th><th>Adjunto</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:12px">Sin registros</td></tr>'}
    </tbody>
  </table>

  <footer>Sistema de Gestión de Planos Catastrales — Municipio de Montería</footer>
  <script>window.onload=()=>{window.print()}</script>
</body>
</html>`;
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
export default function VerificacionPanel({ userName }: { userName: string }) {
  const [open,        setOpen]        = useState(false);
  const [tab,         setTab]         = useState<"nueva" | "historial">("nueva");
  const [verifs,      setVerifs]      = useState<Verificacion[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // form
  const [fmi,          setFmi]          = useState("");
  const [radicado,     setRadicado]     = useState("");
  const [cumple,       setCumple]       = useState<boolean | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [imagen,       setImagen]       = useState<{ nombre: string; data: string } | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState("");
  const [success,      setSuccess]      = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Load list when historial tab is active
  useEffect(() => {
    if (open && tab === "historial") loadVerifs();
  }, [open, tab]);

  const loadVerifs = async () => {
    setLoadingList(true);
    try {
      const res  = await fetch("/api/verificaciones");
      const data = await res.json();
      if (Array.isArray(data)) setVerifs(data);
    } finally {
      setLoadingList(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError("El archivo no puede superar 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagen({ nombre: file.name, data: reader.result as string });
      setFormError("");
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFmi(""); setRadicado(""); setCumple(null);
    setObservaciones(""); setImagen(null);
    setFormError(""); setSuccess(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fmi.trim())     { setFormError("El FMI es requerido");             return; }
    if (!radicado.trim()){ setFormError("El número de radicado es requerido"); return; }
    if (cumple === null)  { setFormError("Seleccione si el plano procede o no"); return; }

    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/verificaciones", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fmi: fmi.trim(), radicado: radicado.trim(), cumple,
          observaciones: observaciones.trim() || null,
          imagenNombre:  imagen?.nombre || null,
          imagenData:    imagen?.data   || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error"); }
      setSuccess(true);
      setTimeout(() => resetForm(), 2200);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta verificación?")) return;
    await fetch(`/api/verificaciones/${id}`, { method: "DELETE" });
    setVerifs((prev) => prev.filter((v) => v.id !== id));
  };

  const generarReporte = () => {
    const html = buildReportHTML(verifs, userName);
    const w = window.open("", "_blank");
    if (!w) { alert("Permite las ventanas emergentes para generar el reporte."); return; }
    w.document.write(html);
    w.document.close();
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-600 outline-none transition-colors";

  return (
    <>
      {/* ── Floating Action Button ── */}
      <button
        onClick={() => { setOpen(true); setTab("nueva"); }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-teal-700 hover:bg-teal-800 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center"
        title="Verificación de planos"
        aria-label="Abrir panel de verificación"
      >
        <ClipboardCheck className="h-6 w-6" />
      </button>

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => { setOpen(false); resetForm(); }}
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-teal-700 dark:text-teal-400 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Verificación de Planos
                </h2>
              </div>
              <button
                onClick={() => { setOpen(false); resetForm(); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
              {(["nueva", "historial"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === t
                      ? "border-b-2 border-teal-700 text-teal-700 dark:text-teal-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {t === "nueva" ? <Plus className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  {t === "nueva" ? "Nueva Verificación" : "Historial"}
                </button>
              ))}
            </div>

            {/* ── TAB: Nueva Verificación ── */}
            {tab === "nueva" && (
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">

                {formError && (
                  <p className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
                    {formError}
                  </p>
                )}
                {success && (
                  <p className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" /> Verificación guardada correctamente
                  </p>
                )}

                {/* FMI */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    FMI <span className="text-slate-400 text-xs font-normal">(Folio de Matrícula Inmobiliaria)</span>
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={fmi}
                    onChange={(e) => setFmi(e.target.value)}
                    placeholder="Ej: 060-123456"
                    className={inputClass}
                  />
                </div>

                {/* Radicado */}
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

                {/* Resultado */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Resultado de la revisión <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCumple(true)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        cumple === true
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-300"
                      }`}
                    >
                      <Check className="h-4 w-4" /> PROCEDE
                    </button>
                    <button
                      type="button"
                      onClick={() => setCumple(false)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        cumple === false
                          ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-red-300"
                      }`}
                    >
                      <XCircle className="h-4 w-4" /> NO PROCEDE
                    </button>
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Observaciones
                    {cumple === false && <span className="text-xs text-red-500 ml-1">— describa qué hace falta</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder={
                      cumple === false
                        ? "Ej: Falta firma del profesional, área no coincide con plano..."
                        : "Observaciones adicionales (opcional)"
                    }
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Imagen */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Imagen del plano
                    <span className="text-slate-400 text-xs font-normal ml-1">(PDF, JPG, PNG — máx. 2 MB)</span>
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:border-teal-400 dark:hover:border-teal-600 transition-colors bg-slate-50 dark:bg-slate-800/40"
                  >
                    {imagen ? (
                      <>
                        <ImageIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center break-all">{imagen.nombre}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setImagen(null); if (fileRef.current) fileRef.current.value = ""; }}
                          className="text-xs text-red-500 hover:text-red-700 underline"
                        >
                          Quitar archivo
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-slate-400" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">Toca para adjuntar un archivo</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFile}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={saving || success}
                  className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving
                    ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check className="h-4 w-4" />}
                  {saving ? "Guardando…" : success ? "¡Guardado!" : "Guardar Verificación"}
                </button>
              </form>
            )}

            {/* ── TAB: Historial ── */}
            {tab === "historial" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {verifs.length} registro{verifs.length !== 1 ? "s" : ""}
                  </p>
                  <button
                    onClick={generarReporte}
                    disabled={verifs.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" /> Generar Reporte PDF
                  </button>
                </div>

                {loadingList ? (
                  <div className="py-10 text-center text-sm text-slate-400">Cargando…</div>
                ) : verifs.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    No hay verificaciones registradas aún.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {verifs.map((v) => (
                      <div
                        key={v.id}
                        className={`p-3.5 rounded-xl border ${
                          v.cumple
                            ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
                            : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                  v.cumple
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                                }`}
                              >
                                {v.cumple ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {v.cumple ? "PROCEDE" : "NO PROCEDE"}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {new Date(v.createdAt).toLocaleDateString("es-CO", {
                                  timeZone: "America/Bogota",
                                  day: "2-digit", month: "short", year: "numeric",
                                })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              FMI: {v.fmi}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Radicado: {v.radicado}
                            </p>
                            {v.observaciones && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                {v.observaciones}
                              </p>
                            )}
                            {v.imagenNombre && (
                              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
                                <ImageIcon className="h-3 w-3 shrink-0" />
                                {v.imagenNombre}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 mt-0.5"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
