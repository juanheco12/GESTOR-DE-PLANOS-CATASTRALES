"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ExportButton() {
  const searchParams = useSearchParams();

  const handleExport = () => {
    const params = new URLSearchParams(searchParams.toString());
    window.open(`/api/planos/export?${params.toString()}`, "_blank");
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
      title="Exportar resultados actuales a CSV (compatible con Excel)"
    >
      <Download className="h-3.5 w-3.5" />
      Exportar CSV
    </button>
  );
}
