import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Calendar, FileText } from "lucide-react";
import ActionButtons from "./ActionButtons";

export default async function GestionarSolicitudPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const solicitud = await prisma.request.findUnique({
    where: { id },
    include: {
      plan: true,
      user: true,
    }
  });

  if (!solicitud || (session?.user?.role !== "ADMINISTRADOR" && session?.user?.role !== "ENCARGADO")) {
    notFound();
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center">
        <Link href="/dashboard" className="mr-4 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Gestionar Solicitud
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Plano {solicitud.plan.radicado} - Estado actual: <span className="font-semibold text-blue-600 dark:text-blue-400">{solicitud.estado.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-8">
        <div className="p-6">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Detalles del Ejecutor y Trámite</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center mb-1"><User className="mr-2 h-4 w-4" /> Solicitante</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{solicitud.user.name} ({solicitud.user.email})</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center mb-1"><Calendar className="mr-2 h-4 w-4" /> Fecha Solicitud</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{solicitud.fechaSolicitud.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center mb-1"><FileText className="mr-2 h-4 w-4" /> Mutación</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{solicitud.plan.mutacion}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center mb-1"><FileText className="mr-2 h-4 w-4" /> Número Predial</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{solicitud.plan.predial}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de Acción (Client Component) */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <ActionButtons requestId={solicitud.id} estado={solicitud.estado} />
      </div>
    </div>
  );
}
