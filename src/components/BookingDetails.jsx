// src/components/BookingDetails.jsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateBookingStatus } from "@/actions/booking";

const statusMap = {
  pending: "Pendiente",
  deposit_paid: "Depósito pagado",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
};

const statusColors = {
  pending: "bg-yellow-500",
  deposit_paid: "bg-blue-500",
  confirmed: "bg-green-500",
  cancelled: "bg-red-500",
  completed: "bg-gray-500",
};

export function BookingDetails({ booking, onClose, onUpdate }) {
  const [status, setStatus] = useState(booking.status);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      await updateBookingStatus(booking.id, newStatus);
      setStatus(newStatus);
      onUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="font-semibold">Cliente:</span>
          <p>{booking.guestName || booking.user?.name || "N/A"}</p>
        </div>
        <div>
          <span className="font-semibold">Email:</span>
          <p>{booking.guestEmail || booking.user?.email || "N/A"}</p>
        </div>
        <div>
          <span className="font-semibold">Fecha:</span>
          <p>{format(new Date(booking.date), "PPP", { locale: es })}</p>
        </div>
        <div>
          <span className="font-semibold">Hora:</span>
          <p>{format(new Date(booking.date), "HH:mm")}</p>
        </div>
        <div>
          <span className="font-semibold">Duración:</span>
          <p>{booking.durationMinutes} min</p>
        </div>
        <div>
          <span className="font-semibold">Total:</span>
          <p>{booking.totalPrice}€</p>
        </div>
        <div>
          <span className="font-semibold">Depósito:</span>
          <p>{booking.depositAmount}€ {booking.depositPaid && "✅"}</p>
        </div>
        <div>
          <span className="font-semibold">Restante:</span>
          <p>{booking.remainingAmount}€</p>
        </div>
      </div>

      <div>
        <span className="font-semibold">Servicios:</span>
        <ul className="list-disc pl-5">
          {booking.services.map((s) => (
            <li key={s.id}>{s.name} - {s.price}€ ({s.duration}min)</li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-semibold">Estado:</span>
        <Badge className={statusColors[status]}>{statusMap[status]}</Badge>
        <Select value={status} onValueChange={handleStatusChange} disabled={loading}>
          <SelectTrigger className="w-45">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusMap).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}