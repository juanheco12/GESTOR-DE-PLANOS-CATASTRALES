"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

const ACCION_LABELS: Record<string, string> = {
  REGISTRO:              "Plano registrado",
  SOLICITUD:             "Solicitud creada",
  ENTREGA:               "Plano entregado",
  DEVOLUCION:            "Plano devuelto",
  EDICION:               "Plano editado",
  ENTREGA_AUTORIZADA:    "Entrega autorizada",
  FIRMA_ENTREGA:         "Entrega confirmada",
  DEVOLUCION_SOLICITADA: "Devolución solicitada",
  PLANO_ARCHIVADO:       "Plano archivado",
  PRESTAMO_EXTERNO:      "Préstamo externo",
  DEVOLUCION_EXTERNA:    "Devolución externa",
  SOLICITUD_CANCELADA:   "Solicitud cancelada",
};

export type HistoryItem = {
  id: string;
  accion: string;
  createdAt: string;
  plan: { radicado: string; id: string };
  user: { name: string | null; email: string | null };
};

export type DayGroup = {
  key: string;
  label: string;
  historialUrl: string;
  items: HistoryItem[];
};

interface Props {
  groups: DayGroup[];
  isAdmin: boolean;
  colTz: string;
}

const INITIAL_VISIBLE = 5;

export default function ActividadRecientePanel({ groups, isAdmin, colTz }: Props) {
  const [expanded,   setExpanded]   = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro de actividad? Esta acción no se puede deshacer.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/actividad/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeletedIds((prev) => new Set([...prev, id]));
    } catch {
      alert("No se pudo eliminar el registro.");
    } finally {
      setDeleting(null);
    }
  };

  // Flatten all items across days (already ordered newest first)
  const allItems: (HistoryItem & { dayKey: string })[] = groups.flatMap((g) =>
    g.items.map((item) => ({ ...item, dayKey: g.key }))
  );

  // Remove deleted items
  const visibleItems = allItems.filter((item) => !deletedIds.has(item.id));

  // Slice to initial count when collapsed
  const shownItems = expanded ? visibleItems : visibleItems.slice(0, INITIAL_VISIBLE);
  const hiddenCount = visibleItems.length - INITIAL_VISIBLE;

  // Rebuild groups from shown items to preserve day headers
  const shownGroups: DayGroup[] = [];
  for (const group of groups) {
    const items = group.items.filter(
      (item) => !deletedIds.has(item.id) && shownItems.some((s) => s.id === item.id)
    );
    if (items.length > 0) {
      shownGroups.push({ ...group, items });
    }
  }

  if (visibleItems.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        Sin actividad registrada. Consulta el{" "}
        <Link href="/dashboard/historial" className="text-teal-700 dark:text-teal-400 hover:underline">
          Historial
        </Link>.
      </p>
    );
  }

  return (
    <>
      {shownGroups.map(({ key, label, historialUrl, items }) => (
        <div key={key}>
          {/* Day header */}
          <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {label}
            </span>
            <Link href={historialUrl} className="text-xs text-teal-700 dark:text-teal-400 hover:underline">
              Ver día completo →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((h) => (
              <li key={h.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 dark:text-slate-200 truncate">
                    <span className="font-medium">{ACCION_LABELS[h.accion] ?? h.accion}</span>
                    {" — "}
                    <Link
                      href={`/dashboard/buscar/${h.plan.id}`}
                      className="text-teal-700 dark:text-teal-400 hover:underline"
                    >
                      {h.plan.radicado}
                    </Link>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {h.user.name || h.user.email || "Usuario"} ·{" "}
                    {new Date(h.createdAt).toLocaleString("es-CO", {
                      timeZone: colTz,
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(h.id)}
                    disabled={deleting === h.id}
                    title="Eliminar este registro de actividad"
                    className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:text-slate-600 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                  >
                    {deleting === h.id ? (
                      <span className="h-3.5 w-3.5 block border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Ver más / Ver menos toggle */}
      {visibleItems.length > INITIAL_VISIBLE && (
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Ver {hiddenCount} más
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}
