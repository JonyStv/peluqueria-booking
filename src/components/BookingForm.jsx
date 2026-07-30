"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ChevronRight, X } from "lucide-react";

// Componentes shadcn
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogDescription, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";

// Acciones del servidor
import { createBooking } from "@/actions/booking";
import { createPaymentIntent } from "@/actions/payment";
import { getOccupiedIntervals, checkAvailability } from "@/actions/availability";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Componente de pago (definido fuera para claridad)
function CheckoutForm({ bookingId, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/gracias?booking=${bookingId}`,
      },
    });

    if (error) {
      onError(error.message);
    } else {
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || isProcessing}>
        {isProcessing ? "Procesando..." : "Confirmar pago del depósito"}
      </Button>
    </form>
  );
}

export default function BookingForm({ services }) {
  const { data: session } = useSession();

  // Estados del formulario
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [guestName, setGuestName] = useState(session?.user?.name || "");
  const [guestEmail, setGuestEmail] = useState(session?.user?.email || "");
  const [occupiedIntervals, setOccupiedIntervals] = useState([]);

  // Estados de UI
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState(null);
  const [alertOpen, setAlertOpen] = useState(false);

  // Función que devuelve los slots horarios según el día de la semana
  const getTimeSlotsForDate = (date) => {
    if (!date) return [];

    const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado, 5 = viernes
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5;
    const closeHour = isWeekend ? 19 : 21; // 19:00 fines de semana, 21:00 entre semana
    const openHour = isWeekend ? 9 : 10; // 10:00 entre semana, 9:00 fines de semana

    const slots = [];
    for (let h = openHour; h < closeHour; h++) {
      // Añadir la hora en punto
      slots.push(`${h.toString().padStart(2, "0")}:00`);
      slots.push(`${h.toString().padStart(2, "0")}:30`);
    }
    return slots;
  };


  // Cálculos
  const selectedServicesData = services.filter((s) => selectedServices.includes(s.id));
  const totalPrice = selectedServicesData.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServicesData.reduce((sum, s) => sum + s.duration, 0);
  const depositPercentage = parseInt(process.env.NEXT_PUBLIC_DEPOSIT_PERCENTAGE || "30", 10);
  const depositAmount = parseFloat((totalPrice * (depositPercentage / 100)).toFixed(2));
  const remainingAmount = parseFloat((totalPrice - depositAmount).toFixed(2));

  // Cargar intervalos ocupados al cambiar fecha
  useEffect(() => {
    if (!selectedDate) {
      setOccupiedIntervals([]);
      return;
    }

    const fetchIntervals = async () => {
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const intervals = await getOccupiedIntervals(dateStr);
        setOccupiedIntervals(intervals);
      } catch (err) {
        console.error("Error al obtener intervalos ocupados:", err);
      }
    };

    fetchIntervals();
  }, [selectedDate]);

  // Limpiar hora seleccionada si cambia fecha o servicios (por duración)
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate, selectedServices]);

  // Verificar disponibilidad de un slot horario (para deshabilitar botones)
  const isTimeSlotAvailable = (timeStr) => {
    if (!selectedDate || totalDuration === 0) return false;

    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5;
    const closeHour = isWeekend ? 19 : 21;
    const openHour = isWeekend ? 9 : 10; // 10:00 entre semana, 9:00 fines de semana
    const maxMinutes = closeHour * 60;

    const [hours, minutes] = timeStr.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + totalDuration;

    if (startMinutes < openHour * 60 || endMinutes > maxMinutes) return false;

    for (const interval of occupiedIntervals) {
      if (startMinutes < interval.end && endMinutes > interval.start) {
        return false;
      }
    }
    return true;
  };
  // Navegación entre pasos
  const goToNextStep = async () => {
    if (step === 1 && selectedServices.length === 0) {
      setError("Elige al menos un servicio.");
      setAlertOpen(true);
      return;
    }

    if (step === 2) {
      if (!selectedDate || !selectedTime) {
        setError("Elige una fecha y una hora.");
        setAlertOpen(true);
        return;
      }

      // Verificar disponibilidad final (por si cambió la duración o se solapa)
      setIsLoading(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const result = await checkAvailability(dateStr, selectedTime, totalDuration);
        if (!result.available) {
          setError("La franja horaria no está disponible. Por favor, elige otra hora.");
          setAlertOpen(true);
          setIsLoading(false);
          return;
        }
        setError(null);
        setAlertOpen(false);
        setStep(3);
      } catch (err) {
        setError("Error al verificar disponibilidad. Intenta de nuevo.");
        setAlertOpen(true);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 3 && (!guestName || !guestEmail)) {
      setError("Completa tu nombre y email.");
      setAlertOpen(true);
      return;
    }

    setError(null);
    setAlertOpen(false);
    setStep(step + 1);
  };

  const goToPreviousStep = () => {
    setStep(step - 1);
    setError(null);
    setAlertOpen(false);
  };

  // Finalizar reserva
  const handleFinalizeBooking = async () => {
    setIsLoading(true);
    setError(null);
    setAlertOpen(false);

    try {
      const localDateTime = new Date(`${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`);
      const timestamp = localDateTime.getTime(); // milisegundos desde epoch (incluye offset local)
      const bookingResult = await createBooking({
        guestName,
        guestEmail,
        date: timestamp,
        serviceIds: selectedServices,
      });

      if (!bookingResult.success) {
        throw new Error("No se pudo crear la reserva");
      }

      setBookingId(bookingResult.bookingId);
      const paymentResult = await createPaymentIntent(bookingResult.bookingId);
      setClientSecret(paymentResult.clientSecret);
      setStep(4);
    } catch (err) {
      setError(err.message || "Error al procesar la reserva");
      setAlertOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
              {step}
            </span>
            {step === 1 && "Elige tus servicios"}
            {step === 2 && "Elige fecha y hora"}
            {step === 3 && "Tus datos"}
            {step === 4 && "Pago del depósito"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedServices.includes(service.id)
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                      }`}
                    onClick={() => {
                      setSelectedServices((prev) =>
                        prev.includes(service.id)
                          ? prev.filter((id) => id !== service.id)
                          : [...prev, service.id]
                      );
                    }}
                  >
                    <Checkbox checked={selectedServices.includes(service.id)} onCheckedChange={() => { }} />
                    <div className="flex-1">
                      <Label className="cursor-pointer text-base font-medium">{service.name}</Label>
                      <p className="text-sm text-gray-500">{service.duration} min</p>
                    </div>
                    <span className="font-bold text-primary">{service.price}€</span>
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Total servicios: <span className="font-semibold">{totalPrice}€</span>
              </div>
              <div className="text-sm text-gray-500">
                Tiempo total estimado: <span className="font-semibold">{totalDuration} min</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div>
                  <Label className="mb-2 block">Fecha</Label>
                  <Popover>
                    <PopoverTrigger
                      className="w-full justify-start text-left font-normal inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        locale={es}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1">
                  <Label className="mb-2 block">Hora</Label>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {getTimeSlotsForDate(selectedDate).map((time) => {
                      const available = isTimeSlotAvailable(time);
                      return (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          className={`text-sm ${!available ? "opacity-50 cursor-not-allowed" : ""}`}
                          disabled={!available}
                          onClick={() => {
                            if (available) setSelectedTime(time);
                          }}
                        >
                          {time}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-1 text-sm">
                <p>
                  <span className="font-medium">Servicios:</span> {selectedServicesData.map((s) => s.name).join(", ")}
                </p>
                <p>
                  <span className="font-medium">Cita:</span> {selectedDate && format(selectedDate, "PPP", { locale: es })} {selectedTime && `a las ${selectedTime}`}
                </p>
                <p>
                  <span className="font-medium">Total:</span> {totalPrice}€
                </p>
                <p>
                  <span className="font-medium">Duración:</span> {totalDuration} minutos
                </p>
                <p className="text-xs text-gray-400">
                  Se cobrará un depósito del {depositPercentage}% ({depositAmount}€) para confirmar la reserva. El resto ({remainingAmount}€) se paga en el local.
                </p>
                <p className="text-xs text-gray-400">
                  Se permite un margen de 15 minutos de retraso. Si no se presenta, la reserva se cancelará y el depósito no será reembolsado.
                </p>
              </div>
            </div>
          )}

          {step === 4 && clientSecret && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-green-700 text-sm">
                ✅ Reserva creada correctamente. Procede al pago del depósito.
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  bookingId={bookingId}
                  onSuccess={() => (window.location.href = "/gracias")}
                  onError={(msg) => {
                    setError(msg);
                    setAlertOpen(true);
                  }}
                />
              </Elements>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-6">
          {step > 1 && (
            <Button variant="outline" onClick={goToPreviousStep} disabled={isLoading}>
              Atrás
            </Button>
          )}
          {step < 3 && (
            <Button onClick={goToNextStep} className="ml-auto" disabled={isLoading}>
              {isLoading ? "Verificando..." : "Siguiente"} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleFinalizeBooking} className="ml-auto" disabled={isLoading}>
              {isLoading ? "Procesando..." : `Pagar depósito (${depositAmount}€)`}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* AlertDialog fuera del Card para que se centre correctamente */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent className="relative fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
          {/* Botón de cierre en la esquina superior derecha */}
          <button
            onClick={() => setAlertOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </button>

          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Error</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-sm text-gray-500">
            {error}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertOpen(false)}>
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}