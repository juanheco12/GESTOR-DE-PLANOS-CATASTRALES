-- CreateTable
CREATE TABLE "Prestamo" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "entregadoPorId" TEXT NOT NULL,
    "nombreReceptor" TEXT NOT NULL,
    "entidad" TEXT NOT NULL DEFAULT 'Secretaría de Planeación',
    "cargo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "telefono" TEXT,
    "observaciones" TEXT,
    "fechaEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDevolucion" TIMESTAMP(3),
    "devueltoPorId" TEXT,

    CONSTRAINT "Prestamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prestamo_planId_idx" ON "Prestamo"("planId");

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_entregadoPorId_fkey"
    FOREIGN KEY ("entregadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_devueltoPorId_fkey"
    FOREIGN KEY ("devueltoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
