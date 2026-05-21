"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit3, Trash2, CheckCircle2, XCircle } from "lucide-react";

export default function ReceiversTab({ initialReceivers }: { initialReceivers: any[] }) {
  const router = useRouter();
  const [receivers, setReceivers] = useState(initialReceivers);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refreshReceivers = async () => {
    const res = await fetch("/api/receivers");
    if (res.ok) {
      const data = await res.json();
      setReceivers(data);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Ingresa un nombre de receptor válido.");
      return;
    }
    setLoadingId("create");
    setError("");
    try {
      const res = await fetch("/api/receivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear receptor");
      }
      setReceivers([data, ...receivers]);
      setNewName("");
      setIsCreating(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleStartEdit = (receiver: any) => {
    setEditId(receiver.id);
    setEditName(receiver.name);
    setError("");
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditName("");
    setError("");
  };

  const handleUpdate = async (receiverId: string) => {
    if (!editName.trim()) {
      setError("Ingresa un nombre de receptor válido.");
      return;
    }
    setLoadingId(receiverId);
    setError("");

    try {
      const res = await fetch(`/api/receivers/${receiverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar receptor");
      }
      setReceivers(receivers.map((item) => (item.id === receiverId ? data : item)));
      setEditId(null);
      setEditName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (receiverId: string) => {
    if (!confirm("¿Eliminar este nombre de receptor? Esta acción no se puede deshacer.")) return;
    setLoadingId(receiverId);
    setError("");
    try {
      const res = await fetch(`/api/receivers/${receiverId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar receptor");
      }
      setReceivers(receivers.filter((item) => item.id !== receiverId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Receptores de Planos</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Añade, edita o elimina los nombres de personas que pueden recibir planos.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreating(!isCreating);
            setError("");
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          {isCreating ? "Cancelar" : "Nuevo Receptor"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del receptor"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loadingId === "create"}
              className="inline-flex items-center justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-60"
            >
              {loadingId === "create" ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </form>
      )}

      {error && !isCreating && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Nombre</th>
              <th className="px-6 py-3 font-medium">Creado</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {receivers.length > 0 ? (
              receivers.map((receiver) => (
                <tr key={receiver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4">
                    {editId === receiver.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <span className="font-medium text-slate-900 dark:text-slate-100">{receiver.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(receiver.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {editId === receiver.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(receiver.id)}
                          disabled={loadingId === receiver.id}
                          className="inline-flex items-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors disabled:opacity-60"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="inline-flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm transition-colors"
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(receiver)}
                          className="inline-flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm transition-colors"
                        >
                          <Edit3 className="mr-2 h-4 w-4" /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(receiver.id)}
                          disabled={loadingId === receiver.id}
                          className="inline-flex items-center px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-sm transition-colors disabled:opacity-60"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  No hay receptores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
