import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nombre de receptor requerido" }, { status: 400 });
    }

    const receiver = await prisma.receiver.update({
      where: { id: resolvedParams.id },
      data: { name }
    });

    return NextResponse.json(receiver);
  } catch (error) {
    console.error("Error actualizando receptor:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.receiver.delete({ where: { id: resolvedParams.id } });
    return NextResponse.json({ message: "Receptor eliminado" });
  } catch (error: any) {
    console.error("Error eliminando receptor:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Receptor no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
