"use client";

import { useState } from "react";
import { Users, Shield, ListChecks, ClipboardList, DatabaseBackup, BarChart3, Inbox, Bell, FolderOpen } from "lucide-react";
import UsersTab          from "./UsersTab";
import SecurityTab       from "./SecurityTab";
import ReceiversTab      from "./ReceiversTab";
import AuditTab          from "./AuditTab";
import BackupTab         from "./BackupTab";
import ReporteTab        from "./ReporteTab";
import SolicitudesTab    from "./SolicitudesTab";
import NotificacionesTab from "./NotificacionesTab";
import PlanosTab         from "./PlanosTab";

type Tab = "users" | "receivers" | "planos" | "solicitudes" | "notificaciones" | "security" | "audit" | "backup" | "reporte";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "users",          label: "Usuarios",        icon: Users },
  { id: "receivers",      label: "Receptores",      icon: ListChecks },
  { id: "planos",         label: "Planos",          icon: FolderOpen },
  { id: "solicitudes",    label: "Solicitudes",     icon: Inbox },
  { id: "notificaciones", label: "Notificaciones",  icon: Bell },
  { id: "security",       label: "Mi Cuenta",       icon: Shield },
  { id: "audit",          label: "Auditoría",       icon: ClipboardList },
  { id: "backup",         label: "Respaldo",        icon: DatabaseBackup },
  { id: "reporte",        label: "Reporte Mensual", icon: BarChart3 },
];

export default function ConfigTabs({ initialUsers, initialReceivers }: { initialUsers: any[]; initialReceivers: any[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("users");

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-shrink-0 flex items-center justify-center py-4 px-5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? "bg-blue-50/50 dark:bg-blue-900/20 border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <t.icon className="mr-2 h-4 w-4 shrink-0" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6 md:p-8">
        {activeTab === "users"          && <UsersTab          initialUsers={initialUsers} />}
        {activeTab === "receivers"      && <ReceiversTab      initialReceivers={initialReceivers} />}
        {activeTab === "planos"         && <PlanosTab />}
        {activeTab === "solicitudes"    && <SolicitudesTab />}
        {activeTab === "notificaciones" && <NotificacionesTab />}
        {activeTab === "security"       && <SecurityTab />}
        {activeTab === "audit"          && <AuditTab />}
        {activeTab === "backup"         && <BackupTab />}
        {activeTab === "reporte"        && <ReporteTab />}
      </div>
    </div>
  );
}
