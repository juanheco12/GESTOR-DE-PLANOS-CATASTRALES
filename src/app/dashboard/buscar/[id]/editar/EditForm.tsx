"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, MapPin } from "lucide-react";

const FORMATO_OPTIONS = [
  { value: "FISICO", label: "Físico (Plano impreso)" },
  { value: "CD", label: "CD" },
  { value: "USB", label: "USB" },
  { value: "OTRO", label: "Otro Formato" },
];

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-marca-500 focus:border-marca-600 transition-colors";

export default function EditForm({ plan }: { plan: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receivers, setReceivers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    radicado: plan.radicado || "",
    mutacion: plan.mutacion || "",
    formato: plan.formato || "FISICO",
    propietario: plan.propietario || "",
    predial: plan.predial || "",
    veredaBarrio: plan.veredaBarrio || "",
    profesionalResponsable: plan.profesionalResponsable || "",
    observaciones: plan.observaciones || "",
    ubicacionFisica: plan.ubicacionFisica || "",
    estado: plan.estado || "DISPONIBLE",
    receivedById: plan.receivedById || "",
  });

  useEffect(() => {
    fetch("/api/receivers")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setReceivers(data); })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/planos/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar");
      }
      router.push(`/dashboard/buscar/${plan.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Número de Radicado <span className="text-red-500">*</span></label>
          <input required type="text" name="radicado" value={formData.radicado} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trámite (Mutación) <span className="text-red-500">*</span></label>
          <select required name="mutacion" value={formData.mutacion} onChange={handleChange} className={inputClass}>
            <option value="">Seleccione...</option>
            <option value="Mutación de Primera">Mutación de Primera</option>
            <option value="Mutación de Segunda">Mutación de Segunda</option>
            <option value="Mutación de Tercera">Mutación de Tercera</option>
            <option value="Mutación de Cuarta">Mutación de Cuarta</option>
            <option value="Mutación de Quinta">Mutación de Quinta</option>
            <option value="Rectificación">Rectificación de Área</option>
            <option value="Rectificación 1101">Rectificación 1101</option>
            <option value="Derecho de Petición">Derecho de Petición</option>
            <option value="Otro">Otro Trámite</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Soporte Físico <span className="text-red-500">*</span></label>
          <select required name="formato" value={formData.formato} onChange={handleChange} className={inputClass}>
            {FORMATO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Estado del Plano</label>
          <select name="estado" value={formData.estado} onChange={handleChange} className={inputClass}>
            <option value="DISPONIBLE">DISPONIBLE</option>
            <option value="PRESTADO">PRESTADO</option>
            <option value="ARCHIVADO">ARCHIVADO</option>
            <option value="PENDIENTE_REVISION">PENDIENTE REVISIÓN</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Recibido por <span className="text-red-500">*</span></label>
          <select required name="receivedById" value={formData.receivedById} onChange={handleChange} className={inputClass}>
            <option value="">Sin selección</option>
            {receivers.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Número Predial Nacional</label>
          <input type="text" name="predial"
            value={formData.predial} onChange={handleChange}
            className={`${inputClass} font-mono`}
            placeholder="" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Propietario</label>
          <input type="text" name="propietario" value={formData.propietario} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Vereda / Barrio</label>
          <input type="text" name="veredaBarrio" value={formData.veredaBarrio} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Profesional Responsable</label>
          <input type="text" name="profesionalResponsable" value={formData.profesionalResponsable} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Ubicación Física en Oficina</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
              Próximamente
            </span>
          </div>
          <div className="w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-sm select-none cursor-not-allowed">
            Esta función estará disponible en una próxima actualización
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Observaciones</label>
        <textarea name="observaciones" value={formData.observaciones} onChange={handleChange}
          rows={3} className={`${inputClass} resize-none`} />
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
        <button type="submit" disabled={loading}
          className="inline-flex items-center px-6 py-3 bg-marca-700 hover:bg-marca-800 text-white rounded-xl font-medium transition-colors disabled:opacity-70">
          <Save className="mr-2 h-5 w-5" />
          {loading ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}
