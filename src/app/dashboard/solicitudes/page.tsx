import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FileText, CornerUpLeft } from "lucide-react";
import SolicitarDevolucionBoton from "./SolicitarDevolucionBoton";

export default async function MisSolicitudesPage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== "EJECUTOR") {
    return <div className="p-8 text-center text-red-500">Acceso denegado. Solo para ejecutores.</div>;
  }

  // Obtener todas las solicitudes del ejecutor actual
  const solicitudes = await prisma.request.findMany({
    where: { userId: session.user.id },
    include: { plan: true },
    orderBy: { fechaSolicitud: 'desc' }
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mis Solicitudes</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Consulta el estado de tus solicitudes, firma la recepción y gestiona las devoluciones.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-3 font-medium">Radicado / Número Predial</th>
                <th className="px-6 py-3 font-medium">Fecha de Solicitud</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {solicitudes.length > 0 ? (
                solicitudes.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{req.plan.radicado}</p>
                      <p className="text-xs text-slate-500">{req.plan.predial}</p>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(req.fechaSolicitud).toLocaleString("es-CO", {
                        timeZone: "America/Bogota",
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${req.estado === 'PENDIENTE' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400' : 
                          req.estado === 'LISTO_PARA_ENTREGA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse' : 
                          req.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          req.estado === 'DEVOLUCION_SOLICITADA' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`
                      }>
                        {req.estado.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.estado === 'LISTO_PARA_ENTREGA' && (
                        <Link href={`/dashboard/solicitudes/firmar/${req.id}`} className="inline-flex items-center text-amber-600 font-bold hover:underline">
                          ¡Requiere Firma!
                        </Link>
                      )}
                      {req.estado === 'ENTREGADO' && (
                        <SolicitarDevolucionBoton requestId={req.id} />
                      )}
                      {(req.estado === 'PENDIENTE' || req.estado === 'DEVUELTO' || req.estado === 'DEVOLUCION_SOLICITADA') && (
                         <span className="text-slate-400 italic text-xs">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No has realizado ninguna solicitud aún.
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
