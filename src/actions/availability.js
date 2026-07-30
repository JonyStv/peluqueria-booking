"use server";

import prisma from "@/lib/prisma";

/**
 * Obtiene todos los intervalos ocupados para una fecha determinada.
 * @param {string} dateString - Fecha en formato "YYYY-MM-DD"
 * @returns {Promise<Array<{start: number, end: number}>>} - Intervalos en minutos desde medianoche
 */
export async function getOccupiedIntervals(dateString) {
  const startOfDay = new Date(dateString + "T00:00:00");
  const endOfDay = new Date(dateString + "T23:59:59");

  const bookings = await prisma.booking.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ["confirmed", "deposit_paid"],
      },
    },
  });

  const intervals = bookings.map((booking) => {
    const bookingDate = new Date(booking.date);
    const startMinutes = bookingDate.getHours() * 60 + bookingDate.getMinutes();
    const endMinutes = startMinutes + booking.durationMinutes;
    return { start: startMinutes, end: endMinutes };
  });

  return intervals;
}

/**
 * Verifica si un slot horario está disponible para una fecha y duración dadas.
 * @param {string} dateString - Fecha en formato "YYYY-MM-DD"
 * @param {string} time - Hora en formato "HH:MM"
 * @param {number} duration - Duración en minutos
 * @returns {Promise<{available: boolean, conflicts?: Array}>}
 */
export async function checkAvailability(dateStr, timeStr, duration) {
  const date = new Date(dateStr + "T00:00:00");
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5; // 0=domingo, 6=sábado, 5=viernes
  const closeHour = isWeekend ? 19 : 21;
  const openHour = isWeekend ? 9 : 10; // 10:00 entre semana, 9:00 fines de semana
  const maxMinutes = closeHour * 60;

  const intervals = await getOccupiedIntervals(dateStr);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;

  if (startMinutes < openHour * 60 || endMinutes > maxMinutes) {
    return { available: false, message: "La franja horaria está fuera del horario de atención." };
  }

  for (const interval of intervals) {
    if (startMinutes < interval.end && endMinutes > interval.start) {
      return { available: false, message: "La franja horaria ya está ocupada." };
    }
  }
  return { available: true };
}