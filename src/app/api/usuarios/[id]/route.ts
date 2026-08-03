import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ALLOWED_ROLES = ["ADMINISTRADOR", "ENCARGADO", "EJECUTOR", "RADICADORA", "DIGITALIZADOR"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();

    // Cambio de rol
    if (body.newRole !== undefined) {
      const role = body.newRole;
      if (!ALLOWED_ROLES.includes(role)) {
        return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
      }
      if (session.user.id === resolvedParams.id && role !== "ADMINISTRADOR") {
        return NextResponse.json(
          { error: "No puedes quitarte a ti mismo el rol de administrador" },
          { status: 400 }
        );
      }

      const target = await prisma.user.findUnique({
        where:  { id: resolvedParams.id },
        select: { role: true },
      });
      if (!target) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      // Evita dejar el sistema sin ningún administrador
      if (target.role === "ADMINISTRADOR" && role !== "ADMINISTRADOR") {
        const admins = await prisma.user.count({ where: { role: "ADMINISTRADOR" } });
        if (admins <= 1) {
          return NextResponse.json(
            { error: "Debe existir al menos un administrador en el sistema" },
            { status: 400 }
          );
        }
      }

      const updated = await prisma.user.update({
        where:  { id: resolvedParams.id },
        data:   { role },
        select: { id: true, name: true, email: true, role: true },
      });

      // Notificar a los administradores del cambio de rol
      const admins = await prisma.user.findMany({
        where:  { role: "ADMINISTRADOR", isActive: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((u) => ({
            message: `El rol de ${updated.name ?? updated.email} cambió a ${role}.`,
            userId:  u.id,
          })),
        });
      }

      return NextResponse.json(updated, { status: 200 });
    }

    // Cambio de nombre
    if (body.newName !== undefined) {
      const name = body.newName?.trim();
      if (!name) {
        return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
      }
      const updated = await prisma.user.update({
        where: { id: resolvedParams.id },
        data:  { name },
        select: { id: true, name: true, email: true },
      });
      return NextResponse.json(updated, { status: 200 });
    }

    // Cambio de correo
    if (body.newEmail !== undefined) {
      const email = body.newEmail?.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Correo electrónico no válido" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== resolvedParams.id) {
        return NextResponse.json({ error: "Este correo ya está en uso por otro usuario" }, { status: 400 });
      }
      const updated = await prisma.user.update({
        where: { id: resolvedParams.id },
        data:  { email },
        select: { id: true, name: true, email: true },
      });
      return NextResponse.json(updated, { status: 200 });
    }

    // Cambio de contraseña
    if (body.newPassword !== undefined) {
      if (!body.newPassword || body.newPassword.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(body.newPassword, 8);

      const updated = await prisma.$transaction(async (tx) => {
        const upd = await tx.user.update({
          where: { id: resolvedParams.id },
          data:  { password: hashed },
          select: { id: true, name: true, email: true },
        });

        const quien = session.user.name ?? session.user.email ?? "El administrador";

        // Queda constancia en auditoría: nunca la contraseña, solo el hecho
        await tx.auditLog.create({
          data: {
            userId:     session.user.id,
            action:     "CAMBIO_CLAVE_ADMIN",
            entityType: "User",
            entityId:   upd.id,
            newData:    JSON.stringify({
              usuario: upd.name ?? upd.email,
              correo:  upd.email,
              origen:  `Asignada por ${quien}`,
            }),
          },
        });

        const admins = await tx.user.findMany({
          where: { role: "ADMINISTRADOR", isActive: true },
          select: { id: true },
        });
        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((u) => ({
              message: `La contraseña de ${upd.name ?? upd.email} fue actualizada por ${quien}.`,
              userId:  u.id,
            })),
          });
        }

        return upd;
      });

      return NextResponse.json(updated, { status: 200 });
    }

    // Bloquear / desbloquear
    const updated = await prisma.user.update({
      where: { id: resolvedParams.id },
      data:  { isActive: body.isActive },
      select: { id: true, name: true, email: true, isActive: true },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (session.user.id === resolvedParams.id) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
    }

    const relatedRequests = await prisma.request.count({ where: { userId: resolvedParams.id } });
    const relatedHistory  = await prisma.history.count({  where: { userId: resolvedParams.id } });

    if (relatedRequests > 0 || relatedHistory > 0) {
      return NextResponse.json(
        { error: "El usuario tiene registros históricos y firmas. Es mejor bloquear la cuenta para preservar la integridad de los datos." },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id: resolvedParams.id } });
    return NextResponse.json({ message: "Usuario eliminado" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error interno. Asegúrate de que el usuario no tenga datos dependientes." }, { status: 500 });
  }
}
