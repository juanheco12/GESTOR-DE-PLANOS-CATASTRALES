import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "correo@ejemplo.com" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales incompletas");
        }

        const sql = neon(process.env.DATABASE_URL!);
        const rows = await sql`
          SELECT id, name, email, password, role, "isActive"
          FROM "User"
          WHERE email = ${credentials.email}
          LIMIT 1
        `;
        const user = rows[0];

        if (!user || !user.password) {
          throw new Error("Usuario no encontrado");
        }

        if (!user.isActive) {
          throw new Error("Cuenta bloqueada por el administrador");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password as string);

        if (!isPasswordValid) {
          throw new Error("Contraseña incorrecta");
        }

        return {
          id: user.id as string,
          name: user.name as string,
          email: user.email as string,
          role: user.role as string,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "supersecretkey-change-me-in-production",
};
