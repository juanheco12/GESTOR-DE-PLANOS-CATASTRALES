"use client";

import { useState } from "react";
import { Download, DatabaseBackup, ShieldCheck } from "lucide-react";

export default function BackupTab() {
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/backup");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const cd   = res.headers.get("Content-Disposition") ?? "";
      const name = cd.match(/filename="(.+?)"/)?.[1] ?? "backup-catastro.json";
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error al generar el respaldo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Respaldo de Datos</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Descarga una copia completa de todos los planos, historial, solicitudes y usuarios del sistema.
        </p>
      </div>

      {/* Tarjeta de respaldo manual */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="p-3 rounded-xl bg-marca-50 dark:bg-marca-900/30 shrink-0">
          <DatabaseBackup className="h-7 w-7 text-marca-700 dark:text-marca-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Respaldo completo del sistema</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Exporta todos los datos en formato JSON: planos, historial de movimientos, solicitudes, usuarios y receptores.
            Guarda el archivo en Google Drive, USB o correo electrónico.
          </p>
        </div>
        <button
          onClick={handleBackup}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-marca-700 hover:bg-marca-800 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {loading ? "Generando..." : "Descargar respaldo"}
        </button>
      </div>

      {/* Info sobre Neon */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5 flex gap-4">
        <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">Respaldo automático en la nube</p>
          <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
            La base de datos (Neon PostgreSQL) hace snapshots automáticos diarios y los conserva por varios días.
            Se puede restaurar desde la consola de Neon en caso de pérdida de datos.
            El respaldo manual de arriba complementa esta protección y te da acceso offline a tus datos.
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 font-medium">
            Recomendación: descarga un respaldo manual cada semana y guárdalo en un lugar seguro.
          </p>
        </div>
      </div>
    </div>
  );
}
