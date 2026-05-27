import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COL = "America/Bogota";
const fmt = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("es-CO", { timeZone: COL, dateStyle: "short", timeStyle: "short" }) : "";

function esc(v: string | null | undefined) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const month = parseInt(searchParams.get("month") ?? "0", 10);
  const year  = parseInt(searchParams.get("year")  ?? "0", 10);

  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json({ error: "Mes y año requeridos" }, { status: 400 });
  }

  const desde = new Date(year, month - 1, 1, 0, 0, 0);
  const hasta = new Date(year, month,     1, 0, 0, 0); // primer día del mes siguiente

  const [planos, historial, solicitudes] = await Promise.all([
    prisma.plan.findMany({
      where:   { createdAt: { gte: desde, lt: hasta } },
      orderBy: { radicado: "asc" },
      include: {
        receivedBy:    { select: { name: true } },
        registradoPor: { select: { name: true } },
      },
    }),
    prisma.history.findMany({
      where:   { createdAt: { gte: desde, lt: hasta } },
      orderBy: { createdAt: "asc" },
      include: {
        plan: { select: { radicado: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.request.findMany({
      where:   { fechaSolicitud: { gte: desde, lt: hasta } },
      orderBy: { fechaSolicitud: "asc" },
      include: {
        plan: { select: { radicado: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  // ── Resumen por usuario ──────────────────────────────────
  const resumenUsuario: Record<string, { registros: number; solicitudes: number; entregas: number; devoluciones: number }> = {};
  for (const h of historial) {
    const u = h.user.name ?? "Desconocido";
    if (!resumenUsuario[u]) resumenUsuario[u] = { registros: 0, solicitudes: 0, entregas: 0, devoluciones: 0 };
    if (h.accion === "REGISTRO")          resumenUsuario[u].registros++;
    if (h.accion === "SOLICITUD")         resumenUsuario[u].solicitudes++;
    if (h.accion === "FIRMA_ENTREGA")     resumenUsuario[u].entregas++;
    if (h.accion === "PLANO_ARCHIVADO")   resumenUsuario[u].devoluciones++;
  }

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const nombreMes = MESES[month - 1];

  const rows: string[] = [
    "sep=,",
    `"REPORTE MENSUAL DE ACTIVIDAD — ${nombreMes.toUpperCase()} ${year}"`,
    `"Generado el: ${fmt(new Date())}"`,
    "",

    // ── Resumen general ──
    '"RESUMEN GENERAL"',
    `"Planos registrados en el mes",${planos.length}`,
    `"Movimientos totales en historial",${historial.length}`,
    `"Solicitudes de planos",${solicitudes.length}`,
    `"Planos entregados",${historial.filter(h => h.accion === "FIRMA_ENTREGA").length}`,
    `"Planos devueltos",${historial.filter(h => h.accion === "PLANO_ARCHIVADO").length}`,
    "",

    // ── Resumen por usuario ──
    '"ACTIVIDAD POR USUARIO"',
    ['"Usuario"','"Registros"','"Solicitudes"','"Entregas"','"Devoluciones"'].join(","),
    ...Object.entries(resumenUsuario).map(([u, v]) =>
      [esc(u), v.registros, v.solicitudes, v.entregas, v.devoluciones].join(",")
    ),
    "",

    // ── Planos registrados ese mes ──
    '"PLANOS REGISTRADOS EN EL MES"',
    ['"Radicado"','"Trámite"','"Soporte"','"Propietario"','"Predial"','"Recibido por"','"Registrado por"','"Fecha"','"Estado"'].join(","),
    ...planos.map(p => [
      esc(p.radicado),
      esc(p.mutacion),
      esc(p.formato),
      esc(p.propietario),
      esc(p.predial),
      esc(p.receivedBy?.name),
      esc(p.registradoPor?.name),
      fmt(p.createdAt),
      esc(p.estado),
    ].join(",")),
    "",

    // ── Historial completo ──
    '"HISTORIAL DE MOVIMIENTOS DEL MES"',
    ['"Fecha"','"Usuario"','"Acción"','"Plano (Radicado)"','"Detalle"'].join(","),
    ...historial.map(h => [
      fmt(h.createdAt),
      esc(h.user.name),
      esc(h.accion),
      esc(h.plan.radicado),
      esc(h.detalles),
    ].join(",")),
  ];

  const csv = rows.join("\r\n");
  const filename = `reporte-${nombreMes.toLowerCase()}-${year}.csv`;

  return new NextResponse("﻿" + csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
