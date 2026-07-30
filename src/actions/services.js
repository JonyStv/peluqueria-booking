"use server";

import prisma from "@/lib/prisma";

export async function getServices() {
  const services = await prisma.service.findMany({
    orderBy: { id: "asc" }, // Orden ascendente por ID
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