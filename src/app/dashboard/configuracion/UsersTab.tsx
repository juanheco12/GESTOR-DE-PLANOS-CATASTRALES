"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Ban, CheckCircle2, Trash2, ShieldAlert } from "lucide-react";

export default function UsersTab({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  
  // States for creating user
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [createError, setCreateError] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("CREATE");
    setCreateError("");

    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear usuario");
      }

      alert("Usuario Ejecutor creado correctamente.");
      setFormData({ name: "", email: "", password: "" });
      setIsCreating(false);
      router.refresh(); // Refresh server state
      window.location.reload(); // Simple reload to get fresh data
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? "BLOQUEAR" : "DESBLOQUEAR";
    if (!confirm(`¿Estás seguro de que deseas ${action} este usuario?`)) return;
    
    setLoadingAction(`TOGGLE_${userId}`);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!res.ok) throw new Error("Error al cambiar estado del usuario");
      
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("⚠️ ATENCIÓN: Solo debes eliminar un usuario si fue creado por error y no tiene registros (planos firmados o historial). De lo contrario, el sistema dará error. ¿Deseas intentarlo?")) return;

    setLoadingAction(`DELETE_${userId}`);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar usuario");
      }

      alert("Usuario eliminado correctamente.");
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Sección Crear Usuario */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Cuentas de Ejecutores</h3>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {isCreating ? "Cancelar" : "Nuevo Ejecutor"}
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateUser} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-6" autoComplete="off">
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-4">Registrar Nuevo Ejecutor</h4>
            
            {createError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {createError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico *</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña *</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button disabled={loadingAction === "CREATE"} type="submit" className="px-6 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {loadingAction === "CREATE" ? "Creando..." : "Crear Perfil"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Lista de Usuarios */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Nombre</th>
              <th className="px-6 py-3 font-medium">Correo</th>
              <th className="px-6 py-3 font-medium">Rol</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.length > 0 ? (
              users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-red-600 dark:text-red-400">
                        <Ban className="mr-1 h-4 w-4" /> Bloqueado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button 
                        onClick={() => handleToggleBlock(user.id, user.isActive)}
                        disabled={loadingAction === `TOGGLE_${user.id}`}
                        className={`text-sm font-medium hover:underline disabled:opacity-50 ${user.isActive ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500'}`}
                      >
                        {user.isActive ? "Bloquear" : "Desbloquear"}
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        disabled={loadingAction === `DELETE_${user.id}`}
                        className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 hover:underline disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay otros usuarios registrados en el sistema.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
