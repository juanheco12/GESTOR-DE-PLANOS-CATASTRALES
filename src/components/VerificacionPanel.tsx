"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClipboardCheck, X, FileText, Check, XCircle,
  Trash2, Download, Upload, ImageIcon, Eye, BellRing, Clock, Loader2, PenLine, FileBarChart,
  History, Clipboard,
} from "lucide-react";

import { buildInformeMensual, type LlamadoInforme } from "@/lib/informeMensual";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";

type Concepto = "PROCEDE" | "NO_PROCEDE" | "REQUIERE_AJUSTE";

const CONCEPTO_LABEL: Record<string, string> = {
  PROCEDE:         "PROCEDE",
  NO_PROCEDE:      "NO PROCEDE",
  REQUIERE_AJUSTE: "REQUIERE AJUSTE",
};

interface Llamado {
  id:                string;
  radicado:          string | null;
  fmi:               string | null;
  nota:              string | null;
  formato:           string | null;
  esDerechoPeticion: boolean;
  estado:            "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO";
  createdAt:         string;
  tomadoEn:          string | null;
  solicitante: { name: string | null; email: string | null } | null;
  verificacion?: { cumple: boolean; resultado: string | null } | null;
  planId?: string | null;
  plan?:   { id: string; radicado: string; mutacion: string } | null;
}

interface Previa {
  id:            string;
  radicado:      string | null;
  cumple:        boolean;
  resultado:     string | null;
  observaciones: string | null;
  createdAt:     string;
  subsanaId:     string | null;
  user:    { name: string | null; email: string | null } | null;
  llamado: { plan: { radicado: string } | null } | null;
}

// Marca para predios sin folio de matrícula
const SIN_FOLIO = "N/A";

// Hora local de Bogotá, formato corto
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit",
  });

