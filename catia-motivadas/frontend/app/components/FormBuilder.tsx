"use client";

import { useState } from "react";
import { Sparkles, Loader2, FlaskConical } from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface FormData {
  expediente: string;
  numero_predio: string;
  propietario_nombre: string;
  propietario_cedula: string;
  propietario_direccion: string;
  propietario_municipio: string;
  construccion_tipo: string;
  construccion_uso: string;
  construccion_pisos: string;
  construccion_area_construida: string;
  construccion_area_terreno: string;
  construccion_estrato: string;
  construccion_anio_construccion: string;
  construccion_material_paredes: string;
  construccion_material_cubierta: string;
  construccion_material_pisos: string;
  construccion_descripcion: string;
  fecha_solicitud: string;
  funcionario_nombre: string;
  funcionario_cargo: string;
}

const EMPTY: FormData = {
  expediente: "",
  numero_predio: "",
  propietario_nombre: "",
  propietario_cedula: "",
  propietario_direccion: "",
  propietario_municipio: "",
  construccion_tipo: "",
  construccion_uso: "",
  construccion_pisos: "",
  construccion_area_construida: "",
  construccion_area_terreno: "",
  construccion_estrato: "",
  construccion_anio_construccion: "",
  construccion_material_paredes: "",
  construccion_material_cubierta: "",
  construccion_material_pisos: "",
  construccion_descripcion: "",
  fecha_solicitud: new Date().toISOString().split("T")[0],
  funcionario_nombre: "",
  funcionario_cargo: "",
};

const MOCK: FormData = {
  expediente: "MUT-2025-001234",
  numero_predio: "25430000000000001234",
  propietario_nombre: "Carlos Andrés Martínez López",
  propietario_cedula: "79.456.789",
  propietario_direccion: "Calle 45 No. 12-30 Apto 201",
  propietario_municipio: "Bogotá D.C.",
  construccion_tipo: "Residencial unifamiliar",
  construccion_uso: "Vivienda",
  construccion_pisos: "2",
  construccion_area_construida: "85.50",
  construccion_area_terreno: "120.00",
  construccion_estrato: "3",
  construccion_anio_construccion: "2020",
  construccion_material_paredes: "Ladrillo cocido con pañete",
  construccion_material_cubierta: "Losa de concreto",
  construccion_material_pisos: "Cerámica y baldosa",
  construccion_descripcion:
    "Construcción de dos pisos con sala-comedor, cocina, 3 habitaciones, 2 baños y zona de lavandería. Acabados medios. Fachada con estuco y pintura.",
  fecha_solicitud: new Date().toISOString().split("T")[0],
  funcionario_nombre: "María Fernanda Gómez Ríos",
  funcionario_cargo: "Gestora Catastral",
};

interface FormBuilderProps {
  onResult: (text: string, expediente: string) => void;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">
        {label} {required && <span className="text-emerald-500">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      )}
    </div>
  );
}

