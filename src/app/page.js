import { getServices } from "@/actions/services";
import BookingForm from "@/components/BookingForm";

export default async function Home() {
  // Obtenemos los servicios desde la BD
  const services = await getServices();

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-2">
          Peluqueria y Barberia Axel
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Elige tus servicios, fecha y confirma tu cita con un depósito del {process.env.DEPOSIT_PERCENTAGE || 30}%.
        </p>

        {/* El formulario se ejecuta en el cliente */}
        <BookingForm services={services} />
      </div>
    </main>
  );
}