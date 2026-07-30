"use server";

import prisma from "@/lib/prisma";

export async function cleanupPendingBookings() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const deleted = await prisma.booking.deleteMany({
    where: {
      status: "pending",
      createdAt: {
        lt: thirtyMinutesAgo,
      },
    },
  });

  console.log(`🗑️ Eliminadas ${deleted.count} reservas pendientes antiguas.`);
  return deleted;
}