export default function FormBuilder({ onResult }: FormBuilderProps) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"generar" | "preview">("generar");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const buildPayload = () => ({
    expediente: form.expediente,
    numero_predio: form.numero_predio,
    propietario: {
      nombre: form.propietario_nombre,
      cedula: form.propietario_cedula,
      direccion: form.propietario_direccion,
      municipio: form.propietario_municipio,
    },
    construccion: {
      tipo: form.construccion_tipo,
      uso: form.construccion_uso,
      pisos: Number(form.construccion_pisos) || 1,
      area_construida: Number(form.construccion_area_construida) || 0,
      area_terreno: Number(form.construccion_area_terreno) || 0,
      estrato: Number(form.construccion_estrato) || 1,
      anio_construccion: Number(form.construccion_anio_construccion) || 2020,
      material_paredes: form.construccion_material_paredes,
      material_cubierta: form.construccion_material_cubierta,
      material_pisos: form.construccion_material_pisos,
      descripcion: form.construccion_descripcion,
    },
    fecha_solicitud: form.fecha_solicitud,
    funcionario_nombre: form.funcionario_nombre,
    funcionario_cargo: form.funcionario_cargo,
  });

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "preview" ? "/api/motivada/preview" : "/api/motivada/generar";
      const payload = { datos: buildPayload(), usar_template: true };
      const resp = await axios.post(`${API}${endpoint}`, payload);
      const text = resp.data.data?.motivada_texto ?? resp.data.data?.texto_preview ?? "";
      onResult(text, form.expediente);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.detail ?? err.message
          : "Error desconocido";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-100">Mutación Tercera Clase</h2>
          <p className="text-xs text-gray-500 mt-0.5">Incorporación de Construcción</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setForm(MOCK)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-700 transition-colors"
          >
            <FlaskConical size={13} />
            Datos de prueba
          </button>
          <button
            onClick={() => setForm(EMPTY)}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-700 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Form sections */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">
          Identificación del Trámite
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expediente" name="expediente" value={form.expediente} onChange={handleChange} placeholder="MUT-2025-000001" required />
          <Field label="Número de Predio" name="numero_predio" value={form.numero_predio} onChange={handleChange} placeholder="25430000000000001234" required />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">
          Datos del Propietario
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre completo" name="propietario_nombre" value={form.propietario_nombre} onChange={handleChange} required />
          <Field label="Cédula" name="propietario_cedula" value={form.propietario_cedula} onChange={handleChange} placeholder="79.456.789" required />
          <Field label="Dirección" name="propietario_direccion" value={form.propietario_direccion} onChange={handleChange} placeholder="Calle 45 No. 12-30" />
          <Field label="Municipio" name="propietario_municipio" value={form.propietario_municipio} onChange={handleChange} placeholder="Bogotá D.C." required />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">
          Datos de la Construcción
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tipo" name="construccion_tipo" value={form.construccion_tipo} onChange={handleChange} placeholder="Residencial" required />
          <Field label="Uso" name="construccion_uso" value={form.construccion_uso} onChange={handleChange} placeholder="Vivienda" />
          <Field label="Pisos" name="construccion_pisos" value={form.construccion_pisos} onChange={handleChange} type="number" placeholder="2" required />
          <Field label="Área construida (m²)" name="construccion_area_construida" value={form.construccion_area_construida} onChange={handleChange} type="number" placeholder="85.50" required />
          <Field label="Área terreno (m²)" name="construccion_area_terreno" value={form.construccion_area_terreno} onChange={handleChange} type="number" placeholder="120.00" />
          <Field label="Estrato" name="construccion_estrato" value={form.construccion_estrato} onChange={handleChange} type="number" placeholder="3" />
          <Field label="Año construcción" name="construccion_anio_construccion" value={form.construccion_anio_construccion} onChange={handleChange} type="number" placeholder="2020" />
          <Field label="Material paredes" name="construccion_material_paredes" value={form.construccion_material_paredes} onChange={handleChange} placeholder="Ladrillo cocido" />
          <Field label="Material cubierta" name="construccion_material_cubierta" value={form.construccion_material_cubierta} onChange={handleChange} placeholder="Losa de concreto" />
          <div className="col-span-3">
            <Field label="Material pisos" name="construccion_material_pisos" value={form.construccion_material_pisos} onChange={handleChange} placeholder="Cerámica" />
          </div>
          <div className="col-span-3">
            <Field label="Descripción de la construcción" name="construccion_descripcion" value={form.construccion_descripcion} onChange={handleChange} type="textarea" placeholder="Descripción física y características de la construcción..." required />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">
          Datos del Funcionario
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Fecha solicitud" name="fecha_solicitud" value={form.fecha_solicitud} onChange={handleChange} type="date" required />
          <Field label="Nombre funcionario" name="funcionario_nombre" value={form.funcionario_nombre} onChange={handleChange} placeholder="Nombre completo" />
          <Field label="Cargo" name="funcionario_cargo" value={form.funcionario_cargo} onChange={handleChange} placeholder="Gestor Catastral" />
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
          <button
            onClick={() => setMode("generar")}
            className={`px-3 py-2 transition-colors ${mode === "generar" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-900 text-gray-500 hover:text-gray-300"}`}
          >
            Generar + Guardar
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`px-3 py-2 transition-colors border-l border-gray-700 ${mode === "preview" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-900 text-gray-500 hover:text-gray-300"}`}
          >
            Solo previsualizar
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generando motivada…
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generar Motivada
            </>
          )}
        </button>
      </div>
    </div>
  );
}
