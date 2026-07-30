"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getServices() {
  const services = await prisma.service.findMany({
    orderBy: { order: "asc" },
  });
  return services;
}
export async function createService(data) {
  return await prisma.service.create({ data });
}

export async function updateService(id, data) {
  return await prisma.service.update({ where: { id }, data });
}

export async function deleteService(id) {
  return await prisma.service.delete({ where: { id } });
}

export async function reorderServices(orderedIds) {
  // Recibe un array de IDs en el nuevo orden.
  // Asigna el campo 'order' según la posición en el array.
  const updates = orderedIds.map((id, index) => {
    return prisma.service.update({
      where: { id },
      data: { order: index },
    });
  });

  await prisma.$transaction(updates);
  revalidatePath("/admin");
  return { success: true };
}