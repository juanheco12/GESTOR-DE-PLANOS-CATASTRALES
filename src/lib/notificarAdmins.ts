import type { Prisma } from "@prisma/client";

/**
 * El administrador recibe constancia de todos los movimientos del sistema.
 *
 * Se llama dentro de la transacción que produce el movimiento, para que la
 * notificación no quede huérfana si la operación se revierte.
 *
 * @param excluirUserId  quien ejecuta la acción no se notifica a sí mismo
 */
export async function notificarAdmins(
  tx: Prisma.TransactionClient,
  mensaje: string,
  opts: { planoId?: string | null; excluirUserId?: string } = {}
) {
  const { planoId = null, excluirUserId } = opts;

  const admins = await tx.user.findMany({
    where: {
      role:     "ADMINISTRADOR",
      isActive: true,
      ...(excluirUserId ? { id: { not: excluirUserId } } : {}),
    },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await tx.notification.createMany({
    data: admins.map((a) => ({ message: mensaje, userId: a.id, planoId })),
  });
}
