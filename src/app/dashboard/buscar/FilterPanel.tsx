"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, X } from "lucide-react";

export default function FilterPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [filters, setFilters] = useState({
    query: searchParams.get("query") || "",
    radicado: searchParams.get("radicado") || "",
    predial: searchParams.get("predial") || "",
    estado: searchParams.get("estado") || "",
    profesional: searchParams.get("profesional") || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (filters.query) params.set("query", filters.query);
    if (filters.radicado) params.set("radicado", filters.radicado);
    if (filters.predial) params.set("predial", filters.predial);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.profesional) params.set("profesional", filters.profesional);

    router.push(`/dashboard/buscar?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({ query: "", radicado: "", predial: "", estado: "", profesional: "" });
    router.push(`/dashboard/buscar`);
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
      <form onSubmit={handleSearch} className="p-4" autoComplete="off">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              name="query"
              value={filters.query}
              onChange={handleChange}
              placeholder="Búsqueda rápida (Propietario o Radicado)..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm dark:text-slate-100 transition-colors"
            />
          </div>
          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center justify-center px-4 py-2 border rounded-lg font-medium text-sm transition-colors ${
              showAdvanced 
                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400" 
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Filter className="mr-2 h-4 w-4" />
            Más filtros
          </button>
          <button 
            type="submit"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Buscar
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Número de Radicado</label>
              <input type="text" name="radicado" value={filters.radicado} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Número Predial</label>
              <input type="text" name="predial" value={filters.predial} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado del Plano</label>
              <select name="estado" value={filters.estado} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                <option value="">Todos</option>
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="PRESTADO">PRESTADO</option>
                <option value="ARCHIVADO">ARCHIVADO</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Profesional Resp.</label>
              <input type="text" name="profesional" value={filters.profesional} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button 
                type="button" 
                onClick={clearFilters}
                className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X className="mr-1 h-3 w-3" /> Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
