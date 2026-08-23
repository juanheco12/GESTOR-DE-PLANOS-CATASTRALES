"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Edit, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function AdminActions({ planId, planEstado }: { planId: string; planEstado: string }) {
  const router = useRouter();
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [isRestoring,  setIsRestoring]  = useState(false);

  const handleDelete = async () => {
    if (!confirm("⚠️ ¿Estás seguro de ELIMINAR este plano? Esta acción no se puede deshacer y quedará registrada en auditoría.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/planos/${planId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al eliminar");
      }
      router.push("/dashboard/buscar");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setIsDeleting(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm("¿Restaurar este plano a estado Disponible?")) return;
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/admin/planos/${planId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ estado: "DISPONIBLE" }),
      });
      if (!res.ok) throw new Error("Error al restaurar");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {/* Restore to DISPONIBLE — only when not already available */}
      {planEstado !== "DISPONIBLE" && (
        <button
          onClick={handleRestore}
          disabled={isRestoring}
          title="Restaurar plano a estado Disponible"
          className="inline-flex items-center px-3 py-1.5 bg-marca-100 hover:bg-marca-200 dark:bg-marca-900/30 dark:hover:bg-marca-900/50 text-marca-800 dark:text-marca-300 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isRestoring ? (
            <span className="mr-1.5 h-4 w-4 block border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <RotateCcw className="mr-1.5 h-4 w-4" />
          )}
          {isRestoring ? "Restaurando..." : "Restaurar a disponible"}
        </button>
      )}

      <Link
        href={`/dashboard/buscar/${planId}/editar`}
        className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium transition-colors"
      >
        <Edit className="mr-1.5 h-4 w-4" />
        Editar
      </Link>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex items-center px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        {isDeleting ? "Eliminando..." : "Eliminar"}
      </button>
    </div>
  );
}
