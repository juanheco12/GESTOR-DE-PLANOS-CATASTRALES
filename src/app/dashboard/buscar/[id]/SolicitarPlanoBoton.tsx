"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export default function SolicitarPlanoBoton({ planId, radicado }: { planId: string, radicado: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSolicitar = async () => {
    if (!confirm(`¿Estás seguro de que deseas solicitar el plano ${radicado}? Se enviará una alerta al Encargado.`)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, observaciones: "Solicitud iniciada desde el detalle del plano." }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al solicitar el plano");
      }

      alert("Solicitud enviada correctamente.");
      router.refresh(); // Recargar la página para actualizar el estado e historial
    } catch (err: any) {
      alert(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSolicitar}
      disabled={loading}
      className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 shadow-sm"
    >
      <Send className="mr-2 h-4 w-4" />
      {loading ? "Solicitando..." : "Solicitar Plano"}
    </button>
  );
}
