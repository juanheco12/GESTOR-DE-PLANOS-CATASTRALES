import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { decode } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales incompletas");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: { id: true, name: true, email: true, password: true, role: true, isActive: true },
        });

        if (!user || !user.password) throw new Error("Usuario no encontrado");
        if (!user.isActive) throw new Error("Cuenta bloqueada por el administrador");

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) throw new Error("Contraseña incorrecta");

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),

    // Suplantación: el administrador entra a la cuenta de otro usuario sin
    // conocer su contraseña. El vale lo emite /api/admin/suplantar, que es
    // donde se comprueba el rol; aquí solo se valida la firma y la vigencia.
    CredentialsProvider({
      id:   "suplantar",
      name: "Suplantación",
      credentials: { vale: { label: "Vale", type: "text" } },
      async authorize(credentials) {
        if (!credentials?.vale) throw new Error("Falta el vale de acceso");

        const datos = await decode({
          token:  credentials.vale,
          secret: process.env.NEXTAUTH_SECRET || "supersecretkey-change-me-in-production",
        });

        if (!datos || datos.tipo !== "suplantar" || !datos.sub) {
          throw new Error("Vale de acceso no válido o vencido");
        }

        const user = await prisma.user.findUnique({
          where:  { id: datos.sub as string },
          select: { id: true, name: true, email: true, role: true, isActive: true },
        });

        if (!user) throw new Error("Usuario no encontrado");
        if (!user.isActive) throw new Error("Cuenta bloqueada por el administrador");

        return {
          id:    user.id,
          name:  user.name,
          email: user.email,
          role:  user.role,
          suplantadoPor: (datos.adminNombre as string) ?? "el administrador",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = user.role;
        token.suplantadoPor = user.suplantadoPor ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id   = token.id as string;
        session.user.role = token.role as string;
        session.user.suplantadoPor = (token.suplantadoPor as string | null) ?? null;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — expires mid-day at most
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET || "supersecretkey-change-me-in-production",
};
