"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { UserPlus, Ban, CheckCircle2, Trash2, ShieldCheck, KeyRound, Mail, Pencil, UserCog, LogIn } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "ADMINISTRADOR",  label: "Administrador" },
  { value: "ENCARGADO",      label: "Encargado" },
  { value: "EJECUTOR",       label: "Ejecutor" },
  { value: "RADICADORA",     label: "Radicador" },
  { value: "DIGITALIZADOR",  label: "Digitalizador" },
];

const ROLE_COLORS: Record<string, string> = {
  ADMINISTRADOR: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  ENCARGADO:     "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  EJECUTOR:      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  DIGITALIZADOR: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RADICADORA:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export default function UsersTab({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "EJECUTOR" });
  const [createError, setCreateError] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [changingPwdFor, setChangingPwdFor] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [changingEmailFor, setChangingEmailFor] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [changingNameFor, setChangingNameFor] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [roleError, setRoleError] = useState("");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("CREATE");
    setCreateError("");

    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear usuario");
      }

      setFormData({ name: "", email: "", password: "", role: "EJECUTOR" });
      setIsCreating(false);
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? "bloquear" : "desbloquear";
    if (!confirm(`¿Estás seguro de que deseas ${action} este usuario?`)) return;

    setLoadingAction(`TOGGLE_${userId}`);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado del usuario");
      setUsers(users.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChangeRole = async (userId: string) => {
    if (!newRole) {
      setRoleError("Selecciona un rol");
      return;
    }
    setLoadingAction(`ROLE_${userId}`);
    setRoleError("");
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cambiar rol");
      }
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setChangingRoleFor(null);
      setNewRole("");
    } catch (err: any) {
      setRoleError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChangeName = async (userId: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setNameError("El nombre no puede estar vacío");
      return;
    }
    setLoadingAction(`NAME_${userId}`);
    setNameError("");
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cambiar nombre");
      }
      setUsers(users.map((u) => (u.id === userId ? { ...u, name: trimmed } : u)));
      setChangingNameFor(null);
      setNewName("");
    } catch (err: any) {
      setNameError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChangeEmail = async (userId: string) => {
    const trimmed = newEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Correo electrónico no válido");
      return;
    }
    setLoadingAction(`EMAIL_${userId}`);
    setEmailError("");
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cambiar correo");
      }
      setUsers(users.map((u) => (u.id === userId ? { ...u, email: trimmed.toLowerCase() } : u)));
      setChangingEmailFor(null);
      setNewEmail("");
    } catch (err: any) {
      setEmailError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChangePassword = async (userId: string) => {
    if (!newPwd || newPwd.length < 6) {
      setPwdError("Mínimo 6 caracteres");
      return;
    }
    setLoadingAction(`PWD_${userId}`);
    setPwdError("");
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPwd }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cambiar contraseña");
      }
      setChangingPwdFor(null);
      setNewPwd("");
    } catch (err: any) {
      setPwdError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // Entra a la cuenta de otro usuario sin cambiarle la contraseña
  const handleEntrarComo = async (userId: string, nombre: string) => {
    if (!confirm(
      `Vas a ver el sistema como ${nombre}.\n\n` +
      `Se cerrará tu sesión de administrador y quedará registrado en la auditoría. ` +
      `Para volver a la tuya tendrás que iniciar sesión de nuevo.\n\n¿Continuar?`
    )) return;

    setLoadingAction(`ENTRAR_${userId}`);
    try {
      const res  = await fetch("/api/admin/suplantar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo entrar a la cuenta");

      // El vale vence en un minuto: se canjea de inmediato
      await signIn("suplantar", { vale: data.vale, callbackUrl: "/dashboard" });
    } catch (err: any) {
      alert(err.message);
      setLoadingAction(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("⚠️ Solo elimina usuarios sin registros en el sistema (sin firmas ni historial). ¿Deseas continuar?")) return;

    setLoadingAction(`DELETE_${userId}`);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar usuario");
      }
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gestión de Usuarios</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Crea, bloquea o elimina cuentas de acceso al sistema.</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {isCreating ? "Cancelar" : "Nuevo Usuario"}
        </button>
      </div>

      {/* Formulario */}
      {isCreating && (
        <form
          onSubmit={handleCreateUser}
          className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700"
          autoComplete="off"
        >
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-700" /> Registrar Nuevo Usuario
          </h4>

          {createError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico *</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña *</label>
              <input
                required
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loadingAction === "CREATE"}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loadingAction === "CREATE" ? "Creando..." : "Crear Perfil"}
            </button>
          </div>
        </form>
      )}

      {/* Tabla de usuarios */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
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
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${ROLE_COLORS[user.role] ?? "bg-slate-100 text-slate-700"}`}>
                      {ROLE_OPTIONS.find((r) => r.value === user.role)?.label ?? user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm">
                        <CheckCircle2 className="h-4 w-4" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                        <Ban className="h-4 w-4" /> Bloqueado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEntrarComo(user.id, user.name ?? user.email)}
                          disabled={loadingAction === `ENTRAR_${user.id}`}
                          title="Ver el sistema como este usuario, sin cambiarle la contraseña"
                          className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          {loadingAction === `ENTRAR_${user.id}` ? "Entrando…" : "Entrar como"}
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          onClick={() => { setChangingRoleFor(changingRoleFor === user.id ? null : user.id); setNewRole(user.role ?? ""); setRoleError(""); setChangingNameFor(null); setChangingEmailFor(null); setChangingPwdFor(null); }}
                          className="text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          <UserCog className="h-3.5 w-3.5" />
                          Rol
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          onClick={() => { setChangingNameFor(changingNameFor === user.id ? null : user.id); setNewName(user.name ?? ""); setNameError(""); setChangingEmailFor(null); setChangingPwdFor(null); setChangingRoleFor(null); }}
                          className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:underline inline-flex items-center gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Nombre
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          onClick={() => { setChangingEmailFor(changingEmailFor === user.id ? null : user.id); setNewEmail(user.email ?? ""); setEmailError(""); setChangingPwdFor(null); setChangingNameFor(null); setChangingRoleFor(null); }}
                          className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Correo
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          onClick={() => { setChangingPwdFor(changingPwdFor === user.id ? null : user.id); setNewPwd(""); setPwdError(""); setChangingEmailFor(null); setChangingNameFor(null); setChangingRoleFor(null); }}
                          className="text-sm font-medium text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Clave
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          onClick={() => handleToggleBlock(user.id, user.isActive)}
                          disabled={loadingAction === `TOGGLE_${user.id}`}
                          className={`text-sm font-medium hover:underline disabled:opacity-50 ${user.isActive ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-500"}`}
                        >
                          {user.isActive ? "Bloquear" : "Desbloquear"}
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={loadingAction === `DELETE_${user.id}`}
                          className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-500 hover:underline disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                      {changingRoleFor === user.id && (
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-40"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleChangeRole(user.id)}
                            disabled={loadingAction === `ROLE_${user.id}` || newRole === user.role}
                            className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50"
                          >
                            {loadingAction === `ROLE_${user.id}` ? "..." : "Guardar"}
                          </button>
                          {roleError && <span className="text-xs text-red-500">{roleError}</span>}
                        </div>
                      )}
                      {changingNameFor === user.id && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            placeholder="Nuevo nombre"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleChangeName(user.id)}
                            className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-48"
                          />
                          <button
                            onClick={() => handleChangeName(user.id)}
                            disabled={loadingAction === `NAME_${user.id}`}
                            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-800 text-white rounded disabled:opacity-50"
                          >
                            {loadingAction === `NAME_${user.id}` ? "..." : "Guardar"}
                          </button>
                          {nameError && <span className="text-xs text-red-500">{nameError}</span>}
                        </div>
                      )}
                      {changingEmailFor === user.id && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="email"
                            placeholder="Nuevo correo"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-48"
                          />
                          <button
                            onClick={() => handleChangeEmail(user.id)}
                            disabled={loadingAction === `EMAIL_${user.id}`}
                            className="px-2 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded disabled:opacity-50"
                          >
                            {loadingAction === `EMAIL_${user.id}` ? "..." : "Guardar"}
                          </button>
                          {emailError && <span className="text-xs text-red-500">{emailError}</span>}
                        </div>
                      )}
                      {changingPwdFor === user.id && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="password"
                            placeholder="Nueva contraseña"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-40"
                          />
                          <button
                            onClick={() => handleChangePassword(user.id)}
                            disabled={loadingAction === `PWD_${user.id}`}
                            className="px-2 py-1 text-xs bg-teal-700 hover:bg-teal-800 text-white rounded disabled:opacity-50"
                          >
                            {loadingAction === `PWD_${user.id}` ? "..." : "Guardar"}
                          </button>
                          {pwdError && <span className="text-xs text-red-500">{pwdError}</span>}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                  No hay otros usuarios registrados en el sistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
