"use client";

import { useState } from "react";
import { Download, BarChart3 } from "lucide-react";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export default function ReporteTab() {
  const now   = new Date();
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/reporte?month=${month}&year=${year}`);
      if (!res.ok) { alert("Error al generar el reporte"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const cd   = res.headers.get("Content-Disposition") ?? "";
      const name = cd.match(/filename="(.+?)"/)?.[1] ?? `reporte-${month}-${year}.csv`;
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error al generar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reporte Mensual de Actividad</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Genera un resumen completo de los movimientos de cualquier mes: planos registrados, préstamos, devoluciones y actividad por usuario.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30">
            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Selecciona el período</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">El reporte se descarga en Excel (.csv)</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Mes</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Año</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {loading ? "Generando..." : `Descargar reporte — ${MESES[month - 1]} ${year}`}
          </button>
        </div>

        {/* Qué incluye */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">El reporte incluye:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[
              "Resumen general del mes",
              "Total planos registrados",
              "Total solicitudes y entregas",
              "Total devoluciones",
              "Actividad desglosada por usuario",
              "Lista completa de planos del mes",
              "Historial de movimientos cronológico",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
