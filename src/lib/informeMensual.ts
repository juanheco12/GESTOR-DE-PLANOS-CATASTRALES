// Informe mensual de atención técnica — revisión de procedencia de planos.
// Reproduce el formato oficial entregado por el profesional revisor (TRAZA v1.0).

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

// Metas institucionales
const META_OPORTUNIDAD   = 0.60;
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
  const habiles  = diasHabiles(anio, mes);
  const periodo  = `${MESES[mes]} de ${anio}`;
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
  // Tiempo efectivo = suma de tramos activos. El sistema registra un único
  // tramo por revisión (no hay pausa), de modo que las interrupciones son 0.
  const tramos = atendidas
    .map((l) => minutosEntre(l.tomadoEn, l.finalizadoEn))
    .filter((m): m is number => m !== null);

  const minutosTotal  = tramos.reduce((a, b) => a + b, 0);
  const horasTotal    = minutosTotal / 60;
  const jornadas      = horasTotal / 8;
  const promRevision  = tramos.length ? minutosTotal / tramos.length : 0;
  const maxRevision   = tramos.length ? Math.max(...tramos) : 0;
  const interrupciones = 0;

  // ── 3. Oportunidad (solo atención inmediata) ──
  const respuestas = atendidas
    .filter((l) => !l.esDerechoPeticion)
    .map((l) => minutosEntre(l.createdAt, l.tomadoEn))
    .filter((m): m is number => m !== null);

  const promRespuesta = respuestas.length
    ? respuestas.reduce((a, b) => a + b, 0) / respuestas.length
    : 0;
  const enDiezMin = respuestas.filter((m) => m <= 10).length;
  const propDiez  = respuestas.length ? enDiezMin / respuestas.length : 0;
  const bajoMeta  = respuestas.length > 0 && propDiez < META_OPORTUNIDAD;
  const respLenta = respuestas.length > 0 && promRespuesta > META_RESPUESTA_MIN;

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

  const partTotal = (n: number) => (total ? pct(n / total) : "—");
  const partEmit  = (n: number) => (emitidos ? pct(n / emitidos) : "—");

  // Anexo: relación de derechos de petición sin concepto emitido
  const filasDP = dpSinAtender.map((l) => {
    const dias = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 86_400_000);
    return `
      <tr>
        <td>${esc(l.radicado ?? "—")}</td>
        <td>${esc(l.fmi ?? "—")}</td>
        <td class="c">${new Date(l.createdAt).toLocaleString("es-CO", {
          timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })}</td>
        <td class="c">${dias}</td>
        <td>${esc(l.solicitante?.name ?? l.solicitante?.email ?? "—")}</td>
      </tr>`;
  }).join("");

  const anexoDP = dpSinAtender.length === 0 ? "" : `
  <section class="anexo">
    <h2>Anexo — Derechos de petición pendientes de trámite o asignación</h2>
    <p class="nota">Relación para solicitud de asignación formal ante la coordinación.</p>
    <table>
      <thead>
        <tr>
          <th>Radicado</th><th>Matrícula</th><th class="c">Registrada</th>
          <th class="c">Días transcurridos</th><th>Funcionario que registró</th>
        </tr>
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
  body{
    font-family:Calibri,Candara,"Segoe UI",Arial,sans-serif;
    font-size:10.5pt;color:#000;padding:18mm 16mm;line-height:1.3;
  }
  h1{font-size:15pt;color:#1F3864;text-align:center;font-weight:bold;letter-spacing:.2px}
  .sub{font-size:11pt;color:#333;text-align:center;margin-top:3px}
  .ofi{font-size:9.5pt;color:#777;text-align:center;margin-top:2px}

  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{border:.75pt solid #BFBFBF;padding:4.5px 9px;font-size:10pt;vertical-align:middle}
  thead th{background:#1F3864;color:#fff;font-weight:bold;border-color:#1F3864;text-align:left}
  tbody tr:nth-child(even) td{background:#F2F2F2}
  td.c,th.c{text-align:center}
  td.v{text-align:center;font-weight:bold}
  td.ind{padding-left:22px}

  table.cab{margin:14px 0 4px}
  table.cab td,table.cab th{padding:5px 10px}
  table.cab th{background:#fff;color:#000;border-color:#BFBFBF;font-weight:normal;width:20%}
  table.cab td{text-align:center;font-weight:bold;width:30%}

  h2{font-size:11.5pt;color:#1F3864;font-weight:bold;margin-top:16px}
  .nota{font-size:8.5pt;color:#666;font-style:italic;margin-top:4px}
  .alerta{color:#C00000;font-weight:bold}

  .obs{
    border:.75pt solid #BFBFBF;padding:9px 11px;margin-top:6px;min-height:74px;
    font-size:10pt;text-align:justify;line-height:1.45;
  }
  .obs:focus{outline:2px solid #2563eb;background:#f8fbff}
  .editable{background:#FFFBE6}

  .firma{margin-top:36px;font-size:10pt}
  .firma .linea{border-top:.75pt solid #000;width:66mm;margin-bottom:4px}
  .anexo-nota{margin-top:18px;font-size:9pt;color:#555}
  .anexo{page-break-before:always;padding-top:4px}

  @media print{
    @page{margin:14mm}
    body{padding:0}
    .obs,.editable{background:none}
    .noprint{display:none}
  }
  .noprint{
    background:#EFF6FF;border:1px solid #BFDBFE;padding:8px 12px;margin-bottom:14px;
    font-size:9pt;border-radius:4px;color:#1e3a5f;
  }
</style>
</head>
<body>

<div class="noprint">
  Los campos resaltados en amarillo son editables: haz clic y escribe antes de imprimir.
  Luego usa <strong>Ctrl+P → Destino: Guardar como PDF</strong>.
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
  <thead><tr><th>Concepto</th><th class="c">Cantidad</th><th class="c">Participación</th></tr></thead>
  <tbody>
    <tr><td>Solicitudes atendidas en el periodo</td><td class="v">${total}</td><td class="c">${total ? "100,0 %" : "—"}</td></tr>
    <tr><td class="ind">Procedencia de plano — atención inmediata</td><td class="v">${inmediatas}</td><td class="c">${partTotal(inmediatas)}</td></tr>
    <tr><td class="ind">Derechos de petición</td><td class="v">${dp}</td><td class="c">${partTotal(dp)}</td></tr>
    <tr><td>Promedio diario (días hábiles)</td><td class="v">${num(promDiario)}</td><td class="c">—</td></tr>
  </tbody>
</table>

<h2>2. Carga de trabajo profesional</h2>
<table>
  <thead><tr><th>Indicador</th><th class="c">Valor</th><th class="c">Equivalencia</th></tr></thead>
  <tbody>
    <tr><td>Tiempo efectivo total de revisión</td><td class="v">${num(horasTotal)} horas</td><td class="c">${num(jornadas)} jornadas</td></tr>
    <tr><td>Tiempo efectivo promedio por solicitud</td><td class="v">${num(promRevision)} minutos</td><td class="c">—</td></tr>
    <tr><td>Revisión de mayor duración</td><td class="v">${Math.round(maxRevision)} minutos</td><td class="c">—</td></tr>
    <tr><td>Interrupciones por atención simultánea</td><td class="v">${interrupciones}</td><td class="c">—</td></tr>
  </tbody>
</table>
<p class="nota">
  Tiempo efectivo: suma de tramos activos de revisión, excluyendo pausas por atención simultánea.
  El sistema registra un tramo continuo por revisión, por lo que no se contabilizan interrupciones.
</p>

<h2>3. Oportunidad en la atención</h2>
<table>
  <thead><tr><th>Indicador</th><th class="c">Valor</th><th class="c">Meta</th></tr></thead>
  <tbody>
    <tr>
      <td>Tiempo promedio de respuesta — inmediatas</td>
      <td class="v ${respLenta ? "alerta" : ""}">${num(promRespuesta)} minutos</td>
      <td class="c">≤ ${META_RESPUESTA_MIN} min</td>
    </tr>
    <tr><td>Atenciones respondidas en 10 minutos o menos</td><td class="v">${enDiezMin} de ${respuestas.length}</td><td class="c">—</td></tr>
    <tr>
      <td>Proporción respondida en 10 minutos o menos</td>
      <td class="v ${bajoMeta ? "alerta" : ""}">${respuestas.length ? pct(propDiez) : "—"}</td>
      <td class="c ${bajoMeta ? "alerta" : ""}">≥ ${Math.round(META_OPORTUNIDAD * 100)} %</td>
    </tr>
  </tbody>
</table>
<p class="nota">
  Tiempo de respuesta: intervalo entre el registro de la solicitud en ventanilla y el inicio de la
  atención por parte del profesional revisor. Se calcula únicamente sobre atención inmediata.
</p>

<h2>4. Resultado de la revisión</h2>
<table>
  <thead><tr><th>Concepto emitido</th><th class="c">Cantidad</th><th class="c">Participación</th></tr></thead>
  <tbody>
    <tr><td>Procede</td><td class="v">${procede}</td><td class="c">${partEmit(procede)}</td></tr>
    <tr><td>No procede</td><td class="v">${noProcede}</td><td class="c">${partEmit(noProcede)}</td></tr>
    <tr><td>Requiere ajuste</td><td class="v">${ajuste}</td><td class="c">${partEmit(ajuste)}</td></tr>
  </tbody>
</table>
<p class="nota">
  Cada no procedencia cuenta con observación técnica escrita y evidencia gráfica en el registro detallado.
  Las solicitudes abiertas se excluyen de este cuadro y del denominador de no procedencia.
</p>

<h2>5. Pendientes al cierre del periodo</h2>
<table>
  <thead><tr><th>Concepto</th><th class="c">Cantidad</th><th>Observación</th></tr></thead>
  <tbody>
    <tr><td>Solicitudes en trámite</td><td class="v">${enTramite.length}</td><td>En revisión</td></tr>
    <tr><td>Derechos de petición sin asignación formal</td><td class="v">${dpSinAtender.length}</td><td>${dpSinAtender.length ? "Requiere asignación" : "Sin pendientes"}</td></tr>
  </tbody>
</table>

<h2>6. Observaciones</h2>
<div class="obs editable" contenteditable="true">La proporción de no procedencia (${emitidos ? pct(propNoProcede) : "sin datos"}) corresponde a ${noProcede} de ${emitidos} conceptos emitidos en el periodo.${bajoMeta ? ` La proporción de atenciones respondidas en 10 minutos o menos (${pct(propDiez)}) se ubica por debajo de la meta institucional del ${Math.round(META_OPORTUNIDAD * 100)} %.` : ""}${dpSinAtender.length ? ` Se solicita la asignación formal de los ${dpSinAtender.length} derechos de petición relacionados en el anexo, a efectos de garantizar su atención dentro de los términos legales.` : ""} [Escriba aquí las causas recurrentes y las recomendaciones del periodo.]</div>

<div class="firma">
  <div class="linea"></div>
  <div>${esc(revisor)}</div>
  <div class="editable" contenteditable="true">Coordinador de Digitalización — [matrícula profesional]</div>
</div>

<p class="anexo-nota">
  Anexo: registro detallado de ${total} solicitud${total === 1 ? "" : "es"} del periodo, disponible en el módulo de verificación.
</p>

${anexoDP}

</body>
</html>`;
}
