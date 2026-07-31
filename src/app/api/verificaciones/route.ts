import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const verifs = await prisma.verificacion.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id:            true,
        fmi:           true,
        radicado:      true,
        cumple:        true,
        observaciones: true,
        imagenNombre:  true,
        // imagenData excluded — potentially large; fetched only for the report
        createdAt:     true,
      },
    });
    return NextResponse.json(verifs);
  } catch (error) {
    console.error("Error fetching verificaciones:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { fmi, radicado, cumple, observaciones, imagenNombre, imagenData } = await req.json();

    if (!fmi?.trim() || !radicado?.trim() || cumple === undefined || cumple === null) {
      return NextResponse.json({ error: "FMI, radicado y resultado son requeridos" }, { status: 400 });
    }

    const verif = await prisma.verificacion.create({
      data: {
        fmi:           fmi.trim(),
        radicado:      radicado.trim(),
        cumple,
        observaciones: observaciones?.trim() || null,
        imagenNombre:  imagenNombre || null,
        imagenData:    imagenData   || null,
        userId:        session.user.id,
      },
    });
    return NextResponse.json(verif, { status: 201 });
  } catch (error) {
    console.error("Error creating verificacion:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
