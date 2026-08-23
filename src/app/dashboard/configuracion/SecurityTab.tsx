"use client";

import { useState } from "react";
import { KeyRound, CheckCircle2 } from "lucide-react";

export default function SecurityTab() {
  const [formData, setFormData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (formData.newPassword !== formData.confirmPassword) {
      setError("La nueva contraseña y la confirmación no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/cambiar-clave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al cambiar la contraseña");
      }

      setSuccess(true);
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
          <KeyRound className="h-8 w-8 text-slate-600 dark:text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Cambiar Contraseña</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Asegúrate de usar una contraseña fuerte y segura para proteger tu cuenta de administrador.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100 flex items-center">
            <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-500" />
            ¡Contraseña actualizada correctamente!
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña Actual</label>
          <input 
            type="password" 
            required
            value={formData.currentPassword}
            onChange={e => setFormData({...formData, currentPassword: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-marca-500" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña</label>
          <input 
            type="password" 
            required
            minLength={6}
            value={formData.newPassword}
            onChange={e => setFormData({...formData, newPassword: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-marca-500" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Nueva Contraseña</label>
          <input 
            type="password" 
            required
            minLength={6}
            value={formData.confirmPassword}
            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-marca-500" 
          />
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-marca-700 hover:bg-marca-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </div>
      </form>
    </div>
  );
}
