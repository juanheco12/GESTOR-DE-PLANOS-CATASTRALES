"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RegistroPlanoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [receiverError, setReceiverError] = useState("");
  const [receivers, setReceivers] = useState<any[]>([]);
  const [loadingReceivers, setLoadingReceivers] = useState(true);

  const [formData, setFormData] = useState({
    radicado: "",
    mutacion: "",
    formato: "FISICO",
    propietario: "",
    predial: "",
    veredaBarrio: "",
    profesionalResponsable: "",
    observaciones: "",
    receivedById: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "predial") {
      const onlyDigits = value.replace(/\D/g, "").slice(0, 30);
      setFormData((prev) => ({ ...prev, predial: onlyDigits }));
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handlePredialKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir teclas de control y navegación siempre
    if (e.ctrlKey || e.metaKey) return;
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
    if (allowed.includes(e.key)) return;
    // Bloquear si ya hay 30 dígitos
    if (formData.predial.length >= 30) {
      e.preventDefault();
      return;
    }
    // Solo permitir dígitos
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePredialPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    const current = formData.predial;
    const combined = (current + pasted).slice(0, 30);
    setFormData((prev) => ({ ...prev, predial: combined }));
  };

  useEffect(() => {
    async function loadReceivers() {
      try {
        const res = await fetch("/api/receivers");
        const data = await res.json();
        if (res.ok) {
          setReceivers(data || []);
          if (Array.isArray(data) && data.length > 0) {
            setFormData((prev) => ({ ...prev, receivedById: data[0].id }));
          }
        } else {
          setReceiverError(data.error || "Error al cargar receptores");
        }
      } catch (err: any) {
        setReceiverError(err.message || "Error al cargar receptores");
      } finally {
        setLoadingReceivers(false);
      }
    }

    loadReceivers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!formData.receivedById) {
      setError("Selecciona quién recibe el plano antes de registrar.");
      setLoading(false);
      return;
    }

    if (formData.predial.length !== 30) {
      setError("El número predial nacional debe tener exactamente 30 dígitos.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/planos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al registrar el plano");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/buscar");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center">
        <Link href="/dashboard/buscar" className="mr-4 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Registrar Nuevo Plano</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Ingresa la información del trámite catastral para añadir un plano al archivo.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8" autoComplete="off">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl border border-emerald-100 dark:border-emerald-800">
              Plano registrado exitosamente. Redirigiendo...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radicado */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Número de Radicado *
              </label>
              <input
                type="text"
                name="radicado"
                required
                autoComplete="on"
                value={formData.radicado}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Ej. RAD-2023-001"
              />
            </div>

            {/* Mutación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Trámite / Mutación *
              </label>
              <select
                name="mutacion"
                required
                value={formData.mutacion}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Seleccione una opción</option>
                <option value="Mutación de Primera">Mutación de Primera</option>
                <option value="Mutación de Segunda">Mutación de Segunda</option>
                <option value="Mutación de Tercera">Mutación de Tercera</option>
                <option value="Mutación de Cuarta">Mutación de Cuarta</option>
                <option value="Mutación de Quinta">Mutación de Quinta</option>
                <option value="Rectificación">Rectificación de Área</option>
                <option value="Otro">Otro Trámite</option>
              </select>
            </div>

            {/* Número Predial */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Número Predial Nacional *
              </label>
              <input
                type="text"
                name="predial"
                required
                inputMode="numeric"
                maxLength={30}
                minLength={30}
                value={formData.predial}
                onChange={handleChange}
                onKeyDown={handlePredialKeyDown}
                onPaste={handlePredialPaste}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono tracking-wider bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${
                  formData.predial.length > 0 && formData.predial.length < 30
                    ? "border-amber-400 dark:border-amber-500"
                    : formData.predial.length === 30
                    ? "border-emerald-500 dark:border-emerald-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
                placeholder="000000000000000000000000000000"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Exactamente 30 dígitos numéricos
                </p>
                <span className={`text-xs font-bold tabular-nums ${
                  formData.predial.length === 30
                    ? "text-emerald-600 dark:text-emerald-400"
                    : formData.predial.length > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}>
                  {formData.predial.length}/30
                </span>
              </div>
            </div>

            {/* Propietario */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre del Propietario o Interesado *
              </label>
              <input
                type="text"
                name="propietario"
                required
                value={formData.propietario}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Juan Pérez"
              />
            </div>

            {/* Vereda / Barrio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Vereda / Barrio
              </label>
              <input
                type="text"
                name="veredaBarrio"
                value={formData.veredaBarrio}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Ej. Vereda Centro"
              />
            </div>

            {/* Formato */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Formato del Plano *
              </label>
              <select
                name="formato"
                required
                value={formData.formato}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="FISICO">Físico</option>
                <option value="SHP">Archivo SHP</option>
                <option value="PDF">Documento PDF</option>
                <option value="DWG">Archivo DWG</option>
                <option value="CD">CD</option>
                <option value="USB">USB</option>
                <option value="OTRO">Otro Formato</option>
              </select>
            </div>

            {/* Profesional Responsable */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Profesional Responsable (Topógrafo / Ejecutor)
              </label>
              <input
                type="text"
                name="profesionalResponsable"
                autoComplete="on"
                value={formData.profesionalResponsable}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Nombre del profesional encargado del levantamiento"
              />
            </div>

            {/* Recibido por */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Recibido por *
              </label>
              <select
                name="receivedById"
                required
                value={formData.receivedById}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {loadingReceivers ? (
                  <option value="">Cargando receptores...</option>
                ) : receivers.length > 0 ? (
                  receivers.map((receiver) => (
                    <option key={receiver.id} value={receiver.id}>{receiver.name}</option>
                  ))
                ) : (
                  <option value="">No hay receptores disponibles</option>
                )}
              </select>
              {receiverError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{receiverError}</p>
              )}
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Observaciones Adicionales
              </label>
              <textarea
                name="observaciones"
                rows={3}
                value={formData.observaciones}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                placeholder="Estado físico del plano, detalles faltantes, etc."
              ></textarea>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <Link 
              href="/dashboard/buscar"
              className="px-6 py-2.5 mr-4 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || success}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm flex items-center transition-colors disabled:opacity-70"
            >
              <Save className="mr-2 h-5 w-5" />
              {loading ? "Guardando..." : "Guardar Plano"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
