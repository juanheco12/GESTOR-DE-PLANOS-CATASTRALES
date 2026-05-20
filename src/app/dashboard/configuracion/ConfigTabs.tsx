"use client";

import { useState } from "react";
import { Users, Shield } from "lucide-react";
import UsersTab from "./UsersTab";
import SecurityTab from "./SecurityTab";

export default function ConfigTabs({ initialUsers }: { initialUsers: any[] }) {
  const [activeTab, setActiveTab] = useState<"users" | "security">("users");

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "bg-blue-50/50 dark:bg-blue-900/20 border-b-2 border-blue-600 text-blue-600 dark:text-blue-500"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="mr-2 h-4 w-4" />
          Gestión de Usuarios (Ejecutores)
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-medium transition-colors ${
            activeTab === "security"
              ? "bg-blue-50/50 dark:bg-blue-900/20 border-b-2 border-blue-600 text-blue-600 dark:text-blue-500"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Shield className="mr-2 h-4 w-4" />
          Seguridad (Mi Cuenta)
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6 md:p-8">
        {activeTab === "users" && <UsersTab initialUsers={initialUsers} />}
        {activeTab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}
