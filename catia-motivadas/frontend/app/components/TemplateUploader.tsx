"use client";

import { useRef, useState } from "react";
import { Upload, FileCheck, AlertCircle, Info } from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const MARKERS = [
  { tag: "{{EXPEDIENTE}}", desc: "Número del expediente" },
  { tag: "{{NUMERO_PREDIO}}", desc: "Número catastral del predio" },
  { tag: "{{PROPIETARIO_NOMBRE}}", desc: "Nombre completo del propietario" },
  { tag: "{{PROPIETARIO_CEDULA}}", desc: "Cédula del propietario" },
  { tag: "{{FECHA_SOLICITUD}}", desc: "Fecha de la solicitud" },
  { tag: "{{TIPO_MUTACION}}", desc: "Tipo de mutación catastral" },
  { tag: "{{MOTIVADA}}", desc: "Texto completo de la motivada (generado por IA)" },
  { tag: "{{FUNCIONARIO_NOMBRE}}", desc: "Nombre del funcionario catastral" },
  { tag: "{{FUNCIONARIO_CARGO}}", desc: "Cargo del funcionario" },
];

export default function TemplateUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [current, setCurrent] = useState<string>("");

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".docx")) {
      setResult({ success: false, message: "Solo se aceptan archivos .docx" });
      return;
    }
    setUploading(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      await axios.post(`${API}/api/template/upload`, form);
      setCurrent(file.name);
      setResult({ success: true, message: `Plantilla "${file.name}" cargada correctamente.` });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.detail ?? err.message : "Error al subir plantilla";
      setResult({ success: false, message: String(msg) });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-gray-100">Plantilla de Documento</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Sube un archivo Word (.docx) con marcadores para personalizar el documento generado.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          dragging
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-gray-700 hover:border-gray-600 bg-gray-900/50"
        }`}
      >
        <input ref={inputRef} type="file" accept=".docx" className="hidden" onChange={onInputChange} />
        <Upload size={28} className={dragging ? "text-emerald-400" : "text-gray-500"} strokeWidth={1.5} />
        <div className="text-center">
          <p className="text-sm text-gray-300">{uploading ? "Subiendo…" : "Arrastra un archivo .docx aquí"}</p>
          <p className="text-xs text-gray-600 mt-1">o haz clic para seleccionar</p>
        </div>
        {current && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <FileCheck size={13} />
            Plantilla actual: <span className="font-mono">{current}</span>
          </div>
        )}
      </div>

      {/* Result message */}
      {result && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-lg border text-sm ${
          result.success
            ? "bg-emerald-900/20 border-emerald-700/40 text-emerald-300"
            : "bg-red-900/20 border-red-700/40 text-red-300"
        }`}>
          {result.success ? <FileCheck size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          {result.message}
        </div>
      )}

      {/* Markers guide */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={14} className="text-emerald-500" />
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Marcadores disponibles</p>
        </div>
        <div className="space-y-2">
          {MARKERS.map(({ tag, desc }) => (
            <div key={tag} className="flex items-baseline gap-3">
              <code className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                {tag}
              </code>
              <span className="text-xs text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Si no subes una plantilla, se usará una plantilla por defecto con todos los marcadores.
        </p>
      </div>
    </div>
  );
}
