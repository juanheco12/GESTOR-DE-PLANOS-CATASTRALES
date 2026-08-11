import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const esAdmin = session.user.role === "ADMINISTRADOR";
  try {
    const verif = await prisma.verificacion.findUnique({
      where:   { id },
      include: { adjuntos: { orderBy: { createdAt: "asc" } } },
    });
    if (!verif || (verif.userId !== session.user.id && !esAdmin)) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    // El archivo del esquema anterior se presenta como un adjunto más
    const adjuntos = [
      ...(verif.imagenData
        ? [{ id: `legacy-${verif.id}`, nombre: verif.imagenNombre ?? "adjunto", data: verif.imagenData }]
        : []),
      ...verif.adjuntos.map((a) => ({ id: a.id, nombre: a.nombre, data: a.data })),
    ];

    return NextResponse.json({ ...verif, adjuntos });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const esAdmin = session.user.role === "ADMINISTRADOR";
  try {
    const verif = await prisma.verificacion.findUnique({
      where:  { id },
      select: { id: true, userId: true },
    });
    // El administrador puede eliminar cualquier registro; el resto, solo el suyo
    if (!verif || (verif.userId !== session.user.id && !esAdmin)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    // El llamado enlazado queda sin verificación, no se borra con ella
    await prisma.llamadoVerificacion.updateMany({
      where: { verificacionId: id },
      data:  { verificacionId: null },
    });
    await prisma.verificacion.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error deleting verificacion:", error);
    return NextResponse.json(
      { error: `No se pudo eliminar: ${error?.message ?? "error desconocido"}` },
      { status: 500 }
    );
  }
}
