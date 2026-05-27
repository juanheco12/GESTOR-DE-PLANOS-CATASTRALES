import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";

const isProd = process.env.NODE_ENV === "production";
const COOKIE = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";
const MAX_AGE = 8 * 60 * 60; // 8 hours

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Credenciales incompletas" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, password: true, role: true, isActive: true },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Cuenta bloqueada por el administrador" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    const token = await encode({
      token: {
        sub: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: MAX_AGE,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
