"use client";

import { useState } from "react";
import { Loader2, CheckCircle, XCircle, Key, Server } from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type ConnectionStatus = "idle" | "testing" | "ok" | "error";

export default function SettingsPanel() {
  const [backendUrl, setBackendUrl] = useState(API);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [saved, setSaved] = useState(false);

  const testConnection = async () => {
    setStatus("testing");
    setStatusMsg("");
    try {
      const resp = await axios.get(`${backendUrl}/api/health`, { timeout: 5000 });
      if (resp.status === 200) {
        setStatus("ok");
        setStatusMsg("Conexión establecida correctamente.");
      } else {
        throw new Error("Respuesta inesperada");
      }
    } catch {
      setStatus("error");
      setStatusMsg("No se pudo conectar al backend. Verifica que esté corriendo.");
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h2 className="text-base font-semibold text-gray-100">Configuración</h2>
        <p className="text-xs text-gray-500 mt-0.5">Ajustes de conexión y credenciales del sistema.</p>
      </div>

      {/* Backend URL */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Server size={14} className="text-emerald-500" />
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Backend</p>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">URL del servidor FastAPI</label>
          <input
            type="url"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={testConnection}
            disabled={status === "testing"}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
          >
            {status === "testing" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : status === "ok" ? (
              <CheckCircle size={13} className="text-emerald-400" />
            ) : status === "error" ? (
              <XCircle size={13} className="text-red-400" />
            ) : null}
            Probar conexión
          </button>
          {statusMsg && (
            <p className={`text-xs ${status === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {statusMsg}
            </p>
          )}
        </div>
      </div>

      {/* API Key */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Key size={14} className="text-emerald-500" />
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Anthropic API Key</p>
        </div>
        <p className="text-xs text-gray-500">
          La API key se configura en el archivo <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">.env</code> del backend{" "}
          (<code className="font-mono text-gray-400">ANTHROPIC_API_KEY=sk-ant-…</code>). Este campo es solo informativo.
        </p>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Clave actual (últimos 4 chars)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {saved ? "¡Guardado!" : "Guardar configuración"}
      </button>

      {/* Info box */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="text-gray-400 font-medium mb-2">Comandos para iniciar el sistema:</p>
        <p className="font-mono text-gray-500">Backend: <span className="text-emerald-400">cd backend && uvicorn main:app --reload --port 8000</span></p>
        <p className="font-mono text-gray-500">Frontend: <span className="text-emerald-400">cd frontend && npm run dev</span></p>
      </div>
    </div>
  );
}
