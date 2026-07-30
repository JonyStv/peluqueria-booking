"use server";

import prisma from "@/lib/prisma";

export async function getServices() {
  const services = await prisma.service.findMany();
  return services;
}

// Opcional: acción para crear servicios de prueba (ejecuta una vez)
export async function seedServices() {
  const defaultServices = [
    { name: "Corte de pelo", price: 25, duration: 30 },
    { name: "Barba", price: 15, duration: 20 },
    { name: "Corte + Barba", price: 35, duration: 45 },
    { name: "Tinte", price: 45, duration: 60 },
  ];

  for (const service of defaultServices) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {},
      create: service,
    });
  }
  return { success: true };
}