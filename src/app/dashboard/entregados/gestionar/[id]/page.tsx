import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Calendar, FileText, MapPin,
  Home, Briefcase, ClipboardList, Package, Hash,
} from "lucide-react";
import ActionButtons from "./ActionButtons";

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">{value}</p>
    </div>
  );
}

const PLAN_ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE:         "Disponible",
  PRESTADO:           "Prestado",
  ARCHIVADO:          "Archivado",
  PENDIENTE_REVISION: "Pendiente revisión",
};

const SOLICITUD_ESTADO_LABELS: Record<string, string> = {
  PENDIENTE:             "Pendiente de aprobación",
  LISTO_PARA_ENTREGA:    "Listo para recoger",
  ENTREGADO:             "En poder del ejecutor",
  DEVOLUCION_SOLICITADA: "Devolución solicitada",
  DEVUELTO:              "Devuelto",
  RECHAZADO:             "Rechazado",
  CANCELADO:             "Cancelada por el ejecutor",
};

export default async function GestionarSolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const solicitud = await prisma.request.findUnique({
    where: { id },
    include: { plan: true, user: true },
  });

  if (!solicitud || (session?.user?.role !== "ADMINISTRADOR" && session?.user?.role !== "ENCARGADO")) {
    notFound();
  }

  let adminEntregaNombre: string | null = null;
  if (solicitud.adminEntregaId) {
    const admin = await prisma.user.findUnique({
      where:  { id: solicitud.adminEntregaId },
      select: { name: true },
    });
    adminEntregaNombre = admin?.name ?? null;
  }

  const plan = solicitud.plan;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/entregados"
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestionar Solicitud</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
            Plano <span className="font-semibold text-slate-700 dark:text-slate-300">{plan.radicado}</span>
            {" — "}
            <span className="font-semibold text-teal-700 dark:text-teal-400">
              {SOLICITUD_ESTADO_LABELS[solicitud.estado] ?? solicitud.estado.replace(/_/g, " ")}
            </span>
          </p>
        </div>
      </div>

      {/* Plan details card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Detalles del Plano</h2>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            plan.estado === "DISPONIBLE"         ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
            plan.estado === "PRESTADO"           ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
            plan.estado === "PENDIENTE_REVISION" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {PLAN_ESTADO_LABELS[plan.estado] ?? plan.estado}
          </span>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <DetailRow icon={Hash}          label="Radicado"               value={plan.radicado} />
          <DetailRow icon={Hash}          label="Número Predial"         value={plan.predial} />
          <DetailRow icon={FileText}      label="Mutación"               value={plan.mutacion} />
          <DetailRow icon={Package}       label="Formato"                value={plan.formato} />
          <DetailRow icon={User}          label="Propietario"            value={plan.propietario} />
          <DetailRow icon={MapPin}        label="Vereda / Barrio"        value={plan.veredaBarrio} />
          <DetailRow icon={Home}          label="Ubicación Física"       value={plan.ubicacionFisica} />
          <DetailRow icon={Briefcase}     label="Profesional Responsable" value={plan.profesionalResponsable} />
          {plan.observaciones && (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-0.5">
                <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                Observaciones
              </p>
              <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-4 py-3 leading-relaxed whitespace-pre-line">
                {plan.observaciones}
              </p>
            </div>
          )}
          {plan.inconsistencias && (
            <div className="sm:col-span-2">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-0.5">
                <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                Inconsistencias
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3 leading-relaxed whitespace-pre-line">
                {plan.inconsistencias}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Solicitud details */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Datos del Ejecutor</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <DetailRow icon={User}     label="Nombre"          value={solicitud.user.name ?? undefined} />
          <DetailRow icon={FileText} label="Correo"          value={solicitud.user.email ?? undefined} />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-0.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Fecha Solicitud
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {new Date(solicitud.fechaSolicitud).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>
          {solicitud.fechaEntrega && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-0.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Fecha Entrega
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {new Date(solicitud.fechaEntrega).toLocaleString("es-CO", {
                  timeZone: "America/Bogota",
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}
          {adminEntregaNombre && (
            <DetailRow icon={User} label="Receptor asignado" value={adminEntregaNombre} />
          )}
          {solicitud.observaciones && (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-0.5">
                <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                Observaciones de la solicitud
              </p>
              <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-4 py-3 leading-relaxed">
                {solicitud.observaciones}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <ActionButtons
          requestId={solicitud.id}
          estado={solicitud.estado}
          adminEntregaId={solicitud.adminEntregaId}
          adminEntregaNombre={adminEntregaNombre}
          currentUserId={session!.user.id}
          currentUserRole={session!.user.role}
        />
      </div>
    </div>
  );
}
