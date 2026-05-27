"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";

const FORMATO_OPTIONS = [
  { value: "FISICO", label: "Físico (Plano impreso)" },
  { value: "CD", label: "CD" },
  { value: "USB", label: "USB" },
  { value: "OTRO", label: "Otro Formato" },
];

const inputClass =
  "w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

export default function RegistroPlanoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [receivers, setReceivers] = useState<any[]>([]);
  const [receiverError, setReceiverError] = useState("");

  const [formData, setFormData] = useState({
    radicado: "",
    mutacion: "",
    formato: "FISICO",
    propietario: "",
    predial: "",
    veredaBarrio: "",
    profesionalResponsable: "",
    observaciones: "",
    ubicacionFisica: "",
    receivedById: "",
  });

  useEffect(() => {
    fetch("/api/receivers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setReceivers(data);
          if (data.length > 0) setFormData((p) => ({ ...p, receivedById: data[0].id }));
        }
      })
      .catch(() => setReceiverError("No se pudo cargar la lista de receptores"))
      .finally(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/planos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar el plano");
      setSuccess(true);
      setTimeout(() => { router.push("/dashboard/buscar"); router.refresh(); }, 1500);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Registrar Plano Físico</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Ingresa los datos del plano o soporte físico para añadirlo al archivo de oficina.
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

          {/* Campos obligatorios */}
          <div className="mb-2">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-4">
              Campos obligatorios
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

            {/* Radicado */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Número de Radicado <span className="text-red-500">*</span>
              </label>
              <input type="text" name="radicado" required value={formData.radicado} onChange={handleChange}
                className={inputClass} placeholder="" />
            </div>

            {/* Mutación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Trámite / Mutación <span className="text-red-500">*</span>
              </label>
              <select name="mutacion" required value={formData.mutacion} onChange={handleChange} className={inputClass}>
                <option value="">Seleccione</option>
                <option value="Mutación de Primera">Mutación de Primera</option>
                <option value="Mutación de Segunda">Mutación de Segunda</option>
                <option value="Mutación de Tercera">Mutación de Tercera</option>
                <option value="Mutación de Cuarta">Mutación de Cuarta</option>
                <option value="Mutación de Quinta">Mutación de Quinta</option>
                <option value="Rectificación">Rectificación de Área</option>
                <option value="Otro">Otro Trámite</option>
              </select>
            </div>

            {/* Soporte físico */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Soporte Físico <span className="text-red-500">*</span>
              </label>
              <select name="formato" required value={formData.formato} onChange={handleChange} className={inputClass}>
                {FORMATO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Recibido por */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Recibido por <span className="text-red-500">*</span>
              </label>
              <select name="receivedById" required value={formData.receivedById} onChange={handleChange} className={inputClass}>
                <option value="">Seleccione</option>
                {receivers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {receiverError && <p className="text-xs text-red-500 mt-1">{receiverError}</p>}
            </div>
          </div>

          {/* Campos opcionales */}
          <div className="mb-2">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4">
              Información adicional (opcional)
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Número Predial */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Número Predial Nacional
              </label>
              <input type="text" name="predial" value={formData.predial} onChange={handleChange}
                className={`${inputClass} font-mono`} placeholder="" />
            </div>

            {/* Propietario */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Propietario / Interesado
              </label>
              <input type="text" name="propietario" value={formData.propietario} onChange={handleChange}
                className={inputClass} placeholder="" />
            </div>

            {/* Vereda / Barrio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Vereda / Barrio
              </label>
              <input type="text" name="veredaBarrio" value={formData.veredaBarrio} onChange={handleChange}
                className={inputClass} placeholder="" />
            </div>

            {/* Profesional Responsable */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Profesional Responsable
              </label>
              <input type="text" name="profesionalResponsable" value={formData.profesionalResponsable} onChange={handleChange}
                className={inputClass} placeholder="" />
            </div>

            {/* Ubicación física — próximamente */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Ubicación Física en Oficina</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                  Próximamente
                </span>
              </div>
              <div className="w-full px-4 py-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-sm select-none cursor-not-allowed">
                Esta función estará disponible en una próxima actualización
              </div>
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Observaciones
              </label>
              <textarea name="observaciones" rows={3} value={formData.observaciones} onChange={handleChange}
                className={`${inputClass} resize-none`} placeholder="" />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Link href="/dashboard/buscar"
              className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={loading || success}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm flex items-center transition-colors disabled:opacity-70">
              <Save className="mr-2 h-5 w-5" />
              {loading ? "Guardando..." : "Guardar Plano"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
