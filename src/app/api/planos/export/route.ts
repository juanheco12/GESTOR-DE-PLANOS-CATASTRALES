import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  PRESTADO: "Prestado",
  ARCHIVADO: "Archivado",
  PENDIENTE_REVISION: "Pendiente revisión",
};

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const query      = searchParams.get("query")      ?? "";
    const radicado   = searchParams.get("radicado")   ?? "";
    const predial    = searchParams.get("predial")    ?? "";
    const estado     = searchParams.get("estado")     ?? "";
    const profesional = searchParams.get("profesional") ?? "";
    const mutacion   = searchParams.get("mutacion")   ?? "";
    const formato    = searchParams.get("formato")    ?? "";
    const fechaDesde = searchParams.get("fechaDesde") ?? "";
    const fechaHasta = searchParams.get("fechaHasta") ?? "";

    const where: any = {};

    if (query) {
      where.OR = [
        { radicado:    { contains: query, mode: "insensitive" } },
        { propietario: { contains: query, mode: "insensitive" } },
        { predial:     { contains: query, mode: "insensitive" } },
      ];
    }
    if (radicado)    where.radicado = { contains: radicado, mode: "insensitive" };
    if (predial)     where.predial  = { contains: predial,  mode: "insensitive" };
    if (estado)      where.estado   = estado;
    if (profesional) where.profesionalResponsable = { contains: profesional, mode: "insensitive" };
    if (mutacion)    where.mutacion = { contains: mutacion, mode: "insensitive" };
    if (formato)     where.formato  = formato;

    if (fechaDesde || fechaHasta) {
      where.fechaIngreso = {};
      if (fechaDesde) where.fechaIngreso.gte = new Date(fechaDesde);
      if (fechaHasta) {
        const end = new Date(fechaHasta);
        end.setHours(23, 59, 59, 999);
        where.fechaIngreso.lte = end;
      }
    }

    const planos = await prisma.plan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { receivedBy: { select: { name: true } } },
    });

    const headers = [
      "Radicado",
      "Mutación / Trámite",
      "Formato",
      "Propietario",
      "Número Predial",
      "Vereda / Barrio",
      "Profesional Responsable",
      "Estado",
      "Recibido por",
      "Observaciones",
      "Inconsistencias",
      "Fecha Ingreso",
      "Última actualización",
    ];

    const rows = planos.map((p) => [
      p.radicado,
      p.mutacion,
      p.formato,
      p.propietario,
      p.predial,
      p.veredaBarrio ?? "",
      p.profesionalResponsable ?? "",
      ESTADO_LABELS[p.estado] ?? p.estado,
      p.receivedBy?.name ?? "",
      p.observaciones ?? "",
      p.inconsistencias ?? "",
      new Date(p.fechaIngreso).toLocaleDateString("es-CO"),
      new Date(p.updatedAt).toLocaleDateString("es-CO"),
    ]);

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((r) => r.map(escapeCSV).join(",")),
    ].join("\r\n");

    const fecha = new Date().toISOString().slice(0, 10);
    const filename = `planos-catastrales-${fecha}.csv`;

    return new NextResponse("﻿" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exportando planos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
