import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { isActive } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: { isActive },
      select: { id: true, name: true, email: true, isActive: true }
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (session.user.id === resolvedParams.id) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
    }

    // Verificar si el usuario tiene firmas asociadas o historial
    const relatedRequests = await prisma.request.count({ where: { userId: resolvedParams.id } });
    const relatedHistory = await prisma.history.count({ where: { userId: resolvedParams.id } });

    if (relatedRequests > 0 || relatedHistory > 0) {
      return NextResponse.json({ error: "El usuario tiene registros históricos y firmas. Es mejor bloquear la cuenta en lugar de eliminarla para preservar la integridad de los datos." }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ message: "Usuario eliminado" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error interno. Asegúrate de que el usuario no tenga datos dependientes." }, { status: 500 });
  }
}
