// src/components/AdminDashboard.jsx
"use client";

import { signOut } from "next-auth/react";
import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookingDetails } from "./BookingDetails";
import { ServiceManager } from "./ServiceManager";
import { StatsDashboard } from "./StatsDashboard";

const localizer = momentLocalizer(moment);

export default function AdminDashboard({ bookings, services }) {
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Convertir reservas en eventos del calendario
    const events = useMemo(() => {
        return bookings.map((booking) => {
            const start = parseISO(booking.date);
            const end = new Date(start.getTime() + booking.durationMinutes * 60000);
            return {
                id: booking.id,
                title: `${booking.guestName || booking.user?.name || "Anónimo"} - ${booking.services.map(s => s.name).join(", ")}`,
                start,
                end,
                resource: booking,
                status: booking.status,
            };
        });
    }, [bookings]);

    const handleSelectEvent = (event) => {
        setSelectedBooking(event.resource);
        setDialogOpen(true);
    };

    const eventPropGetter = (event) => {
        const colors = {
            pending: "#f59e0b", // amarillo
            deposit_paid: "#3b82f6", // azul
            confirmed: "#10b981", // verde
            cancelled: "#ef4444", // rojo
            completed: "#6b7280", // gris
        };
        return {
            style: {
                backgroundColor: colors[event.status] || "#3b82f6",
                borderRadius: "4px",
                color: "white",
                border: "none",
                padding: "2px 4px",
            },
        };
    };

    return (

        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

            <Tabs defaultValue="calendar" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="calendar">Calendario</TabsTrigger>
                    <TabsTrigger value="services">Servicios</TabsTrigger>
                    <TabsTrigger value="stats">Estadísticas</TabsTrigger>

                </TabsList>
                <TabsContent value="calendar">
                    <Card>
                        <CardContent className="p-4">
                            <Calendar
                                localizer={localizer}
                                events={events}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: 600 }}
                                onSelectEvent={handleSelectEvent}
                                eventPropGetter={eventPropGetter}
                                views={["month", "week", "day"]}
                                messages={{
                                    next: "Siguiente",
                                    previous: "Anterior",
                                    today: "Hoy",
                                    month: "Mes",
                                    week: "Semana",
                                    day: "Día",
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="services">
                    <ServiceManager initialServices={services} />
                </TabsContent>

                <TabsContent value="stats">
                    <StatsDashboard bookings={bookings} services={services} />
                </TabsContent>
            </Tabs>

            {/* Modal de detalles de la reserva */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalles de la reserva</DialogTitle>
                    </DialogHeader>
                    {selectedBooking && (
                        <BookingDetails
                            booking={selectedBooking}
                            onClose={() => setDialogOpen(false)}
                            onUpdate={() => {
                                // Recargar datos (podríamos usar SWR o refetch)
                                window.location.reload();
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}