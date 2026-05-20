"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, CornerDownLeft } from "lucide-react";

export default function ActionButtons({ requestId, estado }: { requestId: string, estado: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async (accion: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });

      if (!res.ok) {
        throw new Error("Error al procesar la solicitud");
      }

      alert("Acción procesada correctamente.");
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {estado === "PENDIENTE" && (
        <>
          <p className="text-slate-600 dark:text-slate-300">
            Al marcar este plano como entregado, se habilitará la opción para que el Ejecutor firme digitalmente la recepción.
          </p>
          <button
            onClick={() => handleAction("MARCAR_LISTO")}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Marcar como Entregado (Pendiente de Firma)
          </button>
        </>
      )}

      {estado === "DEVOLUCION_SOLICITADA" && (
        <>
          <p className="text-slate-600 dark:text-slate-300">
            El ejecutor ha traído el plano físico. Confirma la recepción para devolverlo al archivo.
          </p>
          <button
            onClick={() => handleAction("ACEPTAR_DEVOLUCION")}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
          >
            <CornerDownLeft className="mr-2 h-5 w-5" />
            Confirmar Recepción de Plano
          </button>
        </>
      )}

      {(estado !== "PENDIENTE" && estado !== "DEVOLUCION_SOLICITADA") && (
        <p className="text-slate-500 italic">No hay acciones disponibles para este estado.</p>
      )}
    </div>
  );
}
