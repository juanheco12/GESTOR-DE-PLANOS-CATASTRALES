import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileText, Map, User, Calendar, FileType,
  CheckCircle2, AlertCircle, ClipboardList, MapPin, BookOpen, Bell, Wrench, XCircle,
} from "lucide-react";
import SolicitarPlanoBoton          from "./SolicitarPlanoBoton";
import AdminActions                 from "./AdminActions";
import RegistrarPrestamoModal       from "./RegistrarPrestamoModal";
import HistorialPrestamos           from "./HistorialPrestamos";
import SubsanarInconsistenciaBoton  from "./SubsanarInconsistenciaBoton";

export default async function DetallePlanoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const plano = await prisma.plan.findUnique({
    where: { id },
    include: {
      receivedBy:    true,
      registradoPor: { select: { name: true } },
      history: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      requests: {
        orderBy: { fechaSolicitud: "desc" },
        include: { user: true },
        take: 5,
      },
      prestamos: {
        orderBy: { fechaEntrega: "desc" },
        include: {
          entregadoPor: { select: { name: true, email: true } },
          devueltoPor:  { select: { name: true } },
        },
      },
    },
  });

  if (!plano) notFound();

  const role            = session?.user?.role;
  const isAdministrador = role === "ADMINISTRADOR";
  const isEncargado     = role === "ENCARGADO";
  const isEjecutor      = role === "EJECUTOR" || role === "DIGITALIZADOR";
  const isRadicadora    = role === "RADICADORA";
  const canManage       = isAdministrador || isEncargado || isRadicadora;

  const solicitudActiva = plano.requests.find((r) =>
    ["PENDIENTE", "LISTO_PARA_ENTREGA", "ENTREGADO", "DEVOLUCION_SOLICITADA"].includes(r.estado)
  );

  const prestamosSerializable = plano.prestamos.map((p) => ({
    ...p,
    fechaEntrega:    p.fechaEntrega.toISOString(),
    fechaDevolucion: p.fechaDevolucion?.toISOString() ?? null,
  }));

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center">
          <Link
            href="/dashboard/buscar"
            className="mr-4 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Plano {plano.radicado}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${plano.estado === "DISPONIBLE"         ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    plano.estado === "PRESTADO"           ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                    plano.estado === "PENDIENTE_REVISION" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
                    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"}`}
              >
                {plano.estado === "DISPONIBLE"         ? "Disponible" :
                 plano.estado === "PRESTADO"           ? "Prestado" :
                 plano.estado === "PENDIENTE_REVISION" ? "Pendiente revisión" :
                 plano.estado === "ARCHIVADO"          ? "Archivado" : plano.estado}
              </span>
              Registrado el {plano.createdAt.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap justify-end">
          {/* EJECUTOR: solicitar plano disponible */}
          {isEjecutor && plano.estado === "DISPONIBLE" && (
            <SolicitarPlanoBoton planId={plano.id} radicado={plano.radicado} />
          )}

          {/* ENCARGADO/ADMIN: gestionar solicitud interna activa */}
          {canManage && plano.estado !== "DISPONIBLE" && solicitudActiva && (
            <Link
              href={`/dashboard/entregados/gestionar/${solicitudActiva.id}`}
              className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Gestionar solicitud
            </Link>
          )}

          {/* ENCARGADO/RADICADORA/ADMIN: registrar préstamo externo */}
          {canManage && plano.estado === "DISPONIBLE" && (
            <RegistrarPrestamoModal
              planId={plano.id}
              radicado={plano.radicado}
              userName={session?.user?.name ?? session?.user?.email ?? "Usuario"}
            />
          )}

          {/* ENCARGADO/ADMIN: editar plano (trajeron un nuevo plano para subsanar) */}
          {(isAdministrador || isEncargado) && (
            <SubsanarInconsistenciaBoton
              planId={plano.id}
              radicado={plano.radicado}
              inconsistencias={plano.inconsistencias}
            />
          )}

          {/* ADMIN: editar / eliminar / restaurar */}
          {isAdministrador && (
            <AdminActions planId={plano.id} planEstado={plano.estado} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Detalles del Trámite</h3>
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
                  <dd className="mt-1 text-base text-slate-900 dark:text-slate-100 font-mono break-all">{plano.predial}</dd>
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
                {plano.registradoPor && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                      <User className="mr-2 h-4 w-4" /> Registrado por
                    </dt>
                    <dd className="mt-1 text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {plano.registradoPor.name}
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Radicador</span>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    <FileType className="mr-2 h-4 w-4" /> Soporte Físico
                  </dt>
                  <dd className="mt-1 text-base text-slate-900 dark:text-slate-100">{plano.formato}</dd>
                </div>
              </dl>

              {plano.ubicacionFisica && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
                    <MapPin className="h-5 w-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-teal-900 dark:text-teal-300">Ubicación física en oficina</p>
                      <p className="text-base text-teal-900 dark:text-teal-100 mt-0.5">{plano.ubicacionFisica}</p>
                    </div>
                  </div>
                </div>
              )}

              {plano.observaciones && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Observaciones Generales</dt>
                  <dd className="mt-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                    {plano.observaciones}
                  </dd>
                </div>
              )}

              {plano.inconsistencias && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <Wrench className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Inconsistencia pendiente</p>
                      <p className="text-sm text-amber-900 dark:text-amber-100 mt-0.5">{plano.inconsistencias}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Historial de Préstamos Externos */}
          {(canManage || prestamosSerializable.length > 0) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-violet-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Préstamos Externos</h3>
                {prestamosSerializable.some((p) => !p.fechaDevolucion) && (
                  <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    Activo
                  </span>
                )}
              </div>
              <div className="p-6">
                <HistorialPrestamos
                  prestamos={prestamosSerializable}
                  canManage={canManage}
                />
              </div>
            </div>
          )}
        </div>

        {/* Historial del sistema */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Historial del Plano</h3>
            </div>
            <div className="p-6">
              {plano.history.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">Sin historial registrado.</p>
              ) : (
                <ul className="-mb-8">
                  {plano.history.map((evento, idx) => (
                    <li key={evento.id}>
                      <div className="relative pb-8">
                        {idx !== plano.history.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700" />
                        )}
                        <div className="relative flex space-x-3">
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-slate-900 shrink-0
                              ${evento.accion === "REGISTRO"          ? "bg-emerald-500" :
                                evento.accion === "SOLICITUD"         ? "bg-teal-600" :
                                evento.accion === "PRESTAMO_EXTERNO"  ? "bg-violet-500" :
                                evento.accion === "DEVOLUCION_EXTERNA"? "bg-teal-500" :
                                evento.accion === "DEVOLUCION" || evento.accion === "PLANO_ARCHIVADO" ? "bg-purple-500" :
                                evento.accion === "RECORDATORIO"      ? "bg-amber-500" :
                                evento.accion === "INCONSISTENCIA_SUBSANADA" ? "bg-orange-500" :
                                evento.accion === "SOLICITUD_CANCELADA" ? "bg-red-500" :
                                "bg-slate-400"} text-white`}
                          >
                            {evento.accion === "REGISTRO"          ? <CheckCircle2 className="h-4 w-4" /> :
                             evento.accion === "SOLICITUD"         ? <AlertCircle className="h-4 w-4" /> :
                             evento.accion === "PRESTAMO_EXTERNO"  ? <BookOpen className="h-4 w-4" /> :
                             evento.accion === "RECORDATORIO"      ? <Bell className="h-4 w-4" /> :
                             evento.accion === "INCONSISTENCIA_SUBSANADA" ? <Wrench className="h-4 w-4" /> :
                             evento.accion === "SOLICITUD_CANCELADA" ? <XCircle className="h-4 w-4" /> :
                             <Calendar className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {evento.detalles}{" "}
                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                  ({evento.user?.name || "Sistema"})
                                </span>
                              </p>
                            </div>
                            <div className="text-right text-xs whitespace-nowrap text-slate-400">
                              {new Date(evento.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
