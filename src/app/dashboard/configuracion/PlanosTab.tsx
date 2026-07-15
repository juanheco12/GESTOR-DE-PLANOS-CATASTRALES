"use client";

import { useEffect, useState } from "react";
import { Trash2, RefreshCw, Search, RotateCcw, ExternalLink } from "lucide-react";
import Link from "next/link";

const ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE:         "Disponible",
  PRESTADO:           "Prestado",
  ARCHIVADO:          "Archivado",
  PENDIENTE_REVISION: "Pendiente revisión",
};

const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PRESTADO:           "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ARCHIVADO:          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  PENDIENTE_REVISION: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const FILTER_OPTIONS = [
  { value: "ALL",                label: "Todos los estados" },
  { value: "PENDIENTE_REVISION", label: "Pendiente revisión" },
  { value: "PRESTADO",           label: "Prestado" },
  { value: "ARCHIVADO",          label: "Archivado" },
  { value: "DISPONIBLE",         label: "Disponible" },
];

type Plan = {
  id: string;
  radicado: string;
  predial: string | null;
  propietario: string | null;
  estado: string;
  fechaIngreso: string;
  _count: { requests: number };
};

export default function PlanosTab() {
  const [planes,      setPlanes]      = useState<Plan[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("PENDIENTE_REVISION");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estadoFiltro !== "ALL") params.set("estado", estadoFiltro);
      params.set("adminView", "1");
      const res = await fetch(`/api/admin/planos?${params}`);
      if (res.ok) setPlanes(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [estadoFiltro]);

  const handleRestore = async (plan: Plan) => {
    if (!confirm(`¿Restaurar el plano ${plan.radicado} a estado "Disponible"?`)) return;
    setRestoringId(plan.id);
    try {
      const res = await fetch(`/api/admin/planos/${plan.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ estado: "DISPONIBLE" }),
      });
      if (!res.ok) throw new Error();
      setPlanes((prev) => prev.map((p) => p.id === plan.id ? { ...p, estado: "DISPONIBLE" } : p));
    } catch {
      alert("No se pudo restaurar el plano.");
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`⚠️ ¿ELIMINAR el plano ${plan.radicado} de forma permanente? Esto elimina también su historial y solicitudes. Esta acción no se puede deshacer.`)) return;
    setDeletingId(plan.id);
    try {
      const res = await fetch(`/api/planos/${plan.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPlanes((prev) => prev.filter((p) => p.id !== plan.id));
    } catch {
      alert("No se pudo eliminar el plano.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = planes.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.radicado.toLowerCase().includes(q) ||
      (p.predial ?? "").toLowerCase().includes(q) ||
      (p.propietario ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Gestión de Planos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Restaura, elimina o consulta planos sin importar su estado actual.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        {/* Estado filter */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setEstadoFiltro(opt.value)}
              className={`px-3 py-2 font-medium transition-colors ${
                estadoFiltro === opt.value
                  ? "bg-teal-700 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por radicado, predial o propietario…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Cargando planos…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">
          {search ? "Sin resultados para esa búsqueda." : "No hay planos en este estado."}
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Radicado</th>
                <th className="px-4 py-3 font-medium">Predial / Propietario</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha ingreso</th>
                <th className="px-4 py-3 font-medium">Solicitudes</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filtered.map((plan) => {
                const isBusy = restoringId === plan.id || deletingId === plan.id;
                return (
                  <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{plan.radicado}</p>
                    </td>
                    <td className="px-4 py-3">
                      {plan.predial && <p className="text-xs text-slate-500">{plan.predial}</p>}
                      {plan.propietario && <p>{plan.propietario}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[plan.estado] ?? "bg-slate-100 text-slate-700"}`}>
                        {ESTADO_LABELS[plan.estado] ?? plan.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(plan.fechaIngreso).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-slate-500">{plan._count.requests}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* View detail */}
                        <Link
                          href={`/dashboard/buscar/${plan.id}`}
                          title="Ver detalle"
                          target="_blank"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/20 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>

                        {/* Restore to DISPONIBLE */}
                        {plan.estado !== "DISPONIBLE" && (
                          <button
                            onClick={() => handleRestore(plan)}
                            disabled={isBusy}
                            title="Restaurar a disponible"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40"
                          >
                            {restoringId === plan.id ? (
                              <span className="h-4 w-4 block border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {/* Delete permanently */}
                        <button
                          onClick={() => handleDelete(plan)}
                          disabled={isBusy}
                          title="Eliminar plano permanentemente"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                        >
                          {deletingId === plan.id ? (
                            <span className="h-4 w-4 block border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Total: {planes.length} plano{planes.length !== 1 ? "s" : ""} · Mostrando: {filtered.length}
      </p>

    </div>
  );
}
