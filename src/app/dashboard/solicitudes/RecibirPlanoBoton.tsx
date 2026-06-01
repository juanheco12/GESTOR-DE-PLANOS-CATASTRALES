"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";

export default function RecibirPlanoBoton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRecibir = async () => {
    if (!confirm("¿Confirmas que recibiste el plano físicamente del receptor?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${requestId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ accion: "CONFIRMAR_ENTREGA" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al confirmar recepción");
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRecibir}
      disabled={loading}
      className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-60"
    >
      <PackageCheck className="mr-1.5 h-4 w-4" />
      {loading ? "Procesando..." : "Recibir plano"}
    </button>
  );
}
