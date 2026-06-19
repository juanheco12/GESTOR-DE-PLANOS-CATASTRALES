"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

const COOLDOWN_MS = 15 * 60 * 1000;

function formatRemaining(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function RecordarBoton({
  requestId,
  ultimoRecordatorio,
}: {
  requestId: string;
  ultimoRecordatorio: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lastSent, setLastSent] = useState<number | null>(
    ultimoRecordatorio ? new Date(ultimoRecordatorio).getTime() : null
  );
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!lastSent) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const left = COOLDOWN_MS - (Date.now() - lastSent);
      setRemaining(left > 0 ? left : 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastSent]);

  const onCooldown = remaining > 0;

  const handleRecordar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "RECORDAR" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.segundosRestantes) {
          setLastSent(Date.now() - (COOLDOWN_MS - data.segundosRestantes * 1000));
        }
        throw new Error(data.error || "No se pudo enviar el recordatorio");
      }
      setLastSent(Date.now());
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRecordar}
      disabled={loading || onCooldown}
      title={
        onCooldown
          ? `Podrás volver a recordar en ${formatRemaining(remaining)}`
          : "Reenviar notificación al receptor"
      }
      className="inline-flex items-center px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Bell className="mr-1.5 h-4 w-4" />
      {loading ? "Enviando..." : onCooldown ? `Recordar (${formatRemaining(remaining)})` : "Recordar"}
    </button>
  );
}
