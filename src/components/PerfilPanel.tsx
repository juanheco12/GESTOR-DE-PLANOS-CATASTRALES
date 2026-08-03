"use client";

import { useState } from "react";
import {
  Settings, X, KeyRound, Check, Eye, EyeOff, Loader2, ShieldCheck,
} from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  ENCARGADO:     "Encargado",
  EJECUTOR:      "Ejecutor",
  RADICADORA:    "Radicador",
  DIGITALIZADOR: "Digitalizador",
};

export default function PerfilPanel({
  nombre,
  correo,
  rol,
}: {
  nombre: string;
  correo: string;
  rol: string;
}) {
  const [open, setOpen] = useState(false);

  const [actual,     setActual]     = useState("");
  const [nueva,      setNueva]      = useState("");
  const [confirmar,  setConfirmar]  = useState("");
  const [verClaves,  setVerClaves]  = useState(false);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState("");
  const [exito,      setExito]      = useState(false);

  const limpiar = () => {
    setActual(""); setNueva(""); setConfirmar("");
    setError(""); setExito(false); setVerClaves(false);
  };

  const cerrar = () => { setOpen(false); limpiar(); };

  const cambiar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!actual)                 { setError("Escribe tu contraseña actual"); return; }
    if (nueva.length < 6)        { setError("La nueva contraseña debe tener al menos 6 caracteres"); return; }
    if (nueva !== confirmar)     { setError("La nueva contraseña y la confirmación no coinciden"); return; }
    if (actual === nueva)        { setError("La nueva contraseña debe ser distinta de la actual"); return; }

    setGuardando(true);
    setError("");
    try {
      const res = await fetch("/api/auth/cambiar-clave", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: actual, newPassword: nueva }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar la contraseña");

      setExito(true);
      setActual(""); setNueva(""); setConfirmar("");
      setTimeout(() => setExito(false), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-600 outline-none transition-colors";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Mi perfil y contraseña"
        aria-label="Mi perfil"
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={cerrar} />

          <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-teal-700 dark:text-teal-400 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Mi Perfil</h2>
              </div>
              <button
                onClick={cerrar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Datos de la cuenta */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="w-11 h-11 rounded-full bg-teal-700 flex items-center justify-center text-white text-lg font-bold uppercase shrink-0">
                  {nombre?.[0] ?? "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{nombre}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{correo}</p>
                  <span className="inline-block mt-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400">
                    {ROLE_LABEL[rol] ?? rol}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
                Para cambiar tu nombre, correo o rol, comunícate con el administrador.
              </p>

              {/* Cambio de contraseña */}
              <form onSubmit={cambiar} className="space-y-3" autoComplete="off">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pt-1">
                  <KeyRound className="h-4 w-4 text-slate-500 shrink-0" />
                  Cambiar contraseña
                </h3>

                {error && (
                  <p className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
                    {error}
                  </p>
                )}
                {exito && (
                  <p className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg border border-emerald-100 dark:border-emerald-800 flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Contraseña actualizada. Úsala la próxima vez que inicies sesión.</span>
                  </p>
                )}

                <div className="relative">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Contraseña actual
                  </label>
                  <input
                    type={verClaves ? "text" : "password"}
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nueva contraseña <span className="text-slate-400 font-normal">(mínimo 6 caracteres)</span>
                  </label>
                  <input
                    type={verClaves ? "text" : "password"}
                    value={nueva}
                    onChange={(e) => setNueva(e.target.value)}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    type={verClaves ? "text" : "password"}
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setVerClaves(!verClaves)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1.5"
                >
                  {verClaves ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {verClaves ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                </button>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug flex items-start gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px" />
                  Por seguridad, el administrador recibe aviso de todo cambio de contraseña.
                </p>

                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {guardando
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <KeyRound className="h-4 w-4" />}
                  {guardando ? "Guardando…" : "Cambiar contraseña"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
