"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const COL = "America/Bogota";
const fmt = (d: string) =>
  new Date(d).toLocaleString("es-CO", { timeZone: COL, dateStyle: "short", timeStyle: "short" });

interface Log {
  id: string;
  action: string;
  entityId: string;
  createdAt: string;
  oldData: string | null;
  newData: string | null;
  user: { name: string | null; email: string | null };
}

function diffData(oldRaw: string | null, newRaw: string | null): { campo: string; antes: string; despues: string }[] {
  if (!oldRaw || !newRaw) return [];
  try {
    const o = JSON.parse(oldRaw);
    const n = JSON.parse(newRaw);
    const SKIP = new Set(["id", "createdAt", "updatedAt", "qrCode", "inconsistencias"]);
    return Object.keys(n)
      .filter((k) => !SKIP.has(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]))
      .map((k) => ({ campo: k, antes: String(o[k] ?? "—"), despues: String(n[k] ?? "—") }));
  } catch {
    return [];
  }
}

const ES_CLAVE = (a: string) => a === "CAMBIO_CLAVE_PROPIA" || a === "CAMBIO_CLAVE_ADMIN";

const ACCION_LABEL: Record<string, string> = {
  DELETE:               "Eliminación",
  CAMBIO_CLAVE_PROPIA:  "Cambió su contraseña",
  CAMBIO_CLAVE_ADMIN:   "Contraseña asignada",
};

const ACCION_STYLE: Record<string, string> = {
  DELETE:               "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CAMBIO_CLAVE_PROPIA:  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  CAMBIO_CLAVE_ADMIN:   "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

// Datos legibles del registro de contraseña
function datosClave(raw: string | null): { usuario?: string; correo?: string; origen?: string } {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export default function AuditTab() {
  const [logs, setLogs]   = useState<Log[]>([]);
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = (p: number) => {
    setLoading(true);
    fetch(`/api/admin/auditlog?page=${p}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
        setPages(data.totalPages ?? 1);
        setPage(p);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Registro de Auditoría</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Ediciones y eliminaciones de planos, y todo cambio de contraseña de acceso.
          Por seguridad las contraseñas se guardan cifradas y no pueden consultarse: aquí queda
          el registro de quién la cambió y cuándo.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">Cargando...</div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">No hay registros de auditoría aún.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Acción</th>
                  <th className="px-5 py-3 font-medium">Detalle</th>
                  <th className="px-5 py-3 font-medium">Realizado por</th>
                  <th className="px-5 py-3 font-medium">Cambios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => {
                  const diff = diffData(log.oldData, log.newData);
                  const isOpen = expanded === log.id;
                  return (
                    <>
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{fmt(log.createdAt)}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            ACCION_STYLE[log.action] ?? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                            {ACCION_LABEL[log.action] ?? "Edición"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[220px]">
                          {ES_CLAVE(log.action)
                            ? (() => {
                                const d = datosClave(log.newData);
                                return (
                                  <span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{d.usuario ?? "—"}</span>
                                    {d.correo && <span className="block truncate">{d.correo}</span>}
                                  </span>
                                );
                              })()
                            : <span className="font-mono truncate block">{log.entityId}</span>}
                        </td>
                        <td className="px-5 py-3 text-sm">{log.user.name || log.user.email}</td>
                        <td className="px-5 py-3">
                          {ES_CLAVE(log.action) ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {datosClave(log.newData).origen ?? "Cambio de contraseña"}
                            </span>
                          ) : diff.length > 0 ? (
                            <button
                              onClick={() => setExpanded(isOpen ? null : log.id)}
                              className="text-xs text-marca-700 dark:text-marca-400 hover:underline"
                            >
                              {isOpen ? "Ocultar" : `Ver ${diff.length} cambio${diff.length !== 1 ? "s" : ""}`}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {log.action === "DELETE" ? "Registro eliminado" : "Sin diferencias detectadas"}
                            </span>
                          )}
                        </td>
                      </tr>
                      {isOpen && diff.length > 0 && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={5} className="px-5 pb-4 pt-0">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
                                  <tr>
                                    <th className="px-4 py-2 font-medium text-left">Campo</th>
                                    <th className="px-4 py-2 font-medium text-left">Antes</th>
                                    <th className="px-4 py-2 font-medium text-left">Después</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                  {diff.map((d) => (
                                    <tr key={d.campo}>
                                      <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400">{d.campo}</td>
                                      <td className="px-4 py-2 text-red-600 dark:text-red-400 line-through max-w-[200px] truncate">{d.antes}</td>
                                      <td className="px-4 py-2 text-emerald-700 dark:text-emerald-400 font-medium max-w-[200px] truncate">{d.despues}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400">{total} registros en total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => load(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">Página {page} / {pages}</span>
              <button onClick={() => load(page + 1)} disabled={page >= pages}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
