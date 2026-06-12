"use client";

import { Download, Copy, CheckCheck, FileText } from "lucide-react";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface PreviewMotivadaProps {
  text: string;
  expediente: string;
  historialId?: number;
}

export default function PreviewMotivada({ text, expediente, historialId }: PreviewMotivadaProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!historialId) return;
    setDownloading(true);
    try {
      const resp = await axios.get(`${API}/api/history/${historialId}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motivada_${expediente}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (!text) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-600">
        <FileText size={40} strokeWidth={1} />
        <p className="text-sm">La motivada generada aparecerá aquí</p>
        <p className="text-xs">Completa el formulario y haz clic en &ldquo;Generar Motivada&rdquo;</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">Motivada Generada</h3>
          {expediente && <p className="text-xs text-gray-500 mt-0.5">Expediente: {expediente}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors"
          >
            {copied ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          {historialId && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white transition-colors"
            >
              <Download size={13} />
              {downloading ? "Descargando…" : "Descargar .docx"}
            </button>
          )}
        </div>
      </div>

      {/* Text content */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap font-mono text-xs max-h-[600px] overflow-y-auto">
        {text}
      </div>
    </div>
  );
}
