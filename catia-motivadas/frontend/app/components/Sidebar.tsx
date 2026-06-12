"use client";

import { FileText, History, Upload, Settings, Map } from "lucide-react";

type Tab = "generar" | "historial" | "template" | "config";

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "generar",   label: "Generar",   icon: <FileText  size={18} /> },
  { id: "historial", label: "Historial", icon: <History   size={18} /> },
  { id: "template",  label: "Plantilla", icon: <Upload    size={18} /> },
  { id: "config",    label: "Config",    icon: <Settings  size={18} /> },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Map size={16} className="text-gray-950" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-100 leading-none">CatIA</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-none">Motivadas Catastrales</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-[10px] text-gray-600">IGAC — Catastro Colombia</p>
        <p className="text-[10px] text-gray-700 mt-0.5">v0.1.0-MVP</p>
      </div>
    </aside>
  );
}
