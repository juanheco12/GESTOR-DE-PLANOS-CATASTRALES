import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ELIMINAR PLANO (Solo Admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado. Solo el Administrador puede eliminar registros." }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const oldPlan = await prisma.plan.findUnique({ where: { id } });
    if (!oldPlan) {
      return NextResponse.json({ error: "Plano no encontrado" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Guardar auditoría
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE",
          entityId: id,
          entityType: "Plan",
          oldData: JSON.stringify(oldPlan),
        }
      });

      // 2. Eliminar referencias en History y Requests
      await tx.history.deleteMany({ where: { planId: id } });
      await tx.request.deleteMany({ where: { planId: id } });

      // 3. Eliminar el plano
      await tx.plan.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Plano eliminado" }, { status: 200 });
  } catch (error) {
    console.error("Error al eliminar plano:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// SUBSANAR INCONSISTENCIA (Receptor: Encargado o Administrador)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMINISTRADOR" && session?.user?.role !== "ENCARGADO") {
      return NextResponse.json({ error: "No autorizado. Solo un receptor puede subsanar inconsistencias." }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { novedad } = await req.json();

    if (!novedad || !novedad.trim()) {
      return NextResponse.json({ error: "Describe la novedad antes de continuar." }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      return NextResponse.json({ error: "Plano no encontrado" }, { status: 404 });
    }

    const quien = session.user.name ?? session.user.email ?? "Receptor";
    const estabaPendienteRevision = plan.estado === "PENDIENTE_REVISION";

    const updatedPlan = await prisma.$transaction(async (tx) => {
      const updated = await tx.plan.update({
        where: { id },
        data: estabaPendienteRevision
          ? { estado: "DISPONIBLE", inconsistencias: null }
          : { inconsistencias: null },
      });

      await tx.history.create({
        data: {
          planId: id,
          userId: session.user.id,
          accion: "INCONSISTENCIA_SUBSANADA",
          detalles: `${quien} registró que se trajo un nuevo plano para subsanar la inconsistencia: ${novedad.trim()}`,
        },
      });

      const admins = await tx.user.findMany({
        where: { role: "ADMINISTRADOR", isActive: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((u) => ({
            message: `${quien} subsanó la inconsistencia del plano ${plan.radicado}.`,
            userId:  u.id,
            planoId: id,
          })),
        });
      }

      return updated;
    });

    return NextResponse.json(updatedPlan, { status: 200 });
  } catch (error) {
    console.error("Error al subsanar inconsistencia:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// EDITAR PLANO (Solo Admin)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado. Solo el Administrador puede editar registros." }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const newData = await req.json();

const oldPlan = await prisma.plan.findUnique({ where: { id } });
    if (!oldPlan) {
      return NextResponse.json({ error: "Plano no encontrado" }, { status: 404 });
    }

    const updatedPlan = await prisma.$transaction(async (tx) => {
      if (newData.receivedById) {
        const receiverExists = await tx.receiver.findUnique({ where: { id: newData.receivedById } });
        if (!receiverExists) {
          throw new Error("Receptor no válido");
        }
      }

      const plan = await tx.plan.update({
        where: { id },
        data: {
          radicado: newData.radicado,
          mutacion: newData.mutacion,
          formato: newData.formato,
          propietario: newData.propietario || null,
          predial: newData.predial || null,
          veredaBarrio: newData.veredaBarrio || null,
          profesionalResponsable: newData.profesionalResponsable || null,
          observaciones: newData.observaciones || null,
          ubicacionFisica: newData.ubicacionFisica || null,
          receivedById: newData.receivedById || null,
          estado: newData.estado,
        }
      });

      // Guardar auditoría
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "EDIT",
          entityId: id,
          entityType: "Plan",
          oldData: JSON.stringify(oldPlan),
          newData: JSON.stringify(plan),
        }
      });

      // Añadir al historial visible
      await tx.history.create({
        data: {
          planId: id,
          userId: session.user.id,
          accion: "EDICION",
          detalles: "El administrador editó la información catastral del plano."
        }
      });

      return plan;
    });

    return NextResponse.json(updatedPlan, { status: 200 });
  } catch (error) {
    console.error("Error al editar plano:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
