"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

export default function EditForm({ plan }: { plan: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receivers, setReceivers] = useState<any[]>([]);
  const [loadingReceivers, setLoadingReceivers] = useState(true);

  const [formData, setFormData] = useState({
    radicado: plan.radicado || "",
    mutacion: plan.mutacion || "",
    formato: plan.formato || "FISICO",
    propietario: plan.propietario || "",
    predial: plan.predial || "",
    veredaBarrio: plan.veredaBarrio || "",
    profesionalResponsable: plan.profesionalResponsable || "",
    observaciones: plan.observaciones || "",
    estado: plan.estado || "DISPONIBLE",
    receivedById: plan.receivedById || ""
  });

  useEffect(() => {
    async function loadReceivers() {
      try {
        const res = await fetch("/api/receivers");
        const data = await res.json();
        if (res.ok) {
          setReceivers(data || []);
        }
      } catch (error) {
        // ignore silently; receiver list optional for edit form
      } finally {
        setLoadingReceivers(false);
      }
    }
    loadReceivers();
  }, []);

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
    if (e.ctrlKey || e.metaKey) return;
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
    if (allowed.includes(e.key)) return;
    if (formData.predial.length >= 30) {
      e.preventDefault();
      return;
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.predial.length !== 30) {
      setError("El número predial nacional debe tener exactamente 30 dígitos.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/planos/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar");
      }

      alert("Plano actualizado correctamente.");
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
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Número de Radicado *</label>
          <input required type="text" name="radicado" value={formData.radicado} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trámite (Mutación) *</label>
          <select required name="mutacion" value={formData.mutacion} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <option value="">Seleccione...</option>
            <option value="Mutación de primera clase">Mutación de primera clase</option>
            <option value="Mutación de segunda clase">Mutación de segunda clase</option>
            <option value="Mutación de tercera clase">Mutación de tercera clase</option>
            <option value="Mutación de cuarta clase">Mutación de cuarta clase</option>
            <option value="Mutación de quinta clase">Mutación de quinta clase</option>
            <option value="Rectificación">Rectificación</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Número Predial Nacional *</label>
          <input
            required
            type="text"
            name="predial"
            inputMode="numeric"
            maxLength={30}
            minLength={30}
            value={formData.predial}
            onChange={handleChange}
            onKeyDown={handlePredialKeyDown}
            onPaste={handlePredialPaste}
            className={`w-full px-4 py-2.5 rounded-xl border font-mono tracking-wider bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 ${
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
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Propietario *</label>
          <input required type="text" name="propietario" value={formData.propietario} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Vereda / Barrio</label>
          <input type="text" name="veredaBarrio" value={formData.veredaBarrio} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Profesional Responsable</label>
          <input type="text" name="profesionalResponsable" value={formData.profesionalResponsable} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Recibido por</label>
          <select name="receivedById" value={formData.receivedById} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <option value="">Sin selección</option>
            {receivers.map((receiver) => (
              <option key={receiver.id} value={receiver.id}>{receiver.name}</option>
            ))}
          </select>
          {loadingReceivers && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Cargando receptores...</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Formato del Plano *</label>
          <select required name="formato" value={formData.formato} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <option value="FISICO">Físico</option>
            <option value="DIGITAL_PDF">Digital (PDF)</option>
            <option value="DIGITAL_DWG">Digital (DWG)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Estado del Plano</label>
          <select required name="estado" value={formData.estado} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <option value="DISPONIBLE">DISPONIBLE</option>
            <option value="PRESTADO">PRESTADO</option>
            <option value="ARCHIVADO">ARCHIVADO</option>
            <option value="PENDIENTE_REVISION">PENDIENTE_REVISION</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Observaciones / Inconsistencias</label>
        <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"></textarea>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
        <button type="submit" disabled={loading} className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70">
          <Save className="mr-2 h-5 w-5" />
          {loading ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}
