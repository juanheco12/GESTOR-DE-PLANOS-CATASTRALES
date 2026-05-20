"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CornerUpLeft } from "lucide-react";

export default function SolicitarDevolucionBoton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDevolucion = async () => {
    if (!confirm("¿Deseas solicitar la devolución de este plano al archivo?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accion: "SOLICITAR_DEVOLUCION" })
      });

      if (!res.ok) {
        throw new Error("Error al solicitar devolución");
      }

      alert("Solicitud de devolución enviada al administrador.");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDevolucion}
      disabled={loading}
      className="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-sm font-medium transition-colors"
    >
      <CornerUpLeft className="mr-1.5 h-4 w-4" />
      {loading ? "Procesando..." : "Devolución de plano"}
    </button>
  );
}
