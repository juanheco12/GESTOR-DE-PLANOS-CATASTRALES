import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Search } from "lucide-react";

export default async function PlanosEntregadosPage() {
  const session = await getServerSession(authOptions);
  
  // Obtener solo planos entregados/prestados
  const entregados = await prisma.plan.findMany({
    where: { estado: 'PRESTADO' },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Planos entregados</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Control de los planos que se encuentran actualmente prestados o entregados.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar plano entregado..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm dark:text-slate-100 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-3 font-medium">Radicado</th>
                <th className="px-6 py-3 font-medium">Predial</th>
                <th className="px-6 py-3 font-medium">Fecha de Entrega</th>
                <th className="px-6 py-3 font-medium">Entregado a</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {entregados.length > 0 ? (
                entregados.map((plano) => (
                  <tr key={plano.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{plano.radicado}</td>
                    <td className="px-6 py-4">{plano.predial}</td>
                    <td className="px-6 py-4">{plano.updatedAt.toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {/* Aquí iría el nombre de quien recibió, obteniéndolo de la Request activa */}
                      <span className="text-slate-500 italic">Datos de entrega...</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Prestado
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium text-sm">
                        Registrar Devolución
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No hay planos entregados en este momento.
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