// Cronómetro: milisegundos a mm:ss o h:mm:ss
function cronometro(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const dd = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dd(m)}:${dd(seg)}` : `${dd(m)}:${dd(seg)}`;
}

const FORMATO_LABEL: Record<string, string> = {
  FISICO: "Físico (Plano impreso)",
  CD:     "CD",
  USB:    "USB",
  OTRO:   "Otro Formato",
};

interface Verificacion {
  id:            string;
  fmi:           string | null;
  radicado:      string | null;
  cumple:        boolean;
  resultado?:    string | null;
  observaciones: string | null;
  imagenNombre:  string | null;
  createdAt:     string;
  imagenData?:   string | null;
  subsanaId?:    string | null;
  subsana?: {
    id: string; createdAt: string; resultado: string | null;
    cumple: boolean; observaciones: string | null;
  } | null;
  llamado?: {
    id:                string;
    radicado:          string | null;
    createdAt:         string;
    tomadoEn:          string | null;
    finalizadoEn:      string | null;
    esDerechoPeticion: boolean;
    formato:           string | null;
    planId:            string | null;
    plan:              { id: string; radicado: string; mutacion: string } | null;
    solicitante:       { name: string | null; email: string | null } | null;
  } | null;
}

// Concepto técnico; los registros anteriores solo tienen el booleano
function concepto(v: Verificacion): Concepto {
  if (v.resultado === "PROCEDE" || v.resultado === "NO_PROCEDE" || v.resultado === "REQUIERE_AJUSTE") {
    return v.resultado;
  }
  return v.cumple ? "PROCEDE" : "NO_PROCEDE";
}

const CONCEPTO_CSS: Record<Concepto, string> = {
  PROCEDE:         "cumple",
  NO_PROCEDE:      "nocumple",
  REQUIERE_AJUSTE: "ajuste",
};

const CONCEPTO_ICONO: Record<Concepto, string> = {
  PROCEDE:         "✔ PROCEDE",
  NO_PROCEDE:      "✘ NO PROCEDE",
  REQUIERE_AJUSTE: "▲ REQUIERE AJUSTE",
};

// Radicado a mostrar: el que asignó ventanilla al radicar tiene prioridad
// sobre el que el digitalizador anotó durante la revisión.
function radicadoDe(v: Verificacion): string {
  return v.llamado?.plan?.radicado ?? v.radicado ?? v.llamado?.radicado ?? "—";
}

// Minutos efectivos entre que el digitalizador toma el plano y lo cierra
function minutosRevision(v: Verificacion): number | null {
  const ini = v.llamado?.tomadoEn;
  const fin = v.llamado?.finalizadoEn;
  if (!ini || !fin) return null;
  const ms = new Date(fin).getTime() - new Date(ini).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms / 60000 : null;
}

// Minutos de espera del ciudadano: del registro en ventanilla a la toma
function minutosRespuesta(v: Verificacion): number | null {
  const ini = v.llamado?.createdAt;
  const fin = v.llamado?.tomadoEn;
  if (!ini || !fin) return null;
  const ms = new Date(fin).getTime() - new Date(ini).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms / 60000 : null;
}

function fmtMin(min: number | null): string {
  if (min === null) return "—";
  const m = Math.round(min);
  if (m < 1)  return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

// Duración entre que el digitalizador toma el plano y lo cierra
function duracion(v: Verificacion): string {
  const ini = v.llamado?.tomadoEn;
  const fin = v.llamado?.finalizadoEn;
  if (!ini || !fin) return "—";

  const ms = new Date(fin).getTime() - new Date(ini).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";

  const min = Math.round(ms / 60000);
  if (min < 1)  return "< 1 min";
  if (min < 60) return `${min} min`;

  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// ────────────────────────────────────────────────────────────
// PDF Report generation (opens new window, triggers print)
// ────────────────────────────────────────────────────────────
function buildReportHTML(
  verifs: Verificacion[],
  userName: string,
  conAnexos = false,
  derechos: Llamado[] = []
): string {
  const now = new Date().toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const total      = verifs.length;
  const proceden   = verifs.filter((v) => concepto(v) === "PROCEDE").length;
  const noProceden = verifs.filter((v) => concepto(v) === "NO_PROCEDE").length;
  const ajustes    = verifs.filter((v) => concepto(v) === "REQUIERE_AJUSTE").length;

  // Promedio de duración sobre los que tienen tiempos registrados
  const medidos = verifs.filter((v) => v.llamado?.tomadoEn && v.llamado?.finalizadoEn);
  const promedioMin = medidos.length
    ? Math.round(
        medidos.reduce(
          (acc, v) =>
            acc + (new Date(v.llamado!.finalizadoEn!).getTime() - new Date(v.llamado!.tomadoEn!).getTime()),
          0
        ) / medidos.length / 60000
      )
    : null;
  const promedioTxt =
    promedioMin === null ? "—"
      : promedioMin < 1  ? "< 1 min"
      : promedioMin < 60 ? `${promedioMin} min`
      : `${Math.floor(promedioMin / 60)} h ${promedioMin % 60} min`;

  const rows = verifs.map((v) => `
    <tr>
      <td>${new Date(v.createdAt).toLocaleDateString("es-CO", {
        timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric",
      })}</td>
      <td>${escHtml(v.fmi ?? "—")}</td>
      <td>${escHtml(radicadoDe(v))}</td>
      <td class="${CONCEPTO_CSS[concepto(v)]}">${CONCEPTO_ICONO[concepto(v)]}</td>
      <td>${duracion(v)}</td>
      <td>${escHtml(v.llamado?.formato ?? "—")}</td>
      <td>${escHtml(v.observaciones ?? "—")}</td>
      <td>${v.imagenNombre ? `📎 ${escHtml(v.imagenNombre)}` : "—"}</td>
    </tr>`).join("");

  // Derechos de petición registrados por ventanilla vía check-in (sin revisión)
  const filasDerechos = derechos.map((d) => `
    <tr>
      <td>${new Date(d.createdAt).toLocaleDateString("es-CO", {
        timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric",
      })}</td>
      <td>${escHtml(d.fmi ?? "—")}</td>
      <td>${escHtml(d.radicado ?? "—")}</td>
      <td>${escHtml(d.formato ? (FORMATO_LABEL[d.formato] ?? d.formato) : "—")}</td>
      <td>${escHtml(d.solicitante?.name ?? d.solicitante?.email ?? "—")}</td>
      <td>${escHtml(d.nota ?? "—")}</td>
    </tr>`).join("");

  const seccionDerechos = derechos.length === 0 ? "" : `
  <h2 class="seccion">Derechos de Petición registrados en ventanilla (${derechos.length})</h2>
  <p class="subnota">Registrados por ventanilla como plano en el sistema mientras el digitalizador no estaba en la oficina.</p>
  <table>
    <thead>
      <tr>
        <th>Fecha</th><th>FMI</th><th>Radicado</th>
        <th>Formato</th><th>Registró</th><th>Nota</th>
      </tr>
    </thead>
    <tbody>${filasDerechos}</tbody>
  </table>`;

  // Sección de anexos: una página por plano con archivo adjunto
  const conArchivo = verifs.filter((v) => v.imagenData);
  const anexos = !conAnexos || conArchivo.length === 0 ? "" : `
  <div class="anexos">
    ${conArchivo.map((v, i) => {
      const esPdf = (v.imagenData ?? "").startsWith("data:application/pdf");
      const visor = esPdf
        ? `<embed src="${v.imagenData}" type="application/pdf" class="doc"/>
           <p class="nota">Documento PDF adjunto. Si no se visualiza al imprimir, ábrelo desde el historial con el botón "Ver".</p>`
        : `<img src="${v.imagenData}" alt="Plano ${escHtml(v.fmi ?? "sin FMI")}" class="doc"/>`;
      return `
      <section class="anexo">
        <h2>Anexo ${i + 1} — ${v.fmi ? `FMI ${escHtml(v.fmi)}` : v.radicado ? `Radicado ${escHtml(v.radicado)}` : "Sin identificar"}</h2>
        <table class="ficha">
          <tr><th>Radicado</th><td>${escHtml(radicadoDe(v))}</td></tr>
          <tr><th>Fecha</th><td>${new Date(v.createdAt).toLocaleDateString("es-CO", {
            timeZone: "America/Bogota", day: "2-digit", month: "long", year: "numeric",
          })}</td></tr>
          <tr><th>Resultado</th><td class="${CONCEPTO_CSS[concepto(v)]}">${CONCEPTO_ICONO[concepto(v)]}</td></tr>
          <tr><th>Tiempo</th><td>${duracion(v)}</td></tr>
          <tr><th>Formato</th><td>${escHtml(v.llamado?.formato ?? "—")}</td></tr>
          <tr><th>Solicitó</th><td>${escHtml(v.llamado?.solicitante?.name ?? "—")}</td></tr>
          <tr><th>Observaciones</th><td>${escHtml(v.observaciones ?? "—")}</td></tr>
          <tr><th>Archivo</th><td>${escHtml(v.imagenNombre ?? "—")}</td></tr>
        </table>
        ${visor}
      </section>`;
    }).join("")}
  </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte de Verificaciones</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:28px}
    header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;border-bottom:2px solid #0f766e;padding-bottom:10px}
    h1{font-size:15px;color:#0f766e}
    .meta{font-size:9px;color:#64748b;margin-top:2px}
    .stats{display:flex;gap:12px;margin-bottom:14px}
    .stat{padding:8px 18px;border-radius:6px;text-align:center;min-width:70px}
    .stat.total{background:#f1f5f9}
    .stat.si{background:#dcfce7;color:#15803d}
    .stat.no{background:#fee2e2;color:#b91c1c}
    .stat.tiempo{background:#e0f2fe;color:#0369a1}
    .stat.tiempo .num{font-size:15px;padding-top:5px}
    .stat .num{font-size:22px;font-weight:700;line-height:1.1}
    .stat .lbl{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{background:#0f766e;color:#fff;padding:6px 8px;text-align:left;font-size:9.5px;font-weight:600}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:10px}
    tr:nth-child(even) td{background:#f8fafc}
    .cumple{color:#15803d;font-weight:700}
    .nocumple{color:#b91c1c;font-weight:700}
    .ajuste{color:#b45309;font-weight:700}
    .stat.ajuste{background:#fef3c7;color:#b45309}
    footer{margin-top:14px;font-size:9px;color:#94a3b8;text-align:center}
    h2.seccion{font-size:12px;color:#6b21a8;margin-top:18px;border-bottom:1px solid #d8b4fe;padding-bottom:4px}
    .subnota{font-size:8.5px;color:#94a3b8;margin:3px 0 5px}
    .anexo{page-break-before:always;padding-top:6px}
    .anexo h2{font-size:13px;color:#0f766e;border-bottom:1px solid #0f766e;padding-bottom:5px;margin-bottom:10px}
    table.ficha{width:100%;margin-bottom:12px;border-collapse:collapse}
    table.ficha th{background:#f1f5f9;color:#334155;width:110px;padding:5px 8px;text-align:left;font-size:9.5px;border-bottom:1px solid #e2e8f0}
    table.ficha td{padding:5px 8px;font-size:10px;border-bottom:1px solid #e2e8f0}
    .doc{display:block;width:100%;max-height:195mm;object-fit:contain;border:1px solid #e2e8f0;border-radius:4px}
    embed.doc{height:195mm}
    .nota{font-size:8.5px;color:#94a3b8;margin-top:5px;text-align:center}
    @media print{@page{margin:15mm}body{padding:0}}
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Reporte de Verificaciones de Planos</h1>
      <p class="meta">Digitalizador: ${escHtml(userName)} &nbsp;·&nbsp; Generado: ${now}</p>
    </div>
    <img src="" alt="" style="height:36px;opacity:.15"/>
  </header>

  <div class="stats">
    <div class="stat total"><div class="num">${total}</div><div class="lbl">Total</div></div>
    <div class="stat si"><div class="num">${proceden}</div><div class="lbl">Proceden</div></div>
    <div class="stat no"><div class="num">${noProceden}</div><div class="lbl">No proceden</div></div>
    <div class="stat ajuste"><div class="num">${ajustes}</div><div class="lbl">Req. ajuste</div></div>
    <div class="stat tiempo"><div class="num">${promedioTxt}</div><div class="lbl">Tiempo promedio</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Fecha</th><th>FMI</th><th>Radicado</th>
        <th>Resultado</th><th>Tiempo</th><th>Formato</th><th>Observaciones</th><th>Adjunto</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:12px">Sin registros</td></tr>'}
    </tbody>
  </table>

  ${seccionDerechos}

  <footer>Sistema de Gestión de Planos Catastrales — Municipio de Montería</footer>
  ${anexos}
  <script>window.onload=()=>{setTimeout(()=>window.print(),${conAnexos ? 900 : 100})}</script>
</body>
</html>`;
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
export default function VerificacionPanel({ userName }: { userName: string }) {
  const [open,        setOpen]        = useState(false);
  // El digitalizador no crea verificaciones sueltas: solo atiende llamados.
  // El formulario aparece dentro de "llamados" al tomar uno.
  const [tab,         setTab]         = useState<"llamados" | "historial">("llamados");
  const [verifs,      setVerifs]      = useState<Verificacion[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingImg,  setLoadingImg]  = useState<string | null>(null);
  const [generando,   setGenerando]   = useState(false);

  // Informe mensual: por defecto el mes en curso
  const hoy = new Date();
  const [mesInforme, setMesInforme] = useState(
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
  );
  const [generandoInforme, setGenerandoInforme] = useState(false);

  // llamados de ventanilla
  const [llamados,      setLlamados]      = useState<Llamado[]>([]);
  const [loadingLlam,   setLoadingLlam]   = useState(false);
  const [pendientes,    setPendientes]    = useState(0);
  const [tomando,       setTomando]       = useState<string | null>(null);
  const [llamadoActivo, setLlamadoActivo] = useState<Llamado | null>(null);

  // Cronómetro de la revisión en curso
  const [ahora, setAhora] = useState(() => Date.now());

  // Revisiones anteriores del mismo folio, para subsanar la observación previa
  const [previas,    setPrevias]    = useState<Previa[]>([]);
  const [buscandoP,  setBuscandoP]  = useState(false);
  const [subsanaId,  setSubsanaId]  = useState<string | null>(null);

  // form
  const [fmi,          setFmi]          = useState("");
  const [radicado,     setRadicado]     = useState("");
  const [cumple,       setCumple]       = useState<boolean | null>(null);
  const [resultado,    setResultado]    = useState<Concepto | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [imagen,       setImagen]       = useState<{ nombre: string; data: string } | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState("");
  const [success,      setSuccess]      = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Load list when historial tab is active
  useEffect(() => {
    if (open && tab === "historial") loadVerifs();
    if (open && tab === "llamados")  loadLlamados();
  }, [open, tab]);

  // Contador de llamados pendientes: se actualiza al instante con el push
  useRealtimeRefresh(async () => {
    try {
      const res  = await fetch("/api/llamados");
      const data = await res.json();
      if (Array.isArray(data)) {
        setPendientes(data.filter((l: Llamado) => l.estado === "PENDIENTE").length);
        // Si el panel está abierto en Llamados, refresca también la lista
        if (open && tab === "llamados") setLlamados(data);
      }
    } catch { /* silencioso: se reintenta en el siguiente ciclo */ }
  }, 20_000);

  // El panel se abre solo al tocar la notificación: por mensaje del service
  // worker si la pestaña ya estaba abierta, o por el parámetro de la URL si
  // el navegador tuvo que abrir una nueva.
  useEffect(() => {
    const abrirEnLlamados = () => {
      setOpen(true);
      setTab("llamados");
      setLlamadoActivo(null);
      loadLlamados();
    };

    const onMensaje = (e: MessageEvent) => {
      if (e.data?.type === "catastro-abrir-panel" && e.data?.panel === "verificacion") {
        abrirEnLlamados();
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMensaje);

    // Mismo efecto desde el botón "Atender ahora" del aviso en pantalla
    const onEvento = (e: Event) => {
      if ((e as CustomEvent).detail?.panel === "verificacion") abrirEnLlamados();
    };
    window.addEventListener("catastro-abrir-panel", onEvento);

    const params = new URLSearchParams(window.location.search);
    if (params.get("panel") === "verificacion") {
      abrirEnLlamados();
      // Se limpia para que al recargar no vuelva a abrirse
      params.delete("panel");
      const query = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
    }

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMensaje);
      window.removeEventListener("catastro-abrir-panel", onEvento);
    };
  }, []);

  // Avanza el cronómetro solo mientras hay una revisión abierta
  useEffect(() => {
    if (!llamadoActivo?.tomadoEn) return;
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [llamadoActivo?.id, llamadoActivo?.tomadoEn]);

  // Busca revisiones anteriores del folio que se está digitando
  useEffect(() => {
    const folio = fmi.trim();
    if (!llamadoActivo || !folio || folio.toUpperCase() === SIN_FOLIO) {
      setPrevias([]);
      return;
    }
    let cancelado = false;
    setBuscandoP(true);
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/verificaciones/historial?fmi=${encodeURIComponent(folio)}`);
        const data = await res.json();
        if (!cancelado && Array.isArray(data)) setPrevias(data);
      } catch {
        if (!cancelado) setPrevias([]);
      } finally {
        if (!cancelado) setBuscandoP(false);
      }
    }, 500);   // espera a que termine de escribir
    return () => { cancelado = true; clearTimeout(t); setBuscandoP(false); };
  }, [fmi, llamadoActivo?.id]);

  const loadLlamados = async () => {
    setLoadingLlam(true);
    try {
      const res  = await fetch("/api/llamados");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLlamados(data);
        setPendientes(data.filter((l: Llamado) => l.estado === "PENDIENTE").length);
      }
    } finally {
      setLoadingLlam(false);
    }
  };

  // Toma un llamado y salta al formulario con los datos precargados
  const tomarLlamado = async (l: Llamado) => {
    setTomando(l.id);
    try {
      const res  = await fetch(`/api/llamados/${l.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ accion: "tomar" }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "No se pudo tomar el llamado"); loadLlamados(); return; }

      setLlamadoActivo({ ...l, estado: "EN_PROCESO" });
      setRadicado(l.radicado ?? "");
      setFmi(l.fmi ?? "");
      setCumple(null); setResultado(null);
      setObservaciones("");
      setImagen(null);
      setFormError("");
      setSuccess(false);
      // el formulario se muestra dentro de la pestaña de llamados
      setPendientes((n) => Math.max(0, n - 1));
    } finally {
      setTomando(null);
    }
  };

  const loadVerifs = async () => {
    setLoadingList(true);
    try {
      const res  = await fetch("/api/verificaciones");
      const data = await res.json();
      if (Array.isArray(data)) setVerifs(data);
    } finally {
      setLoadingList(false);
    }
  };

  // Adjunta un archivo venga de donde venga: del selector o del portapapeles
  const adjuntar = (file: File, nombreSugerido?: string) => {
    if (file.size > 2 * 1024 * 1024) {
      setFormError("El archivo no puede superar 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagen({ nombre: nombreSugerido || file.name || "adjunto", data: reader.result as string });
      setFormError("");
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) adjuntar(file);
  };

  // Ctrl+V sobre el formulario: pega la captura recortada con la
  // herramienta de Windows sin tener que guardarla antes en disco.
  useEffect(() => {
    if (!open || !llamadoActivo) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (!file) continue;
        e.preventDefault();
        const sello = new Date().toLocaleString("es-CO", {
          timeZone: "America/Bogota",
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }).replace(/[/:]/g, "-").replace(/,?\s+/g, " ");
        const ext = item.type.split("/")[1]?.split("+")[0] || "png";
        adjuntar(file, `Captura ${sello}.${ext}`);
        return;
      }
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [open, llamadoActivo]);

  const resetForm = () => {
    setFmi(""); setRadicado(""); setCumple(null); setResultado(null);
    setObservaciones(""); setImagen(null);
    setFormError(""); setSuccess(false);
    setLlamadoActivo(null);
    setPrevias([]); setSubsanaId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // El folio lo indica ventanilla al solicitar; aquí llega precargado
    if (resultado === null) { setFormError("Seleccione el concepto técnico"); return; }
    // El concepto desfavorable es el respaldo documental: exige observación
    if (resultado !== "PROCEDE" && !observaciones.trim()) {
      setFormError(`Un concepto de ${CONCEPTO_LABEL[resultado]} exige escribir la observación técnica`);
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/verificaciones", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fmi: fmi.trim(), radicado: radicado.trim(), cumple, resultado,
          observaciones: observaciones.trim() || null,
          imagenNombre:  imagen?.nombre || null,
          imagenData:    imagen?.data   || null,
          llamadoId:     llamadoActivo?.id || null,
          subsanaId,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error"); }
      setSuccess(true);
      if (llamadoActivo) loadLlamados();
      setTimeout(() => resetForm(), 2200);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta verificación?")) return;
    await fetch(`/api/verificaciones/${id}`, { method: "DELETE" });
    setVerifs((prev) => prev.filter((v) => v.id !== id));
  };

  // Abre el archivo adjunto de una verificación en una pestaña nueva
  const verArchivo = async (v: Verificacion) => {
    setLoadingImg(v.id);
    try {
      const res  = await fetch(`/api/verificaciones/${v.id}`);
      const data = await res.json();
      if (!data.imagenData) { alert("Este registro no tiene archivo adjunto."); return; }

      const w = window.open("", "_blank");
      if (!w) { alert("Permite las ventanas emergentes para ver el archivo."); return; }

      const esPdf  = String(data.imagenData).startsWith("data:application/pdf");
      const nombre = escHtml(data.imagenNombre ?? "archivo");
      w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>${nombre}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column}
  header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 18px;background:#0f766e;flex-wrap:wrap}
  h1{font-size:14px;font-weight:600}
  .sub{font-size:11px;opacity:.85;margin-top:2px}
  a.dl{background:#fff;color:#0f766e;padding:7px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600}
  main{flex:1;display:flex;align-items:center;justify-content:center;padding:16px}
  img{max-width:100%;max-height:88vh;object-fit:contain;border-radius:6px;box-shadow:0 4px 24px rgba(0,0,0,.4)}
  embed{width:100%;height:88vh;border-radius:6px;background:#fff}
</style></head><body>
<header>
  <div>
    <h1>${nombre}</h1>
    <p class="sub">FMI ${escHtml(data.fmi ?? "—")} &nbsp;·&nbsp; Radicado ${escHtml(data.radicado ?? "—")} &nbsp;·&nbsp; ${data.cumple ? "PROCEDE" : "NO PROCEDE"}</p>
  </div>
  <a class="dl" href="${data.imagenData}" download="${nombre}">Descargar</a>
</header>
<main>${esPdf
  ? `<embed src="${data.imagenData}" type="application/pdf"/>`
  : `<img src="${data.imagenData}" alt="${nombre}"/>`}</main>
</body></html>`);
      w.document.close();
    } catch {
      alert("No se pudo cargar el archivo.");
    } finally {
      setLoadingImg(null);
    }
  };

  // Informe mensual de atención técnica, con la estructura del formato oficial
  const generarInforme = async () => {
    const [anio, mes] = mesInforme.split("-").map(Number);
    if (!anio || !mes) return;

    setGenerandoInforme(true);
    try {
      // Rango del mes completo en hora local
      const desde = new Date(anio, mes - 1, 1, 0, 0, 0);
      const hasta = new Date(anio, mes, 0, 23, 59, 59, 999);

      const res = await fetch(
        `/api/llamados?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}`
      );
      const data = await res.json();
      if (!Array.isArray(data)) { alert("No se pudieron cargar los datos del periodo."); return; }

      const w = window.open("", "_blank");
      if (!w) { alert("Permite las ventanas emergentes para generar el informe."); return; }
      w.document.write(buildInformeMensual(data as LlamadoInforme[], userName, anio, mes - 1));
      w.document.close();
    } finally {
      setGenerandoInforme(false);
    }
  };

  const generarReporte = async (conAnexos: boolean) => {
    setGenerando(true);
    try {
      let datos = verifs;

      // Para el reporte con anexos hay que traer el contenido de cada archivo
      if (conAnexos) {
        datos = await Promise.all(
          verifs.map(async (v) => {
            if (!v.imagenNombre) return v;
            try {
              const res = await fetch(`/api/verificaciones/${v.id}`);
              const d   = await res.json();
              return { ...v, imagenData: d.imagenData ?? null };
            } catch {
              return v;
            }
          })
        );
      }

      // Los check-in de ventanilla no generan verificación, pero deben salir en el reporte
      let derechos: Llamado[] = [];
      try {
        const res  = await fetch("/api/llamados");
        const data = await res.json();
        if (Array.isArray(data)) {
          derechos = data.filter((l: Llamado) => l.esDerechoPeticion);
        }
      } catch { /* el reporte se genera igual, solo sin esta sección */ }

      const w = window.open("", "_blank");
      if (!w) { alert("Permite las ventanas emergentes para generar el reporte."); return; }
      w.document.write(buildReportHTML(datos, userName, conAnexos, derechos));
      w.document.close();
    } finally {
      setGenerando(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-600 outline-none transition-colors";

  return (
    <>
      {/* ── Floating Action Button ── */}
      <button
        onClick={() => { setOpen(true); setTab("llamados"); }}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center ${
          pendientes > 0 ? "bg-amber-500 hover:bg-amber-600 animate-pulse" : "bg-teal-700 hover:bg-teal-800"
        }`}
        title={pendientes > 0 ? `${pendientes} verificación(es) solicitada(s)` : "Verificación de planos"}
        aria-label="Abrir panel de verificación"
      >
        <ClipboardCheck className="h-6 w-6" />
        {pendientes > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-slate-950">
            {pendientes}
          </span>
        )}
      </button>

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => { setOpen(false); resetForm(); }}
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-teal-700 dark:text-teal-400 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Verificación de Planos
                </h2>
              </div>
              <button
                onClick={() => { setOpen(false); resetForm(); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
              {(["llamados", "historial"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-xs sm:text-sm font-medium transition-colors ${
                    tab === t
                      ? "border-b-2 border-teal-700 text-teal-700 dark:text-teal-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {t === "llamados"
                    ? <BellRing className="h-4 w-4 shrink-0" />
                    : <FileText className="h-4 w-4 shrink-0" />}
                  {t === "llamados" ? "Llamados" : "Historial"}
                  {t === "llamados" && pendientes > 0 && (
                    <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {pendientes}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB: Llamados de ventanilla ── */}
            {tab === "llamados" && !llamadoActivo && (
              <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {pendientes > 0
                      ? `${pendientes} plano${pendientes !== 1 ? "s" : ""} por revisar`
                      : "Sin llamados pendientes"}
                  </p>
                  <button
                    onClick={loadLlamados}
                    className="text-xs text-teal-700 dark:text-teal-400 hover:underline shrink-0"
                  >
                    Actualizar
                  </button>
                </div>

                {loadingLlam ? (
                  <div className="py-10 text-center text-sm text-slate-400">Cargando…</div>
                ) : llamados.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    Ventanilla no ha solicitado ninguna verificación.
                  </div>
                ) : (
                  llamados.map((l) => (
                    <div
                      key={l.id}
                      className={`p-3.5 rounded-xl border ${
                        l.estado === "PENDIENTE"
                          ? "border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/15"
                          : l.estado === "EN_PROCESO"
                            ? "border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-900/15"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            l.estado === "PENDIENTE"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                              : l.estado === "EN_PROCESO"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                                : l.estado === "COMPLETADO"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {l.estado === "PENDIENTE"  ? "PENDIENTE"
                            : l.estado === "EN_PROCESO" ? "EN REVISIÓN"
                            : l.estado === "COMPLETADO" ? "VERIFICADO" : "CANCELADO"}
                        </span>
                        {l.esDerechoPeticion && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 shrink-0">
                            DERECHO DE PETICIÓN
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(l.createdAt).toLocaleString("es-CO", {
                            timeZone: "America/Bogota",
                            day: "2-digit", month: "short",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {l.radicado ? `Radicado: ${l.radicado}` : l.fmi ? `FMI: ${l.fmi}` : "Sin identificar"}
                      </p>
                      {l.radicado && l.fmi && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">FMI: {l.fmi}</p>
                      )}
                      {l.formato && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Formato: {FORMATO_LABEL[l.formato] ?? l.formato}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Solicita: {l.solicitante?.name ?? l.solicitante?.email ?? "Ventanilla"}
                      </p>
                      {l.nota && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">{l.nota}</p>
                      )}

                      {l.estado === "PENDIENTE" && (
                        <button
                          onClick={() => tomarLlamado(l)}
                          disabled={tomando === l.id}
                          className="mt-2.5 w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                        >
                          {tomando === l.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Check className="h-3.5 w-3.5" />}
                          {tomando === l.id ? "Tomando…" : "Tomar verificación"}
                        </button>
                      )}

                      {/* Resultado de tu visto bueno: ventanilla ya radicó */}
                      {l.plan && !l.esDerechoPeticion && (
                        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 flex-wrap">
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          Radicado por ventanilla: <strong>{l.plan.radicado}</strong>
                          {l.plan.mutacion && <span className="text-slate-500">· {l.plan.mutacion}</span>}
                        </p>
                      )}

                      {/* Aprobado por ti, pendiente de que ventanilla lo radique */}
                      {l.estado === "COMPLETADO" && !l.esDerechoPeticion && !l.planId &&
                        (l.verificacion?.resultado === "PROCEDE" || (l.verificacion && l.verificacion.cumple)) && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          Aprobado — ventanilla aún no lo radica
                        </p>
                      )}

                      {l.estado === "EN_PROCESO" && (
                        <button
                          onClick={() => {
                            setLlamadoActivo(l);
                            setRadicado(l.radicado ?? "");
                            setFmi(l.fmi ?? "");
                            setCumple(null); setResultado(null); setObservaciones(""); setImagen(null);
                            setFormError(""); setSuccess(false);

                          }}
                          className="mt-2.5 w-full py-2 border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Registrar resultado
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── TAB: Nueva Verificación ── */}
            {tab === "llamados" && llamadoActivo && (
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">

                {llamadoActivo && (
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                          <BellRing className="h-3.5 w-3.5 shrink-0" />
                          Revisando plano de {llamadoActivo.solicitante?.name ?? "ventanilla"}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-snug">
                          Al guardar se le notifica el resultado y el llamado queda cerrado.
                        </p>
                      </div>

                      {/* Cronómetro de la revisión en curso */}
                      {llamadoActivo.tomadoEn && (
                        <div className="shrink-0 text-center px-3 py-1.5 rounded-lg bg-blue-600 text-white">
                          <p className="text-base font-bold tabular-nums leading-none">
                            {cronometro(ahora - new Date(llamadoActivo.tomadoEn).getTime())}
                          </p>
                          <p className="text-[9px] uppercase tracking-wide opacity-80 mt-0.5">
                            en revisión
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => { resetForm(); loadLlamados(); }}
                      className="text-xs text-blue-600 dark:text-blue-400 underline mt-2"
                    >
                      ← Volver a los llamados
                    </button>
                  </div>
                )}

                {formError && (
                  <p className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
                    {formError}
                  </p>
                )}
                {success && (
                  <p className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" /> Verificación guardada correctamente
                  </p>
                )}

                {/* FMI */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    FMI <span className="text-slate-400 text-xs font-normal">(lo indica ventanilla; corrígelo si hace falta)</span>
                  </label>
                  <input
                    type="text"
                    value={fmi}
                    onChange={(e) => setFmi(e.target.value)}
                    placeholder="Ej: 060-123456"
                    className={inputClass}
                  />
                </div>

                {/* Revisiones anteriores del mismo folio */}
                {buscandoP && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Buscando revisiones anteriores…
                  </p>
                )}
                {previas.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-2">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 shrink-0" />
                      Este folio ya fue verificado {previas.length} vez{previas.length !== 1 ? "ces" : ""}
                    </p>
                    {previas.slice(0, 3).map((p) => {
                      const c = p.resultado ?? (p.cumple ? "PROCEDE" : "NO_PROCEDE");
                      const fecha = new Date(p.createdAt).toLocaleDateString("es-CO", {
                        timeZone: "America/Bogota", day: "2-digit", month: "long", year: "numeric",
                      });
                      return (
                        <div key={p.id} className="text-xs bg-white/70 dark:bg-slate-900/50 rounded-lg p-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className={`font-bold ${
                              c === "PROCEDE" ? "text-emerald-700 dark:text-emerald-400"
                                : c === "REQUIERE_AJUSTE" ? "text-amber-700 dark:text-amber-400"
                                : "text-red-700 dark:text-red-400"
                            }`}>
                              {CONCEPTO_LABEL[c]}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">{fecha}</span>
                          </div>
                          {p.observaciones && (
                            <p className="text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                              {p.observaciones}
                            </p>
                          )}
                          {c !== "PROCEDE" && (
                            <button
                              type="button"
                              onClick={() => setSubsanaId(subsanaId === p.id ? null : p.id)}
                              className={`mt-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                subsanaId === p.id
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                              }`}
                            >
                              {subsanaId === p.id
                                ? `✓ Subsana la observación del ${fecha}`
                                : "Marcar como subsanada"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Radicado */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Número de Radicado{" "}
                    <span className="text-slate-400 text-xs font-normal">
                      (opcional — ventanilla lo asigna al radicar)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={radicado}
                    onChange={(e) => setRadicado(e.target.value)}
                    placeholder="Ej: 2025-0123"
                    className={inputClass}
                  />
                </div>

                {/* Resultado */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Resultado de la revisión <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { setResultado("PROCEDE"); setCumple(true); }}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border-2 text-[11px] font-bold transition-all ${
                        resultado === "PROCEDE"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-300"
                      }`}
                    >
                      <Check className="h-4 w-4 shrink-0" /> PROCEDE
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResultado("NO_PROCEDE"); setCumple(false); }}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border-2 text-[11px] font-bold transition-all ${
                        resultado === "NO_PROCEDE"
                          ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-red-300"
                      }`}
                    >
                      <XCircle className="h-4 w-4 shrink-0" /> NO PROCEDE
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResultado("REQUIERE_AJUSTE"); setCumple(false); }}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border-2 text-[11px] font-bold transition-all ${
                        resultado === "REQUIERE_AJUSTE"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-300"
                      }`}
                    >
                      <PenLine className="h-4 w-4 shrink-0" /> REQUIERE AJUSTE
                    </button>
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Observaciones
                    {cumple === false && <span className="text-xs text-red-500 ml-1">— describa qué hace falta</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder={
                      cumple === false
                        ? "Ej: Falta firma del profesional, área no coincide con plano..."
                        : "Observaciones adicionales (opcional)"
                    }
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Imagen */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Imagen del plano
                    <span className="text-slate-400 text-xs font-normal ml-1">(imagen o PDF — máx. 2 MB)</span>
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:border-teal-400 dark:hover:border-teal-600 transition-colors bg-slate-50 dark:bg-slate-800/40"
                  >
                    {imagen ? (
                      <>
                        <ImageIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center break-all">{imagen.nombre}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setImagen(null); if (fileRef.current) fileRef.current.value = ""; }}
                          className="text-xs text-red-500 hover:text-red-700 underline"
                        >
                          Quitar archivo
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-slate-400" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Toca para adjuntar un archivo
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clipboard className="h-3 w-3 shrink-0" />
                          o pega una captura con <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Ctrl</kbd>
                          +
                          <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">V</kbd>
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFile}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={saving || success}
                  className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving
                    ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check className="h-4 w-4" />}
                  {saving ? "Guardando…" : success ? "¡Guardado!" : "Guardar Verificación"}
                </button>
              </form>
            )}

            {/* ── TAB: Historial ── */}
            {tab === "historial" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Toolbar */}
                <div className="space-y-2.5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {verifs.length} registro{verifs.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => generarReporte(false)}
                      disabled={verifs.length === 0 || generando}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5 shrink-0" /> Reporte resumen
                    </button>
                    <button
                      onClick={() => generarReporte(true)}
                      disabled={verifs.length === 0 || generando}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                    >
                      {generando
                        ? <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        : <ImageIcon className="h-3.5 w-3.5 shrink-0" />}
                      {generando ? "Preparando…" : "Reporte con planos"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
                    El <strong>resumen</strong> lleva solo la tabla. El <strong>reporte con planos</strong> agrega
                    una página por cada plano con su imagen adjunta.
                  </p>

                  {/* Informe mensual de atención técnica */}
                  <div className="pt-3 mt-1 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                      <FileBarChart className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                      Informe Mensual de Atención Técnica
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="month"
                        value={mesInforme}
                        onChange={(e) => setMesInforme(e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs"
                      />
                      <button
                        onClick={generarInforme}
                        disabled={generandoInforme}
                        className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                      >
                        {generandoInforme
                          ? <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <FileBarChart className="h-3.5 w-3.5" />}
                        {generandoInforme ? "Generando…" : "Generar"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug mt-1.5">
                      Volumen, carga de trabajo, oportunidad, resultados y pendientes del mes,
                      con anexo de derechos de petición sin concepto.
                    </p>
                  </div>
                </div>

                {loadingList ? (
                  <div className="py-10 text-center text-sm text-slate-400">Cargando…</div>
                ) : verifs.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    No hay verificaciones registradas aún.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {verifs.map((v) => (
                      <div
                        key={v.id}
                        className={`p-3.5 rounded-xl border ${
                          concepto(v) === "PROCEDE"
                            ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
                            : concepto(v) === "REQUIERE_AJUSTE"
                              ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
                              : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                  concepto(v) === "PROCEDE"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                    : concepto(v) === "REQUIERE_AJUSTE"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                                }`}
                              >
                                {concepto(v) === "PROCEDE"
                                  ? <Check className="h-3 w-3" />
                                  : concepto(v) === "REQUIERE_AJUSTE"
                                    ? <PenLine className="h-3 w-3" />
                                    : <XCircle className="h-3 w-3" />}
                                {CONCEPTO_LABEL[concepto(v)]}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {new Date(v.createdAt).toLocaleDateString("es-CO", {
                                  timeZone: "America/Bogota",
                                  day: "2-digit", month: "short", year: "numeric",
                                })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {v.fmi
                                ? `FMI: ${v.fmi}`
                                : v.radicado
                                  ? `Radicado: ${v.radicado}`
                                  : v.llamado?.plan
                                    ? `Radicado: ${v.llamado.plan.radicado}`
                                    : "Plano sin identificar"}
                            </p>
                            {v.fmi && v.radicado && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Radicado: {v.radicado}
                              </p>
                            )}
                            {v.llamado?.plan && !v.llamado.esDerechoPeticion && (
                              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                <Check className="h-3 w-3 shrink-0" />
                                Radicado en el sistema: <strong>{v.llamado.plan.radicado}</strong>
                              </p>
                            )}

                            {/* Horas de recepción y cierre de la revisión */}
                            {(v.llamado?.tomadoEn || v.llamado?.finalizadoEn) && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                                <Clock className="h-3 w-3 shrink-0" />
                                {v.llamado?.tomadoEn && (
                                  <span>Recibido {hora(v.llamado.tomadoEn)}</span>
                                )}
                                {v.llamado?.finalizadoEn && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span>Finalizado {hora(v.llamado.finalizadoEn)}</span>
                                  </>
                                )}
                                {duracion(v) !== "—" && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                                      {duracion(v)}
                                    </span>
                                  </>
                                )}
                              </p>
                            )}

                            {/* Subsanación de una observación anterior */}
                            {v.subsana && (
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 flex items-start gap-1">
                                <Check className="h-3 w-3 shrink-0 mt-px" />
                                <span>
                                  Subsana la observación del{" "}
                                  {new Date(v.subsana.createdAt).toLocaleDateString("es-CO", {
                                    timeZone: "America/Bogota",
                                    day: "2-digit", month: "long", year: "numeric",
                                  })}
                                </span>
                              </p>
                            )}
                            {v.observaciones && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                {v.observaciones}
                              </p>
                            )}
                            {v.imagenNombre && (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 min-w-0">
                                  <ImageIcon className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[150px]">{v.imagenNombre}</span>
                                </span>
                                <button
                                  onClick={() => verArchivo(v)}
                                  disabled={loadingImg === v.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-medium transition-colors disabled:opacity-50 shrink-0"
                                >
                                  <Eye className="h-3 w-3" />
                                  {loadingImg === v.id ? "Abriendo…" : "Ver"}
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 mt-0.5"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
