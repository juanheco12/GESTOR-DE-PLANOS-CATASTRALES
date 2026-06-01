"use client";

import { useEffect, useState } from "react";
import { Trash2, RefreshCw, Search, RotateCcw } from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE:             "Pendiente",
  LISTO_PARA_ENTREGA:    "Listo para recoger",
  ENTREGADO:             "En poder del ejecutor",
  DEVOLUCION_SOLICITADA: "Devolución en proceso",
  DEVUELTO:              "Devuelto",
  RECHAZADO:             "Rechazado",
};

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:             "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  LISTO_PARA_ENTREGA:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  ENTREGADO:             "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  DEVOLUCION_SOLICITADA: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  DEVUELTO:              "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RECHAZADO:             "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const PLAN_ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE:         "Disponible",
  PRESTADO:           "Prestado",
  ARCHIVADO:          "Archivado",
  PENDIENTE_REVISION: "Pendiente revisión",
};

const PLAN_ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PRESTADO:           "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ARCHIVADO:          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  PENDIENTE_REVISION: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

type Solicitud = {
  id: string;
  estado: string;
  fechaSolicitud: string;
  plan: { id: string; radicado: string; predial: string | null; estado: string };
  user: { id: string; name: string | null; email: string | null };
};

export default function SolicitudesTab() {
  const [solicitudes,  setSolicitudes]  = useState<Solicitud[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [restoringId,  setRestoringId]  = useState<string | null>(null);
  const [search,       setSearch]       = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/solicitudes");
      if (res.ok) setSolicitudes(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (s: Solicitud) => {
    const needsRestore = s.plan.estado !== "DISPONIBLE" && s.plan.estado !== "DEVUELTO";
    const msg = needsRestore
      ? `¿Eliminar esta solicitud? El plano ${s.plan.radicado} volverá al estado "Disponible".`
      : `¿Eliminar esta solicitud de ${s.user.name ?? s.user.email}?`;
    if (!confirm(msg)) return;
    setDeletingId(s.id);
    try {
      const res = await fetch(`/api/admin/solicitudes/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSolicitudes((prev) => prev.filter((x) => x.id !== s.id));
    } catch {
      alert("No se pudo eliminar la solicitud.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestore = async (s: Solicitud) => {
    if (!confirm(`¿Restaurar el plano ${s.plan.radicado} a estado "Disponible"? La solicitud se mantiene en el historial.`)) return;
    setRestoringId(s.id);
    try {
      const res = await fetch(`/api/admin/solicitudes/${s.id}`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      // Update local state to reflect new plan estado
      setSolicitudes((prev) =>
        prev.map((x) => x.id === s.id ? { ...x, plan: { ...x.plan, estado: "DISPONIBLE" } } : x)
      );
    } catch {
      alert("No se pudo restaurar el plano.");
    } finally {
      setRestoringId(null);
    }
  };

  const filtered = solicitudes.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.plan.radicado.toLowerCase().includes(q) ||
      (s.plan.predial ?? "").toLowerCase().includes(q) ||
      (s.user.name ?? "").toLowerCase().includes(q) ||
      (s.user.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Gestión de Solicitudes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Elimina solicitudes o restaura planos a estado disponible. Al eliminar se limpia la bandeja del ejecutor.
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por radicado, predial o ejecutor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <RotateCcw className="h-3 w-3 text-blue-500" />
          Restaurar = el plano vuelve a disponible (solicitud permanece)
        </span>
        <span className="flex items-center gap-1">
          <Trash2 className="h-3 w-3 text-red-400" />
          Eliminar = borra la solicitud y restaura el plano
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Cargando solicitudes…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">
          {search ? "Sin resultados para esa búsqueda." : "No hay solicitudes registradas."}
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Radicado / Predial</th>
                <th className="px-4 py-3 font-medium">Ejecutor</th>
                <th className="px-4 py-3 font-medium">Estado solicitud</th>
                <th className="px-4 py-3 font-medium">Estado plano</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filtered.map((s) => {
                const planNeedsRestore = s.plan.estado !== "DISPONIBLE";
                const isBusy = deletingId === s.id || restoringId === s.id;
                return (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{s.plan.radicado}</p>
                      {s.plan.predial && <p className="text-xs text-slate-400">{s.plan.predial}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p>{s.user.name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{s.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[s.estado] ?? "bg-slate-100 text-slate-700"}`}>
                        {ESTADO_LABELS[s.estado] ?? s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_ESTADO_COLORS[s.plan.estado] ?? "bg-slate-100 text-slate-700"}`}>
                        {PLAN_ESTADO_LABELS[s.plan.estado] ?? s.plan.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(s.fechaSolicitud).toLocaleString("es-CO", {
                        timeZone: "America/Bogota",
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Restore plan to DISPONIBLE (keep request) */}
                        {planNeedsRestore && (
                          <button
                            onClick={() => handleRestore(s)}
                            disabled={isBusy}
                            title="Restaurar plano a disponible (mantiene la solicitud)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-40"
                          >
                            {restoringId === s.id ? (
                              <span className="h-4 w-4 block border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {/* Delete request (and restore plan) */}
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={isBusy}
                          title="Eliminar solicitud y restaurar plano"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                        >
                          {deletingId === s.id ? (
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
        Total: {solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""} · Mostrando: {filtered.length}
      </p>
    </div>
  );
}
