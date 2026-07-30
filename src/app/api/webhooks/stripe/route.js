import Stripe from "stripe";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  // Leemos el body en texto plano (necesario para verificar la firma)
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;

  try {
    // Verificamos que el webhook viene realmente de Stripe
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET // ¡La clave que obtendremos en el siguiente paso!
    );
  } catch (error) {
    console.error(`Error de verificación del webhook: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Procesamos el evento
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const bookingId = paymentIntent.metadata.bookingId;

    if (!bookingId) {
      console.error("El metadata no contiene bookingId");
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    try {
      // Actualizamos la reserva en nuestra BD
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "confirmed", // Cambiamos a confirmada
          depositPaid: true,
          // El 'stripePaymentIntentId' ya lo guardamos al crear el intent, pero lo dejamos.
        },
      });

      console.log(`✅ Reserva ${bookingId} confirmada por pago de depósito.`);
    } catch (error) {
      console.error(`Error al actualizar la BD: ${error.message}`);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
  }

  // Stripe espera un 200 para saber que todo ha ido bien
  return NextResponse.json({ received: true });
}