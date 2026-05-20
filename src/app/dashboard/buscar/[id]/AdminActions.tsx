"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Edit } from "lucide-react";
import Link from "next/link";

export default function AdminActions({ planId }: { planId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("⚠️ ¿ATENCIÓN! ¿Estás absolutamente seguro de querer ELIMINAR este plano? Esta acción no se puede deshacer y quedará registrada en auditoría.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/planos/${planId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar plano");
      }

      alert("Plano eliminado correctamente.");
      router.push("/dashboard/buscar");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex space-x-2">
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
