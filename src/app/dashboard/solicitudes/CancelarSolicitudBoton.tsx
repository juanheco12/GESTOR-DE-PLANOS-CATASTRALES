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
      title="Cancelar esta solicitud si te equivocaste"
      className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-40"
    >
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      {loading ? "Cancelando…" : "Cancelar"}
    </button>
  );
}
