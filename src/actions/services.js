"use server";

import prisma from "@/lib/prisma";

export async function getServices() {
  const services = await prisma.service.findMany({
    orderBy: { id: "asc" }, // Orden ascendente por ID
  });
  return services;
}