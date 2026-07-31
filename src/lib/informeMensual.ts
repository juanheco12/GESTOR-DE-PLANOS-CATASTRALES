// Informe mensual de atención técnica — revisión de procedencia de planos.
// Estructura según la especificación del profesional revisor (TRAZA v1.0).

export interface LlamadoInforme {
  id:                string;
  radicado:          string | null;
  fmi:               string | null;
  nota:              string | null;
  formato:           string | null;
  esDerechoPeticion: boolean;
  estado:            "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO";
  createdAt:         string;
  tomadoEn:          string | null;
  finalizadoEn:      string | null;
  solicitante:   { name: string | null; email: string | null } | null;
  digitalizador: { name: string | null; email: string | null } | null;
  verificacion:  { id: string; cumple: boolean; resultado: string | null; observaciones: string | null } | null;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Meta institucional: proporción de atenciones respondidas en 10 min o menos
const META_OPORTUNIDAD = 0.60;
const META_RESPUESTA_MIN = 15;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const num = (n: number, dec = 1) =>
  n.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const pct = (n: number) => `${num(n * 100)} %`;

// Días hábiles del mes (lunes a viernes). No descuenta festivos.
function diasHabiles(anio: number, mes: number): number {
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  let n = 0;
  for (let d = 1; d <= ultimo; d++) {
    const dia = new Date(anio, mes, d).getDay();
    if (dia !== 0 && dia !== 6) n++;
  }
  return n;
}

function conceptoDe(v: LlamadoInforme["verificacion"]): string | null {
  if (!v) return null;
  if (v.resultado === "PROCEDE" || v.resultado === "NO_PROCEDE" || v.resultado === "REQUIERE_AJUSTE") {
    return v.resultado;
  }
  return v.cumple ? "PROCEDE" : "NO_PROCEDE";
}

const minutosEntre = (a: string | null, b: string | null): number | null => {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms / 60000 : null;
};

export function buildInformeMensual(
  llamados: LlamadoInforme[],
  revisor: string,
  anio: number,
  mes: number            // 0-11
): string {
  const habiles = diasHabiles(anio, mes);
  const periodo = `${MESES[mes]} de ${anio}`;
  const generado = new Date().toLocaleDateString("es-CO", {
    timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric",
  });

  // Las canceladas no son atención prestada: quedan fuera de todo el informe
  const atendidas = llamados.filter((l) => l.estado !== "CANCELADO");

  // ── 1. Volumen ──
  const total      = atendidas.length;
  const dp         = atendidas.filter((l) => l.esDerechoPeticion).length;
  const inmediatas = total - dp;
  const promDiario = habiles > 0 ? total / habiles : 0;

  // ── 2. Carga de trabajo ──
  const revisados = atendidas
    .map((l) => minutosEntre(l.tomadoEn, l.finalizadoEn))
    .filter((m): m is number => m !== null);

  const minutosTotal = revisados.reduce((a, b) => a + b, 0);
  const horasTotal   = minutosTotal / 60;
  const jornadas     = horasTotal / 8;
  const promRevision = revisados.length ? minutosTotal / revisados.length : 0;
  const maxRevision  = revisados.length ? Math.max(...revisados) : 0;

  // ── 3. Oportunidad (solo atención inmediata) ──
  const respuestas = atendidas
    .filter((l) => !l.esDerechoPeticion)
    .map((l) => minutosEntre(l.createdAt, l.tomadoEn))
    .filter((m): m is number => m !== null);

  const promRespuesta = respuestas.length
    ? respuestas.reduce((a, b) => a + b, 0) / respuestas.length
    : 0;
  const enDiezMin  = respuestas.filter((m) => m <= 10).length;
  const propDiez   = respuestas.length ? enDiezMin / respuestas.length : 0;
  const bajoMeta   = respuestas.length > 0 && propDiez < META_OPORTUNIDAD;

  // ── 4. Resultado de la revisión ──
  const conceptos = atendidas.map((l) => conceptoDe(l.verificacion)).filter(Boolean) as string[];
  const procede   = conceptos.filter((c) => c === "PROCEDE").length;
  const noProcede = conceptos.filter((c) => c === "NO_PROCEDE").length;
  const ajuste    = conceptos.filter((c) => c === "REQUIERE_AJUSTE").length;
  const emitidos  = procede + noProcede + ajuste;
  const propNoProcede = emitidos ? noProcede / emitidos : 0;

  // ── 5. Pendientes al cierre ──
  const enTramite    = atendidas.filter((l) => l.estado === "PENDIENTE" || l.estado === "EN_PROCESO");
  const dpSinAtender = atendidas.filter((l) => l.esDerechoPeticion && !l.verificacion);

  const filaPct = (n: number) => (total ? pct(n / total) : "—");

  // Anexo: relación de derechos de petición sin concepto emitido
  const filasDP = dpSinAtender.map((l) => {
    const dias = Math.floor(
      (Date.now() - new Date(l.createdAt).getTime()) / 86_400_000
    );
    return `
      <tr>
        <td>${esc(l.radicado ?? "—")}</td>
        <td>${esc(l.fmi ?? "—")}</td>
        <td>${new Date(l.createdAt).toLocaleDateString("es-CO", {
          timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric",
        })}</td>
        <td>${dias}</td>
        <td>${esc(l.solicitante?.name ?? l.solicitante?.email ?? "—")}</td>
      </tr>`;
  }).join("");

  const anexoDP = dpSinAtender.length === 0 ? "" : `
  <section class="anexo">
    <h2>Anexo — Derechos de petición sin concepto emitido (${dpSinAtender.length})</h2>
    <p class="pie">Relación para solicitud de asignación formal ante la coordinación.</p>
    <table>
      <thead>
        <tr><th>Radicado</th><th>Matrícula</th><th>Registrada</th><th>Días transcurridos</th><th>Funcionario que registró</th></tr>
      </thead>
      <tbody>${filasDP}</tbody>
    </table>
  </section>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Informe Mensual de Atención Técnica — ${esc(periodo)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"Times New Roman",Georgia,serif;font-size:10.5pt;color:#111;padding:22mm 18mm;line-height:1.35}
  h1{font-size:13pt;text-align:center;letter-spacing:.3px}
  .sub{font-size:10.5pt;text-align:center;margin-top:2px}
  .ofi{font-size:9.5pt;text-align:center;color:#444;margin-top:2px;padding-bottom:8px;border-bottom:1.5px solid #111}
  table{width:100%;border-collapse:collapse;margin-top:5px}
  th,td{border:.5pt solid #999;padding:3.5px 7px;text-align:left;font-size:9.5pt;vertical-align:top}
  thead th{background:#e8e8e8;font-weight:bold}
  td.n,th.n{text-align:right;white-space:nowrap}
  table.cab{margin:10px 0 4px}
  table.cab th{background:#f2f2f2;width:22%}
  h2{font-size:10.5pt;margin-top:15px;margin-bottom:2px;font-weight:bold}
  .pie{font-size:8.5pt;color:#555;margin-top:4px;font-style:italic}
  .alerta{color:#b00;font-weight:bold}
  .obs{border:.5pt solid #999;padding:9px 11px;margin-top:5px;min-height:70px;font-size:9.5pt;text-align:justify;line-height:1.45}
  .obs:focus{outline:2px solid #2563eb;background:#f8fbff}
  .firma{margin-top:34px;font-size:9.5pt}
  .firma .linea{border-top:.5pt solid #111;width:62mm;margin-bottom:3px}
  .nota-final{margin-top:16px;font-size:8.5pt;color:#555}
  .anexo{page-break-before:always;padding-top:4px}
  .editable{background:#fffbe6}
  @media print{
    @page{margin:16mm}
    body{padding:0}
    .obs{background:none}
    .editable{background:none}
    .noprint{display:none}
  }
  .noprint{background:#eff6ff;border:1px solid #bfdbfe;padding:8px 11px;margin-bottom:14px;font-size:9pt;font-family:Arial,sans-serif;border-radius:4px}
</style>
</head>
<body>

<div class="noprint">
  Los campos resaltados son editables: haz clic y escribe antes de imprimir.
  Luego usa <strong>Ctrl+P → Guardar como PDF</strong>.
</div>

<h1>INFORME MENSUAL DE ATENCIÓN TÉCNICA</h1>
<p class="sub">Revisión de procedencia de planos</p>
<p class="ofi">Oficina de Catastro — Alcaldía de Montería</p>

<table class="cab">
  <tr><th>Periodo</th><td>${esc(periodo)}</td><th>Días hábiles</th><td>${habiles}</td></tr>
  <tr><th>Profesional revisor</th><td>${esc(revisor)}</td><th>Generado</th><td>${generado}</td></tr>
</table>

<h2>1. Volumen de atención</h2>
<table>
  <thead><tr><th>Concepto</th><th class="n">Cantidad</th><th class="n">Participación</th></tr></thead>
  <tbody>
    <tr><td>Solicitudes atendidas en el periodo</td><td class="n">${total}</td><td class="n">${total ? "100,0 %" : "—"}</td></tr>
    <tr><td>&nbsp;&nbsp;&nbsp;Procedencia de plano — atención inmediata</td><td class="n">${inmediatas}</td><td class="n">${filaPct(inmediatas)}</td></tr>
    <tr><td>&nbsp;&nbsp;&nbsp;Derechos de petición</td><td class="n">${dp}</td><td class="n">${filaPct(dp)}</td></tr>
    <tr><td>Promedio diario (días hábiles)</td><td class="n">${num(promDiario)}</td><td class="n">—</td></tr>
  </tbody>
</table>

<h2>2. Carga de trabajo profesional</h2>
<table>
  <thead><tr><th>Indicador</th><th class="n">Valor</th><th>Equivalencia</th></tr></thead>
  <tbody>
    <tr><td>Tiempo total de revisión</td><td class="n">${num(horasTotal)} horas</td><td>${num(jornadas)} jornadas</td></tr>
    <tr><td>Tiempo promedio por solicitud</td><td class="n">${num(promRevision)} minutos</td><td>—</td></tr>
    <tr><td>Revisión de mayor duración</td><td class="n">${Math.round(maxRevision)} minutos</td><td>—</td></tr>
    <tr><td>Solicitudes con tiempo registrado</td><td class="n">${revisados.length}</td><td>de ${total}</td></tr>
  </tbody>
</table>
<p class="pie">
  Tiempo de revisión: intervalo entre la toma de la solicitud por el profesional revisor y su cierre
  con concepto técnico. El sistema no registra todavía pausas por atención simultánea, de modo que
  este valor corresponde al tiempo transcurrido y no al tiempo efectivo descontando interrupciones.
</p>

<h2>3. Oportunidad en la atención</h2>
<table>
  <thead><tr><th>Indicador</th><th class="n">Valor</th><th class="n">Meta</th></tr></thead>
  <tbody>
    <tr><td>Tiempo promedio de respuesta — inmediatas</td><td class="n">${num(promRespuesta)} minutos</td><td class="n">≤ ${META_RESPUESTA_MIN} min</td></tr>
    <tr><td>Atenciones respondidas en 10 minutos o menos</td><td class="n">${enDiezMin} de ${respuestas.length}</td><td class="n">—</td></tr>
    <tr>
      <td>Proporción respondida en 10 minutos o menos</td>
      <td class="n ${bajoMeta ? "alerta" : ""}">${respuestas.length ? pct(propDiez) : "—"}</td>
      <td class="n">≥ ${Math.round(META_OPORTUNIDAD * 100)} %</td>
    </tr>
  </tbody>
</table>
<p class="pie">
  Tiempo de respuesta: intervalo entre el registro de la solicitud en ventanilla y el inicio de la
  atención por parte del profesional revisor. Se calcula únicamente sobre atención inmediata.
</p>

<h2>4. Resultado de la revisión</h2>
<table>
  <thead><tr><th>Concepto emitido</th><th class="n">Cantidad</th><th class="n">Participación</th></tr></thead>
  <tbody>
    <tr><td>Procede</td><td class="n">${procede}</td><td class="n">${emitidos ? pct(procede / emitidos) : "—"}</td></tr>
    <tr><td>No procede</td><td class="n">${noProcede}</td><td class="n">${emitidos ? pct(noProcede / emitidos) : "—"}</td></tr>
    <tr><td>Requiere ajuste</td><td class="n">${ajuste}</td><td class="n">${emitidos ? pct(ajuste / emitidos) : "—"}</td></tr>
  </tbody>
</table>
<p class="pie">
  Cada concepto de no procedencia cuenta con observación técnica escrita en el registro detallado.
  Las solicitudes abiertas se excluyen de este cuadro y de los promedios.
</p>

<h2>5. Pendientes al cierre del periodo</h2>
<table>
  <thead><tr><th>Concepto</th><th class="n">Cantidad</th><th>Observación</th></tr></thead>
  <tbody>
    <tr><td>Solicitudes en trámite</td><td class="n">${enTramite.length}</td><td>En revisión</td></tr>
    <tr><td>Derechos de petición sin concepto emitido</td><td class="n">${dpSinAtender.length}</td><td>${dpSinAtender.length ? "Requiere asignación formal" : "Sin pendientes"}</td></tr>
  </tbody>
</table>

<h2>6. Observaciones</h2>
<div class="obs editable" contenteditable="true">La proporción de no procedencia (${emitidos ? pct(propNoProcede) : "sin datos"}) corresponde a ${noProcede} de ${emitidos} conceptos emitidos en el periodo.${bajoMeta ? ` La proporción de atenciones respondidas en 10 minutos o menos (${pct(propDiez)}) se ubica por debajo de la meta institucional del ${Math.round(META_OPORTUNIDAD * 100)} %.` : ""}${dpSinAtender.length ? ` Se solicita la asignación formal de los ${dpSinAtender.length} derechos de petición relacionados en el anexo, a efectos de garantizar su atención dentro de los términos legales.` : ""} [Escriba aquí las causas recurrentes y las recomendaciones del periodo.]</div>

<div class="firma">
  <div class="linea"></div>
  <div>${esc(revisor)}</div>
  <div class="editable" contenteditable="true">Coordinador de Digitalización — [matrícula profesional]</div>
</div>

<p class="nota-final">
  Anexo: registro detallado de ${total} solicitud${total === 1 ? "" : "es"} del periodo, disponible en el módulo de verificación.
</p>

${anexoDP}

</body>
</html>`;
}
