"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

const inputClass =
  "w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-marca-500 focus:border-marca-600 outline-none";

const ACCIONES = [
  { value: "", label: "Todas las acciones" },
  { value: "REGISTRO",              label: "Registro" },
  { value: "SOLICITUD",             label: "Solicitud" },
  { value: "ENTREGA_AUTORIZADA",    label: "Entrega autorizada" },
  { value: "FIRMA_ENTREGA",         label: "Firma y entrega" },
  { value: "DEVOLUCION_SOLICITADA", label: "Devolución solicitada" },
  { value: "PLANO_ARCHIVADO",       label: "Devolución aceptada" },
  { value: "EDICION",               label: "Edición" },
  { value: "DEVOLUCION",            label: "Devolución forzada" },
  { value: "SOLICITUD_CANCELADA",   label: "Solicitud cancelada" },
];

export default function HistorialFilters({ usuarios }: { usuarios: { id: string; name: string | null; email: string | null; role: string }[] }) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [f, setF] = useState({
    radicado: searchParams.get("radicado") ?? "",
    accion:   searchParams.get("accion")   ?? "",
    usuario:  searchParams.get("usuario")  ?? "",
    desde:    searchParams.get("desde")    ?? "",
    hasta:    searchParams.get("hasta")    ?? "",
  });

  const apply = (next: typeof f) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    router.push(`/dashboard/historial?${p}`);
  };

  const clear = () => {
    const empty = { radicado: "", accion: "", usuario: "", desde: "", hasta: "" };
    setF(empty);
    router.push("/dashboard/historial");
  };

  const hasFilters = Object.values(f).some(Boolean);

  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Radicado</label>
          <input
            type="text"
            value={f.radicado}
            onChange={(e) => setF({ ...f, radicado: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && apply(f)}
            placeholder="RAD-2025-001"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo de acción</label>
          <select value={f.accion} onChange={(e) => { const v = { ...f, accion: e.target.value }; setF(v); apply(v); }} className={inputClass}>
            {ACCIONES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Usuario</label>
          <select value={f.usuario} onChange={(e) => { const v = { ...f, usuario: e.target.value }; setF(v); apply(v); }} className={inputClass}>
            <option value="">Todos los usuarios</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
          <input type="date" value={f.desde} onChange={(e) => { const v = { ...f, desde: e.target.value }; setF(v); apply(v); }} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
          <input type="date" value={f.hasta} onChange={(e) => { const v = { ...f, hasta: e.target.value }; setF(v); apply(v); }} className={inputClass} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => apply(f)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-md text-sm font-medium transition-colors"
        >
          <Search className="h-3.5 w-3.5" /> Buscar
        </button>
        {hasFilters && (
          <button onClick={clear} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <X className="h-3 w-3" /> Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
