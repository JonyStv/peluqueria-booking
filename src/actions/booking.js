"use server";

import prisma from "@/lib/prisma";
import {toZonedTime} from "date-fns-tz";

export async function createBooking(formData) {
  // Extraemos los datos del formulario (adaptado para JavaScript)
  const {
    guestName,
    guestEmail,
    date, // Espera un string ISO o DateTime
    serviceIds, // Array de IDs de servicios
  } = formData;

  // 1. Obtener los servicios de la BD para calcular precio y duración
  const services = await prisma.service.findMany({
    where: {
      id: { in: serviceIds },
    },
  });
  const localDate = toZonedTime(formData.date, 'Europe/Madrid'); // Convertimos a Date en la zona horaria local
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

  // 2. Calcular el depósito (usamos el porcentaje del .env)
  const depositPercentage = parseInt(process.env.DEPOSIT_PERCENTAGE || 30, 10);
  const depositAmount = parseFloat((totalPrice * (depositPercentage / 100)).toFixed(2));
  const remainingAmount = parseFloat((totalPrice - depositAmount).toFixed(2));

  // 3. Crear la reserva en la BD con estado 'pending'
  const newBooking = await prisma.booking.create({
    data: {
      guestName,
      guestEmail,
      date: localDate,
      totalPrice,
      durationMinutes: totalDuration,
      status: "pending",
      depositAmount,
      depositPaid: false,
      remainingAmount,
      services: {
        connect: serviceIds.map((id) => ({ id })),
      },
    },
  });

  // Devolvemos el objeto completo para que el frontend sepa el ID y el precio
  return {
    success: true,
    bookingId: newBooking.id,
    totalPrice,
    depositAmount,
    remainingAmount,
  };
}