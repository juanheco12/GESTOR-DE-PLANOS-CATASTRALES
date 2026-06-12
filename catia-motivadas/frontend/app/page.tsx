"use client";

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import FormBuilder from "./components/FormBuilder";
import PreviewMotivada from "./components/PreviewMotivada";
import HistoryPanel from "./components/HistoryPanel";
import TemplateUploader from "./components/TemplateUploader";
import SettingsPanel from "./components/SettingsPanel";

type Tab = "generar" | "historial" | "template" | "config";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("generar");
  const [generatedText, setGeneratedText] = useState("");
  const [currentExpediente, setCurrentExpediente] = useState("");
  const [historialId, setHistorialId] = useState<number | undefined>();

  const handleResult = (text: string, expediente: string, id?: number) => {
    setGeneratedText(text);
    setCurrentExpediente(expediente);
    setHistorialId(id);
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-hidden">
        {activeTab === "generar" && (
          <div className="flex h-screen">
            {/* Form panel */}
            <div className="w-[52%] border-r border-gray-800 overflow-y-auto p-6">
              <FormBuilder onResult={(text, exp) => handleResult(text, exp)} />
            </div>
            {/* Preview panel */}
            <div className="flex-1 overflow-y-auto p-6">
              <PreviewMotivada
                text={generatedText}
                expediente={currentExpediente}
                historialId={historialId}
              />
            </div>
          </div>
        )}

        {activeTab === "historial" && (
          <div className="overflow-y-auto h-screen p-6">
            <HistoryPanel />
          </div>
        )}

        {activeTab === "template" && (
          <div className="overflow-y-auto h-screen p-6 max-w-2xl">
            <TemplateUploader />
          </div>
        )}

        {activeTab === "config" && (
          <div className="overflow-y-auto h-screen p-6">
            <SettingsPanel />
          </div>
        )}
      </main>
    </div>
  );
}
