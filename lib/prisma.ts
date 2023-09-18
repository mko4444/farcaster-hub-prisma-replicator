import { Prisma, PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  let globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    if (process.env.DEBUG_MODE === "enabled") {
      globalWithPrisma.prisma = new PrismaClient();
    } else {
      globalWithPrisma.prisma = new PrismaClient();
    }
  }

  prisma = globalWithPrisma.prisma;
}

export default prisma;
export { Prisma };
