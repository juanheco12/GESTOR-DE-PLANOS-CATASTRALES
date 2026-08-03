"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Search,
  LogOut,
  Menu,
  X,
  FileCheck2,
  Settings,
  FilePlus2,
  ClipboardList,
  History,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import InactivityLogout from "@/components/InactivityLogout";
import NotificationBell from "@/components/NotificationBell";
import PushManager from "@/components/PushManager";
import SessionGuard from "@/components/SessionGuard";
import VerificacionPanel from "@/components/VerificacionPanel";
import LlamarDigitalizadorPanel from "@/components/LlamarDigitalizadorPanel";
import PerfilPanel from "@/components/PerfilPanel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role            = session?.user?.role;
  const isEjecutor      = role === "EJECUTOR" || role === "DIGITALIZADOR";
  const isDigitalizador = role === "DIGITALIZADOR";
  // Ventanilla: quienes pueden llamar al digitalizador para revisar un plano
  const isVentanilla    = role === "RADICADORA" || role === "ENCARGADO" || role === "ADMINISTRADOR";
  const isAdministrador = role === "ADMINISTRADOR";
  const isRadicadora    = role === "RADICADORA";
  const showPushBell    = role === "ADMINISTRADOR" || role === "ENCARGADO";
  const showNotifBell   = role === "ADMINISTRADOR" || role === "ENCARGADO" || role === "EJECUTOR" || role === "DIGITALIZADOR";

  const navigation = [
    { name: "Inicio",        href: "/dashboard",            icon: LayoutDashboard },
    { name: "Buscar plano",  href: "/dashboard/buscar",     icon: Search },
    // EJECUTOR
    ...(isEjecutor
      ? [{ name: "Mis Solicitudes", href: "/dashboard/solicitudes", icon: FileCheck2 }]
      : []),
    // RADICADORA
    ...(isRadicadora
      ? [{ name: "Registrar plano", href: "/dashboard/registro", icon: FilePlus2 }]
      : []),
    // ADMINISTRADOR y ENCARGADO
    ...(!isEjecutor && !isRadicadora
      ? [
          { name: "Registrar plano",    href: "/dashboard/registro",   icon: FilePlus2 },
          { name: "Planos entregados",  href: "/dashboard/entregados", icon: FileCheck2 },
          { name: "Historial",          href: "/dashboard/historial",  icon: History },
        ]
      : []),
    ...(isAdministrador
      ? [{ name: "Configuración", href: "/dashboard/configuracion", icon: Settings }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <SessionGuard />
      <InactivityLogout />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:w-72 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-700 to-teal-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Map className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-wide text-white truncate">Catastro Montería</span>
          </div>
          <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
                  isActive
                    ? "bg-teal-700 text-white shadow-sm shadow-teal-200 dark:shadow-teal-900/50"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Usuario */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 mb-1">
            <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-white text-sm font-bold uppercase shrink-0">
              {session?.user?.name?.[0] || session?.user?.email?.[0] || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                {session?.user?.name || "Usuario"}
              </p>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md leading-tight mt-0.5 ${
                role === "ADMINISTRADOR" ? "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/40" :
                role === "ENCARGADO"     ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40" :
                role === "RADICADORA"    ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/40" :
                "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800"
              }`}>
                {role === "ADMINISTRADOR" ? "Administrador" : role === "ENCARGADO" ? "Encargado" : role === "RADICADORA" ? "Radicador" : role === "EJECUTOR" ? "Ejecutor" : role === "DIGITALIZADOR" ? "Digitalizador" : role}
              </span>
            </div>
            <PerfilPanel
              nombre={session?.user?.name ?? "Usuario"}
              correo={session?.user?.email ?? ""}
              rol={role ?? ""}
            />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 lg:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[180px]">Catastro Montería</span>
          <div className="flex items-center gap-1">
            <PushManager />
            {showNotifBell && <NotificationBell />}
            <ThemeToggle />
          </div>
        </header>

        {/* Header desktop */}
        <header className="hidden lg:flex h-14 items-center justify-end gap-2 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <PushManager />
          {showNotifBell && <NotificationBell />}
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>

      {/* Verification FAB — only for DIGITALIZADOR */}
      {isDigitalizador && (
        <VerificacionPanel userName={session?.user?.name ?? session?.user?.email ?? "Usuario"} />
      )}

      {/* Plan-verification request FAB — ventanilla */}
      {isVentanilla && <LlamarDigitalizadorPanel isAdmin={isAdministrador} />}
    </div>
  );
}
