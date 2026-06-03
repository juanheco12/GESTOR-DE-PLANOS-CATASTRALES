"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, X } from "lucide-react";

const inputClass =
  "w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-600 outline-none";

export default function FilterPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    query:      searchParams.get("query")      ?? "",
    radicado:   searchParams.get("radicado")   ?? "",
    predial:    searchParams.get("predial")    ?? "",
    estado:     searchParams.get("estado")     ?? "",
    profesional: searchParams.get("profesional") ?? "",
    mutacion:   searchParams.get("mutacion")   ?? "",
    formato:    searchParams.get("formato")    ?? "",
    fechaDesde: searchParams.get("fechaDesde") ?? "",
    fechaHasta: searchParams.get("fechaHasta") ?? "",
  });

  const [showAdvanced, setShowAdvanced] = useState(
    ["radicado", "predial", "estado", "profesional", "mutacion", "formato", "fechaDesde", "fechaHasta"]
      .some((k) => !!searchParams.get(k))
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "predial") {
      setFilters({ ...filters, predial: value.replace(/\D/g, "").slice(0, 30) });
      return;
    }
    setFilters({ ...filters, [name]: value });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, v);
    }
    router.push(`/dashboard/buscar?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      query: "", radicado: "", predial: "", estado: "",
      profesional: "", mutacion: "", formato: "", fechaDesde: "", fechaHasta: "",
    });
    router.push("/dashboard/buscar");
  };

  const advancedActive = ["radicado", "predial", "estado", "profesional", "mutacion", "formato", "fechaDesde", "fechaHasta"]
    .some((k) => !!(filters as any)[k]);

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
      <form onSubmit={handleSearch} className="p-4" autoComplete="off">
        {/* Barra principal */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="query"
              value={filters.query}
              onChange={handleChange}
              placeholder="Búsqueda rápida — propietario, radicado o predial..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-600 outline-none text-sm dark:text-slate-100 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 border rounded-lg font-medium text-sm transition-colors ${
              showAdvanced
                ? "bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-400"
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtros avanzados
            {advancedActive && (
              <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
            )}
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Buscar
          </button>
        </div>

        {/* Filtros avanzados */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Número de Radicado</label>
              <input type="text" name="radicado" value={filters.radicado} onChange={handleChange} placeholder="Ej: 2024-001" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Número Predial</label>
              <input type="text" name="predial" inputMode="numeric" maxLength={30} value={filters.predial} onChange={handleChange} placeholder="30 dígitos" className={`${inputClass} font-mono`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
              <select name="estado" value={filters.estado} onChange={handleChange} className={inputClass}>
                <option value="">Todos</option>
                <option value="DISPONIBLE">Disponible</option>
                <option value="PRESTADO">Prestado</option>
                <option value="ARCHIVADO">Archivado</option>
                <option value="PENDIENTE_REVISION">Pendiente revisión</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Formato</label>
              <select name="formato" value={filters.formato} onChange={handleChange} className={inputClass}>
                <option value="">Todos</option>
                <option value="FISICO">Físico (Plano impreso)</option>
                <option value="CD">CD</option>
                <option value="USB">USB</option>
                <option value="OTRO">Otro Formato</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo de trámite</label>
              <input type="text" name="mutacion" value={filters.mutacion} onChange={handleChange} placeholder="Ej: Subdivisión" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Profesional responsable</label>
              <input type="text" name="profesional" value={filters.profesional} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha ingreso desde</label>
              <input type="date" name="fechaDesde" value={filters.fechaDesde} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha ingreso hasta</label>
              <input type="date" name="fechaHasta" value={filters.fechaHasta} onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-3 w-3" /> Limpiar todos los filtros
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
