"use client";

import { useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Save, Eraser, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FirmarPlanoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const sigCanvas = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clear = () => {
    sigCanvas.current.clear();
  };

  const handleSave = async () => {
    if (sigCanvas.current.isEmpty()) {
      setError("Por favor, dibuja tu firma antes de guardar.");
      return;
    }

    setLoading(true);
    setError("");
    const signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");

    try {
      const res = await fetch(`/api/solicitudes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "FIRMAR", firma: signatureBase64 }),
      });

      if (!res.ok) {
        throw new Error("Error al guardar la firma");
      }

      alert("Firma guardada correctamente. Has recibido el plano.");
      router.push("/dashboard/solicitudes");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center">
        <Link href="/dashboard" className="mr-4 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Firma Digital</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Firma en el recuadro blanco para confirmar la recepción física del plano.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-white overflow-hidden touch-none mb-4" style={{ height: "300px", position: "relative" }}>
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: "sigCanvas w-full h-full",
              style: { width: "100%", height: "100%" }
            }}
            backgroundColor="rgb(255, 255, 255)"
            penColor="black"
          />
        </div>

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={clear}
            className="inline-flex items-center px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
          >
            <Eraser className="mr-2 h-4 w-4" />
            Limpiar
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70"
          >
            <Save className="mr-2 h-5 w-5" />
            {loading ? "Guardando..." : "Guardar Firma"}
          </button>
        </div>
      </div>
    </div>
  );
}
