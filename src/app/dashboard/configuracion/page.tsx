import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ConfigTabs from "./ConfigTabs";

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMINISTRADOR") {
    redirect("/dashboard");
  }

  // Fetch all users except the current admin
  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  const receivers = await prisma.receiver.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true
    }
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configuración del Sistema</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestiona las cuentas de ejecutores, los receptores de planos y la seguridad de tu perfil.
        </p>
      </div>

      <ConfigTabs initialUsers={users} initialReceivers={receivers} />
    </div>
  );
}
