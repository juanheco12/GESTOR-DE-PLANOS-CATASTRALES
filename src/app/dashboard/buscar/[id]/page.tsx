import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Map, User, Calendar, FileType, CheckCircle2, AlertCircle } from "lucide-react";
import SolicitarPlanoBoton from "./SolicitarPlanoBoton";
import AdminActions from "./AdminActions";
import Image from "next/image";

export default async function DetallePlanoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  // En Next.js 15, params es una promesa, hay que esperarla
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const plano = await prisma.plan.findUnique({
    where: { id },
    include: {
      receivedBy: true,
      history: {
        include: { user: true },
        orderBy: { createdAt: 'asc' } // Punto 15: Orden cronológico correcto
      },
      requests: {
        where: { firma: { not: null } },
        orderBy: { fechaEntrega: 'desc' },
        include: { user: true }
      }
    }
  });

  const isAdministrador = session?.user?.role === "ADMINISTRADOR";
  const ultimaFirma = plano?.requests[0];

  if (!plano) {
    notFound();
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/dashboard/buscar" className="mr-4 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Plano {plano.radicado}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2
                ${plano.estado === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                  plano.estado === 'PRESTADO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 
                  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'}`
              }>
                {plano.estado}
              </span>
              Registrado el {plano.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {plano.estado === 'DISPONIBLE' && (
            <SolicitarPlanoBoton planId={plano.id} radicado={plano.radicado} />
          )}
          {isAdministrador && (
            <AdminActions planId={plano.id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Detalles del Trámite</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    <FileText className="mr-2 h-4 w-4" /> Trámite (Mutación)
                  </dt>
                  <dd className="mt-1 text-base text-slate-900 dark:text-slate-100">{plano.mutacion}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    <Map className="mr-2 h-4 w-4" /> Número Predial
                  </dt>
                  <dd className="mt-1 text-base text-slate-900 dark:text-slate-100 font-mono">{plano.predial}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    <User className="mr-2 h-4 w-4" /> Propietario
                  </dt>
                  <dd className="mt-1 text-base text-slate-900 dark:text-slate-100">{plano.propietario}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    <Map className="mr-2 h-4 w-4" /> Vereda / Barrio
                  </dt>
                  <dd className="mt-1 text-base text-slate-900 dark:text-slate-100">{plano.veredaBarrio || "No especificado"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    <User className="mr-2 h-4 w-4" /> Profesional Responsable
                  </dt>
                  <dd className="mt-1 text-base text-slate-900 dark:text-slate-100">{plano.profesionalResponsable || "No especificado"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    <User className="mr-2 h-4 w-4" /> Recibido por
                  </dt>
                  <dd className="mt-1 text-base text-slate-900 dark:text-slate-100">
                    {plano.receivedBy?.name || "No especificado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    <FileType className="mr-2 h-4 w-4" /> Formato del Plano
                  </dt>
                  <dd className="mt-1 text-base text-slate-900 dark:text-slate-100">{plano.formato}</dd>
                </div>
              </dl>

              {plano.observaciones && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Observaciones Generales</dt>
                  <dd className="mt-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                    {plano.observaciones}
                  </dd>
                </div>
              )}

              {/* Mostrar firma digital si existe (Puntos 12 y 16) */}
              {isAdministrador && ultimaFirma && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Constancia de Entrega y Firma</h4>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      <strong>Recibido por:</strong> {ultimaFirma.user.name || ultimaFirma.user.email}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      <strong>Fecha y hora:</strong> {ultimaFirma.fechaEntrega?.toLocaleString() || "No registrada"}
                    </p>
                    <div className="bg-white border-2 border-slate-200 rounded-lg p-2 max-w-[300px] h-[150px] flex items-center justify-center overflow-hidden relative">
                      <Image 
                        src={ultimaFirma.firma!} 
                        alt="Firma del ejecutor" 
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Historial (Sidebar derecha) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Historial del Plano</h3>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {plano.history.map((evento, eventIdx) => (
                    <li key={evento.id}>
                      <div className="relative pb-8">
                        {eventIdx !== plano.history.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-slate-900
                              ${evento.accion === 'REGISTRO' ? 'bg-emerald-500 text-white' : 
                                evento.accion === 'SOLICITUD' ? 'bg-blue-500 text-white' : 
                                'bg-slate-500 text-white'}`}>
                              {evento.accion === 'REGISTRO' ? <CheckCircle2 className="h-4 w-4" /> : 
                               evento.accion === 'SOLICITUD' ? <AlertCircle className="h-4 w-4" /> :
                               <Calendar className="h-4 w-4" />}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {evento.detalles} <span className="font-medium text-slate-900 dark:text-slate-100">({evento.user?.name})</span>
                              </p>
                            </div>
                            <div className="text-right text-xs whitespace-nowrap text-slate-500 dark:text-slate-500">
                              {evento.createdAt.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
