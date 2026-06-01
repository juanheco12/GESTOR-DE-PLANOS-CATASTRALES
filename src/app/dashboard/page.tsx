import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FileText,
  Clock,
  CheckCircle2,
  BellRing,
  CornerUpLeft,
  Archive,
  BookOpen,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";

const ACCION_LABELS: Record<string, string> = {
  REGISTRO: "Plano registrado",
  SOLICITUD: "Solicitud creada",
  ENTREGA: "Plano entregado",
  DEVOLUCION: "Plano devuelto",
  EDICION: "Plano editado",
};

function StatCard({
  label,
  value,
  icon: Icon,
  colorBg,
  colorText,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorBg: string;
  colorText: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colorBg} shrink-0`}>
          <Icon className={`h-5 w-5 ${colorText}`} />
        </div>
        {href && <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-500 shrink-0 group-hover:translate-x-0.5 transition-transform mt-1" />}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-300 leading-snug">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const isEjecutor = role === "EJECUTOR";

  /* ── DASHBOARD EJECUTOR ─────────────────────────────────── */
  if (isEjecutor) {
    const userId = session!.user.id;

    const [listosParaRecoger, misActivas, totalDevueltos, totalSolicitudes, totalSistema, disponiblesSistema] = await Promise.all([
      prisma.request.findMany({
        where: { userId, estado: "LISTO_PARA_ENTREGA" },
        include: { plan: { select: { radicado: true, mutacion: true } } },
        orderBy: { fechaSolicitud: "desc" },
      }),
      prisma.request.findMany({
        where: { userId, estado: { in: ["PENDIENTE", "LISTO_PARA_ENTREGA", "ENTREGADO", "DEVOLUCION_SOLICITADA"] } },
        include: { plan: { select: { radicado: true, mutacion: true, estado: true } } },
        orderBy: { fechaSolicitud: "desc" },
        take: 5,
      }),
      prisma.request.count({ where: { userId, estado: "DEVUELTO" } }),
      prisma.request.count({ where: { userId } }),
      prisma.plan.count(),
      prisma.plan.count({ where: { estado: "DISPONIBLE" } }),
    ]);

    const ESTADO_REQ_LABELS: Record<string, string> = {
      PENDIENTE: "Pendiente de aprobación",
      LISTO_PARA_ENTREGA: "Listo para recoger",
      ENTREGADO: "En tu poder",
      DEVOLUCION_SOLICITADA: "Devolución en proceso",
      DEVUELTO: "Devuelto",
    };
    const ESTADO_REQ_COLORS: Record<string, string> = {
      PENDIENTE: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      LISTO_PARA_ENTREGA: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      ENTREGADO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      DEVOLUCION_SOLICITADA: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      DEVUELTO: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    };

    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        <AutoRefresh intervalMs={20000} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mi Panel</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Bienvenido, {session?.user?.name || session?.user?.email}.
          </p>
        </div>

        {/* Alerta urgente: listos para recoger */}
        {listosParaRecoger.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-amber-500" /> Acción requerida
            </h2>
            {listosParaRecoger.map((req) => (
              <div
                key={req.id}
                className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 border-l-4 border-l-amber-500 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-300">
                    Plano listo para recoger
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                    Radicado <strong>{req.plan.radicado}</strong> — {req.plan.mutacion}. Dirígete al receptor para recoger el plano.
                  </p>
                </div>
                <Link
                  href="/dashboard/solicitudes"
                  className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Ver mis solicitudes
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Métricas propias */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total solicitudes" value={totalSolicitudes} icon={FileText} colorBg="bg-blue-50 dark:bg-blue-900/30" colorText="text-blue-600 dark:text-blue-400" href="/dashboard/solicitudes" />
          <StatCard label="Planos devueltos" value={totalDevueltos} icon={CheckCircle2} colorBg="bg-emerald-50 dark:bg-emerald-900/30" colorText="text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* Estado del sistema */}
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3">Estado del sistema</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total en sistema" value={totalSistema} icon={BookOpen} colorBg="bg-slate-100 dark:bg-slate-800" colorText="text-slate-600 dark:text-slate-300" href="/dashboard/buscar" />
            <StatCard label="Disponibles" value={disponiblesSistema} icon={Archive} colorBg="bg-emerald-50 dark:bg-emerald-900/30" colorText="text-emerald-600 dark:text-emerald-400" href="/dashboard/buscar?estado=DISPONIBLE" />
          </div>
        </div>

        {/* Mis solicitudes recientes */}
        {misActivas.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Mis solicitudes activas</h2>
              <Link href="/dashboard/solicitudes" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Ver todas
              </Link>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
              {misActivas.map((req) => (
                <div key={req.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{req.plan.radicado}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{req.plan.mutacion}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_REQ_COLORS[req.estado] ?? ""}`}>
                    {ESTADO_REQ_LABELS[req.estado] ?? req.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── DASHBOARD ADMINISTRADOR / ENCARGADO ─────────────────── */
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [
    totalPlanos,
    disponibles,
    prestados,
    pendientesRevision,
    archivados,
    solicitudesPendientes,
    devolucionesPendientes,
    ingresadosHoy,
    actividadReciente,
    alertasSolicitudes,
    alertasDevoluciones,
  ] = await Promise.all([
    prisma.plan.count(),
    prisma.plan.count({ where: { estado: "DISPONIBLE" } }),
    prisma.plan.count({ where: { estado: "PRESTADO" } }),
    prisma.plan.count({ where: { estado: "PENDIENTE_REVISION" } }),
    prisma.plan.count({ where: { estado: "ARCHIVADO" } }),
    prisma.request.count({ where: { estado: "PENDIENTE" } }),
    prisma.request.count({ where: { estado: "DEVOLUCION_SOLICITADA" } }),
    prisma.plan.count({ where: { createdAt: { gte: hoy } } }),
    prisma.history.findMany({
      orderBy: { createdAt: "desc" },
      take:    60,
      include: {
        plan: { select: { radicado: true, id: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.request.findMany({
      where: { estado: "PENDIENTE" },
      include: { plan: { select: { radicado: true } }, user: { select: { name: true, email: true } } },
      orderBy: { fechaSolicitud: "desc" },
      take: 5,
    }),
    prisma.request.findMany({
      where: { estado: "DEVOLUCION_SOLICITADA" },
      include: { plan: { select: { radicado: true } }, user: { select: { name: true, email: true } } },
      orderBy: { fechaSolicitud: "desc" },
      take: 5,
    }),
  ]);

  // ── Agrupar actividad reciente por día (zona Bogotá) ──
  const COL_TZ = "America/Bogota";
  function dayKey(d: Date) {
    return d.toLocaleDateString("es-CO", { timeZone: COL_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  }
  function dayLabel(d: Date) {
    const key  = dayKey(d);
    const hoyK = dayKey(new Date());
    const ayerK = dayKey(new Date(Date.now() - 86_400_000));
    if (key === hoyK)  return "Hoy";
    if (key === ayerK) return "Ayer";
    return d.toLocaleDateString("es-CO", { timeZone: COL_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  const actividadPorDia = new Map<string, { label: string; historialUrl: string; items: typeof actividadReciente }>();
  for (const h of actividadReciente) {
    const k = dayKey(h.createdAt);
    if (!actividadPorDia.has(k)) {
      const iso = h.createdAt.toISOString().slice(0, 10);
      actividadPorDia.set(k, { label: dayLabel(h.createdAt), historialUrl: `/dashboard/historial?desde=${iso}&hasta=${iso}`, items: [] });
    }
    actividadPorDia.get(k)!.items.push(h);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Panel de control</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Bienvenido, {session?.user?.name || session?.user?.email}.
          </p>
        </div>
        {ingresadosHoy > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium rounded-full border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {ingresadosHoy} plano{ingresadosHoy !== 1 ? "s" : ""} ingresado{ingresadosHoy !== 1 ? "s" : ""} hoy
          </span>
        )}
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total en sistema" value={totalPlanos}         icon={FileText}       colorBg="bg-blue-50 dark:bg-blue-900/30"     colorText="text-blue-600 dark:text-blue-400"    href="/dashboard/buscar" />
        <StatCard label="Disponibles"       value={disponibles}        icon={BookOpen}       colorBg="bg-emerald-50 dark:bg-emerald-900/30" colorText="text-emerald-600 dark:text-emerald-400" href="/dashboard/buscar?estado=DISPONIBLE" />
        <StatCard label="Prestados"         value={prestados}          icon={Clock}          colorBg="bg-amber-50 dark:bg-amber-900/30"    colorText="text-amber-600 dark:text-amber-400"   href="/dashboard/buscar?estado=PRESTADO" />
        <StatCard label="Pend. revisión"    value={pendientesRevision} icon={AlertTriangle}  colorBg="bg-orange-50 dark:bg-orange-900/30"  colorText="text-orange-600 dark:text-orange-400" href="/dashboard/buscar?estado=PENDIENTE_REVISION" />
        <StatCard label="Archivados"        value={archivados}         icon={Archive}        colorBg="bg-slate-100 dark:bg-slate-800"      colorText="text-slate-600 dark:text-slate-400"   href="/dashboard/buscar?estado=ARCHIVADO" />
      </div>

      {/* Alertas urgentes */}
      {(alertasSolicitudes.length > 0 || alertasDevoluciones.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {alertasSolicitudes.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
                <BellRing className="h-4 w-4 text-amber-500" />
                Solicitudes pendientes
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-bold">
                  {solicitudesPendientes}
                </span>
              </h2>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
                {alertasSolicitudes.map((s) => (
                  <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{s.plan.radicado}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {s.user.name || s.user.email}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/entregados/gestionar/${s.id}`}
                      className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Gestionar
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alertasDevoluciones.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
                <CornerUpLeft className="h-4 w-4 text-purple-500" />
                Devoluciones pendientes
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 font-bold">
                  {devolucionesPendientes}
                </span>
              </h2>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
                {alertasDevoluciones.map((s) => (
                  <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{s.plan.radicado}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {s.user.name || s.user.email}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/entregados/gestionar/${s.id}`}
                      className="shrink-0 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Confirmar
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actividad reciente agrupada por día */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Actividad reciente
            {actividadReciente.length > 0 && (
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {actividadReciente.length}
              </span>
            )}
          </h2>
          <Link href="/dashboard/historial" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Ver historial completo →
          </Link>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {actividadPorDia.size === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              Sin actividad registrada. Consulta el{" "}
              <Link href="/dashboard/historial" className="text-blue-600 dark:text-blue-400 hover:underline">Historial</Link>.
            </p>
          ) : (
            Array.from(actividadPorDia.entries()).map(([k, { label, historialUrl, items }]) => (
              <div key={k}>
                {/* Cabecera del día */}
                <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
                  <Link href={historialUrl} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    Ver día completo →
                  </Link>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((h) => (
                    <li key={h.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800 dark:text-slate-200 truncate">
                          <span className="font-medium">{ACCION_LABELS[h.accion] ?? h.accion}</span>
                          {" — "}
                          <Link href={`/dashboard/buscar/${h.plan.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            {h.plan.radicado}
                          </Link>
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          {h.user.name || h.user.email} · {new Date(h.createdAt).toLocaleString("es-CO", { timeZone: COL_TZ, timeStyle: "short" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
