import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";
import Link from "next/link";
import FilterPanel from "./FilterPanel";

export default async function BuscarPlanoPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  
  // En Next.js 15, searchParams es una promesa, hay que esperarla
  const params = await searchParams;

  const query = typeof params.query === 'string' ? params.query : undefined;
  const radicado = typeof params.radicado === 'string' ? params.radicado : undefined;
  const predial = typeof params.predial === 'string' ? params.predial : undefined;
  const estado = typeof params.estado === 'string' ? params.estado : undefined;
  const profesional = typeof params.profesional === 'string' ? params.profesional : undefined;

  // Construir consulta Prisma
  const where: any = {};
  
  if (query) {
    where.OR = [
      { radicado: { contains: query } },
      { propietario: { contains: query } }
    ];
  }
  if (radicado) where.radicado = { contains: radicado };
  if (predial) where.predial = { contains: predial };
  if (estado) where.estado = estado;
  if (profesional) where.profesionalResponsable = { contains: profesional };

  const planos = await prisma.plan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Buscar plano</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Explora y filtra los planos catastrales registrados en el sistema.
          </p>
        </div>
        {(session?.user?.role === "ADMINISTRADOR" || session?.user?.role === "ENCARGADO") && (
          <Link 
            href="/dashboard/registro" 
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Registrar Plano
          </Link>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
        {/* Filtros de Búsqueda */}
        <FilterPanel />

        {/* Tabla de Resultados */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-3 font-medium">Radicado</th>
                <th className="px-6 py-3 font-medium">Número Predial</th>
                <th className="px-6 py-3 font-medium">Propietario</th>
                <th className="px-6 py-3 font-medium">Trámite</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {planos.length > 0 ? (
                planos.map((plano) => (
                  <tr key={plano.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{plano.radicado}</td>
                    <td className="px-6 py-4">{plano.predial}</td>
                    <td className="px-6 py-4 truncate max-w-xs">{plano.propietario}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {plano.mutacion}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${plano.estado === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          plano.estado === 'PRESTADO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 
                          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`
                      }>
                        {plano.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/buscar/${plano.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron planos registrados.
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
