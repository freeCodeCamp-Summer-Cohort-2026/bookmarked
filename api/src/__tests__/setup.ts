import { prisma } from "../db";

export async function clearTestDB(): Promise<void> {
  // Delete in FK-safe order: reactions depend on resources and users,
  // while collections are associated via a many-to-many relation.
  await prisma.reaction.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.user.deleteMany({});
}

export async function disconnectTestDB(): Promise<void> {
  await prisma.$disconnect();
}
