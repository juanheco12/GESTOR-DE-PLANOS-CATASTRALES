export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";

export default async function PlanosEntregadosPage() {
  const session = await getServerSession(authOptions);

  const solicitudesActivas = await prisma.request.findMany({
    where: { estado: { in: ["PENDIENTE", "LISTO_PARA_ENTREGA", "ENTREGADO", "DEVOLUCION_SOLICITADA"] } },
    orderBy: { fechaSolicitud: "desc" },
    include: {
      plan: true,
      user: true,
    },
  });

  const ESTADO_LABELS: Record<string, string> = {
    PENDIENTE:            "Pendiente de aprobación",
    LISTO_PARA_ENTREGA:   "Listo para entregar",
    ENTREGADO:            "Entregado",
    DEVOLUCION_SOLICITADA: "Devolución solicitada",
  };
  const ESTADO_COLORS: Record<string, string> = {
    PENDIENTE:            "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    LISTO_PARA_ENTREGA:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    ENTREGADO:            "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    DEVOLUCION_SOLICITADA: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col">
      {/* Auto-refresh every 20 s so new requests appear without manual reload */}
      <AutoRefresh intervalMs={10000} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Planos entregados</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Solicitudes activas: pendientes de aprobación, en poder del ejecutor o con devolución en proceso.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-5 py-3 font-medium">Radicado</th>
                <th className="px-5 py-3 font-medium">Número Predial</th>
                <th className="px-5 py-3 font-medium">Solicitado por</th>
                <th className="px-5 py-3 font-medium">Fecha Solicitud</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {solicitudesActivas.length > 0 ? (
                solicitudesActivas.map((sol) => (
                  <tr key={sol.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {sol.plan.radicado}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs max-w-[160px]">
                      <span title={sol.plan.predial ?? undefined} className="block truncate">
                        {sol.plan.predial}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{sol.user.name || "Sin nombre"}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{sol.user.email}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(sol.fechaSolicitud).toLocaleString("es-CO", {
                        timeZone: "America/Bogota",
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[sol.estado] ?? "bg-slate-100 text-slate-800"}`}>
                        {ESTADO_LABELS[sol.estado] ?? sol.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      <Link
                        href={`/dashboard/entregados/gestionar/${sol.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-400 font-medium text-xs transition-colors border border-teal-200 dark:border-teal-800"
                      >
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    No hay solicitudes activas en este momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
