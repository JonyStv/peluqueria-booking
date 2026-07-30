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
export async function checkAvailability(dateString, time, duration) {
  const [hours, minutes] = time.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;

  // Horario de apertura: 9:00 (540 min), cierre: 20:30 (1230 min)
  if (startMinutes < 540 || endMinutes > 1230) { //Posibilidad de limitar el horario de la ultima reserva
    return { available: false, reason: "Fuera del horario de atención (9:00 - 20:30)" };
  }

  const intervals = await getOccupiedIntervals(dateString);
  const conflicts = intervals.filter(
    (interval) => startMinutes < interval.end && endMinutes > interval.start
  );

  if (conflicts.length > 0) {
    return { available: false, conflicts };
  }

  return { available: true };
}