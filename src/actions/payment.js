"use server";

import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";

export async function createPaymentIntent(bookingId) {
  // 1. Buscar la reserva para obtener el importe del depósito
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Reserva no encontrada");
  }

  if (booking.depositPaid) {
    throw new Error("El depósito ya ha sido pagado");
  }

  // 2. Stripe trabaja en céntimos (o la unidad más pequeña de la moneda)
  const amountInCents = Math.round(booking.depositAmount * 100);

  // 3. Crear el PaymentIntent en Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "eur",
    metadata: {
      bookingId: booking.id, // Metadato CLAVE para el webhook
    },
    // Opcional: si quieres que el cliente pueda pagar con métodos alternativos
    payment_method_types: ["card"],
  });

  // 4. Guardar el ID del PaymentIntent en nuestra BD para hacer tracking
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  // Devolvemos solo lo necesario para que el frontend complete el pago
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}