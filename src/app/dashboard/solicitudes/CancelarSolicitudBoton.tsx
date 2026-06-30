"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function CancelarSolicitudBoton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancelar = async () => {
    if (!confirm("¿Cancelar esta solicitud? Úsalo si te equivocaste al pedir el plano. El plano volverá a estar disponible.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "CANCELAR_SOLICITUD" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo cancelar la solicitud");
      }

      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCancelar}
      disabled={loading}
      className="inline-flex items-center px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
    >
      <XCircle className="mr-1.5 h-4 w-4" />
      {loading ? "Cancelando..." : "Cancelar solicitud"}
    </button>
  );
}
