import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import * as XLSX from "xlsx";

// One-time migration endpoint — only ADMINISTRADOR can call it
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const filePath = path.join(process.cwd(), "scripts", "planos-historico.xlsx");
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
    const data = rows.slice(1).filter((r: any[]) => String(r[0]).trim() !== "");

    function excelDateToJS(serial: number): Date {
      return new Date(Math.round((serial - 25569) * 86400 * 1000));
    }

    // Cache receivers to avoid repeated DB lookups
    const receiverCache: Record<string, string> = {};

    async function getOrCreateReceiver(name: string): Promise<string> {
      const key = name.trim();
      if (receiverCache[key]) return receiverCache[key];
      const rec = await prisma.receiver.upsert({
        where: { name: key },
        update: {},
        create: { name: key },
      });
      receiverCache[key] = rec.id;
      return rec.id;
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of data) {
      const radicado      = String(row[0]).trim();
      const receiverName  = String(row[1]).trim();
      const formato       = String(row[2]).trim();
      const obsRaw        = row[3];
      const observaciones = obsRaw !== "" ? String(obsRaw).trim() : null;
      const fechaSerial   = row[4];
      const fechaIngreso  = typeof fechaSerial === "number"
        ? excelDateToJS(fechaSerial)
        : new Date();

      try {
        const receivedById = await getOrCreateReceiver(receiverName);

        await prisma.plan.create({
          data: {
            radicado,
            mutacion:    "NO ESPECIFICADO",
            formato,
            observaciones,
            fechaIngreso,
            estado:      "DISPONIBLE",
            receivedById,
            createdAt:   fechaIngreso,
          },
        });
        inserted++;
      } catch (err: any) {
        if (err?.code === "P2002") {
          skipped++;
        } else {
          errors.push(`${radicado}: ${err?.message ?? "error desconocido"}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      total:    data.length,
      inserted,
      skipped,
      errors,
    });
  } catch (err: any) {
    console.error("Migration error:", err);
    return NextResponse.json({ error: err?.message ?? "Error interno" }, { status: 500 });
  }
}
