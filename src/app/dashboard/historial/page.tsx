import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import HistorialFilters from "./HistorialFilters";

const PAGE_SIZE = 30;
const COL = "America/Bogota";

const ACCION_LABELS: Record<string, string> = {
  REGISTRO:           "Registro",
  SOLICITUD:          "Solicitud",
  ENTREGA_AUTORIZADA: "Entrega autorizada",
  FIRMA_ENTREGA:      "Entrega confirmada",
  DEVOLUCION_SOLICITADA: "Dev. solicitada",
  PLANO_ARCHIVADO:    "Devolución",
  EDICION:            "Edición",
  DEVOLUCION:         "Devolución forzada",
  SOLICITUD_CANCELADA: "Solicitud cancelada",
};

const ACCION_COLORS: Record<string, string> = {
  REGISTRO:           "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  SOLICITUD:          "bg-teal-100 text-teal-900 dark:bg-teal-900/30 dark:text-teal-400",
  ENTREGA_AUTORIZADA: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  FIRMA_ENTREGA:      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  DEVOLUCION_SOLICITADA: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  PLANO_ARCHIVADO:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  EDICION:            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  DEVOLUCION:         "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  SOLICITUD_CANCELADA: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR" && session?.user?.role !== "ENCARGADO") {
    redirect("/dashboard");
  }

  const params    = await searchParams;
  const page      = Math.max(1, parseInt(params.page ?? "1", 10));
  const accion    = params.accion     ?? "";
  const usuarioId = params.usuario    ?? "";
  const desde     = params.desde      ?? "";
  const hasta     = params.hasta      ?? "";
  const radicado  = params.radicado   ?? "";

  const where: any = {};
  if (accion)     where.accion  = accion;
  if (usuarioId)  where.userId  = usuarioId;
  if (radicado)   where.plan    = { radicado: { contains: radicado, mode: "insensitive" } };
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = new Date(desde);
    if (hasta) {
      const fin = new Date(hasta);
      fin.setHours(23, 59, 59, 999);
      where.createdAt.lte = fin;
    }
  }

  const [entries, total, usuarios] = await Promise.all([
    prisma.history.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      include: {
        plan: { select: { radicado: true, id: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.history.count({ where }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Historial de Actividad</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Cronología completa de todos los movimientos del sistema. Filtra por fecha, usuario o tipo de acción.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Filtros */}
        <HistorialFilters usuarios={usuarios} />

        {/* Contador */}
        <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {total === 0
              ? "Sin resultados"
              : `Mostrando ${from}–${to} de ${total} movimiento${total !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Fecha y hora</th>
                <th className="px-5 py-3 font-medium">Acción</th>
                <th className="px-5 py-3 font-medium">Plano</th>
                <th className="px-5 py-3 font-medium">Usuario</th>
                <th className="px-5 py-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                    No hay registros con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                entries.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {new Date(h.createdAt).toLocaleString("es-CO", { timeZone: COL, dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACCION_COLORS[h.accion] ?? "bg-slate-100 text-slate-700"}`}>
                        {ACCION_LABELS[h.accion] ?? h.accion}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap font-medium">
                      <Link
                        href={`/dashboard/buscar/${h.plan.id}`}
                        className="text-teal-700 dark:text-teal-400 hover:underline"
                      >
                        {h.plan.radicado}
                      </Link>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm">
                      {h.user.name || h.user.email}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {h.detalles}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <PagLink params={params} target={page - 1} label="← Anterior" />
              )}
              {page < totalPages && (
                <PagLink params={params} target={page + 1} label="Siguiente →" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PagLink({ params, target, label }: { params: Record<string, string | undefined>; target: number; label: string }) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") p.set(k, v);
  p.set("page", String(target));
  return (
    <Link href={`/dashboard/historial?${p}`}
      className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      {label}
    </Link>
  );
}
