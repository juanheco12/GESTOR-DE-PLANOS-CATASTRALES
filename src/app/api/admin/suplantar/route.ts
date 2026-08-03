import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { encode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.NEXTAUTH_SECRET || "supersecretkey-change-me-in-production";

// Vale de un minuto: suficiente para el salto, inservible si se filtra
const VIGENCIA_S = 60;

/**
 * Emite un vale firmado que permite al administrador entrar a la cuenta de
 * otro usuario sin conocer su contraseña, en vez de tener que reemplazarla
 * y dejar a esa persona sin acceso.
 *
 * Aquí se comprueba el rol; el proveedor "suplantar" solo valida la firma.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  // Una sesión ya suplantada no puede encadenar otra
  if (session.user.suplantadoPor) {
    return NextResponse.json(
      { error: "Ya estás viendo el sistema como otro usuario." },
      { status: 409 }
    );
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });
    }
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Ya estás en tu propia cuenta." }, { status: 400 });
    }

    const objetivo = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, name: true, email: true, isActive: true },
    });
    if (!objetivo) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    if (!objetivo.isActive) {
      return NextResponse.json(
        { error: "La cuenta está bloqueada. Desbloquéala antes de entrar." },
        { status: 409 }
      );
    }

    const adminNombre = session.user.name ?? session.user.email ?? "El administrador";

    // Queda constancia antes de emitir el vale
    await prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "SUPLANTACION",
        entityType: "User",
        entityId:   objetivo.id,
        newData:    JSON.stringify({
          usuario: objetivo.name ?? objetivo.email,
          correo:  objetivo.email,
          origen:  `${adminNombre} entró a esta cuenta sin usar su contraseña`,
        }),
      },
    });

    const vale = await encode({
      token:  { sub: objetivo.id, tipo: "suplantar", adminNombre },
      secret: SECRET,
      maxAge: VIGENCIA_S,
    });

    return NextResponse.json({ vale, nombre: objetivo.name ?? objetivo.email });
  } catch (error) {
    console.error("Error emitiendo vale de suplantación:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
