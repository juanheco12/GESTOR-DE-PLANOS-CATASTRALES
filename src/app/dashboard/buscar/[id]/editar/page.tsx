import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EditForm from "./EditForm";

export default async function EditarPlanoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== "ADMINISTRADOR") {
    redirect("/dashboard");
  }

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const plano = await prisma.plan.findUnique({
    where: { id }
  });

  if (!plano) {
    notFound();
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-8 flex items-center">
        <Link href={`/dashboard/buscar/${id}`} className="mr-4 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Editar Plano</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Modificando información del radicado: <span className="font-bold">{plano.radicado}</span>
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex-1">
        <EditForm plan={plano} />
      </div>
    </div>
  );
}
