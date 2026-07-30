import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic"; // Forzar renderizado dinámico para obtener datos actualizados
export default async function AdminPage() {
  //console.log(auth());
  //const session = await auth();
  const session = await getServerSession(authOptions);
  if (!session || session.user.email !== process.env.ADMIN_EMAIL) {
    redirect("/login");
  }

  // Obtener todas las reservas con sus servicios y usuarios
  const bookings = await prisma.booking.findMany({
    include: {
      services: true,
      user: true,
    },
    orderBy: { date: "asc" },
  });

  // Obtener servicios para el CRUD
  const services = await prisma.service.findMany({
    orderBy: { order: "asc" },
  });

  // Serializar fechas
  const serializedBookings = bookings.map((b) => ({
    ...b,
    date: b.date.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return <AdminDashboard bookings={serializedBookings} services={services} />;
}