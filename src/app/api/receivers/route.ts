import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const receivers = await prisma.receiver.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(receivers);
  } catch (error) {
    console.error("Error consultando receptores:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nombre de receptor requerido" }, { status: 400 });
    }

    const existing = await prisma.receiver.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "El receptor ya existe" }, { status: 400 });
    }

    const receiver = await prisma.receiver.create({ data: { name } });
    return NextResponse.json(receiver, { status: 201 });
  } catch (error) {
    console.error("Error creando receptor:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
