import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const data = await req.json();
    const { accion, firma } = data; // accion: 'MARCAR_LISTO', 'FIRMAR', 'SOLICITAR_DEVOLUCION', 'ACEPTAR_DEVOLUCION'

    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMINISTRADOR" || session.user.role === "ENCARGADO";

    let result;

    if (accion === 'MARCAR_LISTO' && isAdmin) {
      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
          where: { id },
          data: { 
            estado: "LISTO_PARA_ENTREGA",
            adminEntregaId: session.user.id
          }
        });
        await tx.history.create({
          data: {
            planId: request.planId,
            userId: session.user.id,
            accion: "ENTREGA_AUTORIZADA",
            detalles: "El administrador autorizó la entrega. Pendiente de firma."
          }
        });
        return reqUpdated;
      });
    } 
    else if (accion === 'FIRMAR' && request.userId === session.user.id) {
      if (!firma) return NextResponse.json({ error: "Firma requerida" }, { status: 400 });
      
      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
          where: { id },
          data: { 
            estado: "ENTREGADO",
            firma: firma,
            fechaEntrega: new Date()
          }
        });
        await tx.plan.update({
          where: { id: request.planId },
          data: { estado: "PRESTADO" }
        });
        await tx.history.create({
          data: {
            planId: request.planId,
            userId: session.user.id,
            accion: "FIRMA_ENTREGA",
            detalles: "El ejecutor firmó y recibió el plano físicamente."
          }
        });
        return reqUpdated;
      });
    }
    else if (accion === 'SOLICITAR_DEVOLUCION' && request.userId === session.user.id) {
      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
          where: { id },
          data: { estado: "DEVOLUCION_SOLICITADA" }
        });
        await tx.history.create({
          data: {
            planId: request.planId,
            userId: session.user.id,
            accion: "DEVOLUCION_SOLICITADA",
            detalles: "El ejecutor solicitó la devolución del plano."
          }
        });
        return reqUpdated;
      });
    }
    else if (accion === 'ACEPTAR_DEVOLUCION' && isAdmin) {
      result = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.request.update({
          where: { id },
          data: { 
            estado: "DEVUELTO",
            fechaDevolucion: new Date()
          }
        });
        await tx.plan.update({
          where: { id: request.planId },
          data: { estado: "DISPONIBLE" }
        });
        await tx.history.create({
          data: {
            planId: request.planId,
            userId: session.user.id,
            accion: "PLANO_ARCHIVADO",
            detalles: "El administrador recibió y archivó el plano devuelto."
          }
        });
        return reqUpdated;
      });
    }
    else {
      return NextResponse.json({ error: "Acción no válida o sin permisos" }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error actualizando solicitud:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
