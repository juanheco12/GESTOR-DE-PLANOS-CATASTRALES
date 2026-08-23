import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";
import Link from "next/link";
import FilterPanel from "./FilterPanel";
import ExportButton from "./ExportButton";

const PAGE_SIZE = 20;

const ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  PRESTADO: "Prestado",
  ARCHIVADO: "Archivado",
  PENDIENTE_REVISION: "Pendiente revisión",
};

const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  PRESTADO: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  ARCHIVADO: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
  PENDIENTE_REVISION: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export default async function BuscarPlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  const query     = params.query      ?? "";
  const radicado  = params.radicado   ?? "";
  const predial   = params.predial    ?? "";
  const estado    = params.estado     ?? "";
  const profesional = params.profesional ?? "";
  const mutacion  = params.mutacion   ?? "";
  const formato   = params.formato    ?? "";
  const fechaDesde = params.fechaDesde ?? "";
  const fechaHasta = params.fechaHasta ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const where: any = {};

  if (query) {
    where.OR = [
      { radicado:    { contains: query, mode: "insensitive" } },
      { propietario: { contains: query, mode: "insensitive" } },
      { predial:     { contains: query, mode: "insensitive" } },
    ];
  }
  if (radicado)   where.radicado = { contains: radicado, mode: "insensitive" };
  if (predial)    where.predial  = { contains: predial,  mode: "insensitive" };
  if (estado)     where.estado   = estado;
  if (profesional) where.profesionalResponsable = { contains: profesional, mode: "insensitive" };
  if (mutacion)   where.mutacion = { contains: mutacion, mode: "insensitive" };
  if (formato)    where.formato  = formato;

  if (fechaDesde || fechaHasta) {
    where.fechaIngreso = {};
    if (fechaDesde) where.fechaIngreso.gte = new Date(fechaDesde);
    if (fechaHasta) {
      const end = new Date(fechaHasta);
      end.setHours(23, 59, 59, 999);
      where.fechaIngreso.lte = end;
    }
  }

  const [planos, total] = await Promise.all([
    prisma.plan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.plan.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Buscar plano</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Explora y filtra los planos catastrales registrados en el sistema.
          </p>
        </div>
        {(session?.user?.role === "ADMINISTRADOR" || session?.user?.role === "ENCARGADO" || session?.user?.role === "RADICADORA") && (
          <Link
            href="/dashboard/registro"
            className="inline-flex items-center justify-center px-4 py-2 bg-marca-700 hover:bg-marca-800 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Registrar Plano
          </Link>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
        <FilterPanel />

        <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {total === 0
              ? "Sin resultados"
              : `Mostrando ${from}–${to} de ${total} plano${total !== 1 ? "s" : ""}`}
          </span>
          {total > 0 && <ExportButton />}
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-4 py-3 font-medium">Radicado</th>
                <th className="px-4 py-3 font-medium">Número Predial</th>
                <th className="px-4 py-3 font-medium">Propietario</th>
                <th className="px-4 py-3 font-medium">Trámite</th>
                <th className="px-4 py-3 font-medium">Formato</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {planos.length > 0 ? (
                planos.map((plano) => (
                  <tr key={plano.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{plano.radicado}</td>
                    <td className="px-4 py-3 font-mono text-xs max-w-[160px]">
                      <span title={plano.predial ?? undefined} className="block truncate">
                        {plano.predial}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[150px] truncate">{plano.propietario}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {plano.mutacion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{plano.formato}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(plano.fechaIngreso).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[plano.estado] ?? "bg-slate-100 text-slate-800"}`}>
                        {ESTADO_LABELS[plano.estado] ?? plano.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Link
                        href={`/dashboard/buscar/${plano.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-marca-50 hover:bg-marca-100 dark:bg-marca-900/30 dark:hover:bg-marca-900/50 text-marca-800 dark:text-marca-400 font-medium text-xs transition-colors border border-marca-200 dark:border-marca-800"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron planos con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <PaginationLink params={params} targetPage={page - 1} label="← Anterior" />
              )}
              {page < totalPages && (
                <PaginationLink params={params} targetPage={page + 1} label="Siguiente →" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaginationLink({
  params,
  targetPage,
  label,
}: {
  params: Record<string, string | undefined>;
  targetPage: number;
  label: string;
}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") p.set(k, v);
  }
  p.set("page", String(targetPage));
  return (
    <Link
      href={`/dashboard/buscar?${p.toString()}`}
      className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      {label}
    </Link>
  );
}
