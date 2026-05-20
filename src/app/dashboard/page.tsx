import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  FileText, 
  Map, 
  Clock, 
  CheckCircle2,
  BellRing,
  CornerUpLeft
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const isEjecutor = session?.user?.role === "EJECUTOR";
  const isEncargado = session?.user?.role === "ADMINISTRADOR" || session?.user?.role === "ENCARGADO";
  
  if (isEjecutor) {
    // DASHBOARD EJECUTOR
    const userId = session?.user?.id;
    const pendientesPorRecibir = await prisma.request.count({ 
      where: { userId, estado: "LISTO_PARA_ENTREGA" } 
    });
    const totalDevueltos = await prisma.request.count({ 
      where: { userId, estado: "DEVUELTO" } 
    });
    const pendientesFirma = await prisma.request.findMany({
      where: { userId, estado: "LISTO_PARA_ENTREGA" },
      include: { plan: true },
    });

    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Panel de Ejecutor</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Bienvenido, {session?.user?.name || session?.user?.email}.
          </p>
        </div>

        {pendientesFirma.length > 0 && (
          <div className="mb-8 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
              <BellRing className="mr-2 h-5 w-5 text-amber-500" /> Planos Listos para Recoger
            </h2>
            {pendientesFirma.map((req) => (
              <div key={req.id} className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start justify-between">
                <div>
                  <p className="text-amber-800 dark:text-amber-400 font-medium">
                    Firma Digital Requerida
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                    El plano con radicado <span className="font-bold underline">{req.plan.radicado}</span> está listo. Debes firmar para confirmar la recepción.
                  </p>
                </div>
                <Link 
                  href={`/dashboard/solicitudes/firmar/${req.id}`}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Firmar y Recibir
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="bg-white dark:bg-slate-900 overflow-hidden rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex items-center">
            <div className={`p-4 rounded-xl bg-amber-500 bg-opacity-10 dark:bg-opacity-20 mr-5`}>
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                Planos pendientes por recibir
              </p>
              <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {pendientesPorRecibir}
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 overflow-hidden rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex items-center">
            <div className={`p-4 rounded-xl bg-emerald-500 bg-opacity-10 dark:bg-opacity-20 mr-5`}>
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                Total de planos devueltos
              </p>
              <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {totalDevueltos}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD ADMINISTRADOR / ENCARGADO
  const stats = {
    totalPlanos: await prisma.plan.count(),
    pendientes: await prisma.plan.count({ where: { estado: "PENDIENTE_REVISION" } }),
    entregados: await prisma.plan.count({ where: { estado: "PRESTADO" } }),
    enProceso: await prisma.plan.count({ where: { estado: "DISPONIBLE" } })
  };

  const statCards = [
    { name: "Total Ingresados", value: stats.totalPlanos, icon: FileText, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
    { name: "Planos Pendientes", value: stats.pendientes, icon: Clock, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
    { name: "Planos Entregados", value: stats.entregados, icon: CheckCircle2, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    { name: "Trámites en Proceso", value: stats.enProceso, icon: Map, color: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" },
  ];

  let solicitudesNuevas = await prisma.request.findMany({
    where: { estado: "PENDIENTE" },
    include: { plan: true, user: true },
    orderBy: { fechaSolicitud: "desc" }
  });

  let devoluciones = await prisma.request.findMany({
    where: { estado: "DEVOLUCION_SOLICITADA" },
    include: { plan: true, user: true },
    orderBy: { fechaSolicitud: "desc" }
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Panel del Administrador</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Bienvenido, {session?.user?.name || session?.user?.email}. Aquí tienes un resumen del sistema.
        </p>
      </div>

      {solicitudesNuevas.length > 0 && (
        <div className="mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
            <BellRing className="mr-2 h-5 w-5 text-amber-500" /> Alertas de Solicitudes (Por entregar)
          </h2>
          {solicitudesNuevas.map((solicitud) => (
            <div key={solicitud.id} className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start justify-between">
              <div>
                <p className="text-amber-800 dark:text-amber-400 font-medium">
                  Nueva solicitud de préstamo de plano
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                  El ejecutor <span className="font-semibold">{solicitud.user.name || solicitud.user.email}</span> ha solicitado el plano con radicado <span className="font-bold underline">{solicitud.plan.radicado}</span>.
                </p>
              </div>
              <Link 
                href={`/dashboard/entregados/gestionar/${solicitud.id}`}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Revisar
              </Link>
            </div>
          ))}
        </div>
      )}

      {devoluciones.length > 0 && (
        <div className="mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
            <CornerUpLeft className="mr-2 h-5 w-5 text-purple-500" /> Alertas de Devoluciones (Por recibir)
          </h2>
          {devoluciones.map((solicitud) => (
            <div key={solicitud.id} className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4 rounded-r-lg flex items-start justify-between">
              <div>
                <p className="text-purple-800 dark:text-purple-400 font-medium">
                  Solicitud de devolución de plano
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-500 mt-1">
                  El ejecutor <span className="font-semibold">{solicitud.user.name || solicitud.user.email}</span> quiere devolver el plano <span className="font-bold underline">{solicitud.plan.radicado}</span>.
                </p>
              </div>
              <Link 
                href={`/dashboard/entregados/gestionar/${solicitud.id}`}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Recibir Plano
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-slate-900 overflow-hidden rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex items-center"
          >
            <div className={`p-4 rounded-xl ${stat.color} bg-opacity-10 dark:bg-opacity-20 mr-5`}>
              <stat.icon className={`h-6 w-6 ${stat.text}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                {stat.name}
              </p>
              <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
