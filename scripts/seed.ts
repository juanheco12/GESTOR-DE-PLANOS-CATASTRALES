import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Crear Administrador / Encargado
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@catastro.com" }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.create({
      data: {
        name: "Administrador",
        email: "admin@catastro.com",
        password: hashedPassword,
        role: "ADMINISTRADOR",
      }
    });
    console.log("Usuario administrador creado:", admin.email);
  } else {
    console.log("El usuario administrador ya existe.");
  }

  // Crear Ejecutor
  const existingEjecutor = await prisma.user.findUnique({
    where: { email: "ejecutor@catastro.com" }
  });

  if (!existingEjecutor) {
    const hashedPassword = await bcrypt.hash("ejecutor123", 10);
    const ejecutor = await prisma.user.create({
      data: {
        name: "Juan Ejecutor",
        email: "ejecutor@catastro.com",
        password: hashedPassword,
        role: "EJECUTOR",
      }
    });
    console.log("Usuario ejecutor creado:", ejecutor.email);
  } else {
    console.log("El usuario ejecutor ya existe.");
  }

  // Crear receptores iniciales
  const receivers = ["William", "Karolinne"];
  for (const name of receivers) {
    const existing = await prisma.receiver.findUnique({ where: { name } });
    if (!existing) {
      await prisma.receiver.create({ data: { name } });
      console.log(`Receptor creado: ${name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
