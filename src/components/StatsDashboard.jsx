"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function StatsDashboard({ bookings, services }) {
  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const confirmed = bookings.filter(b => b.status === "confirmed" || b.status === "deposit_paid").length;
    const cancelled = bookings.filter(b => b.status === "cancelled").length;
    const completed = bookings.filter(b => b.status === "completed").length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.depositPaid ? b.depositAmount : 0), 0);
    const monthlyBookings = bookings.reduce((acc, b) => {
      const month = format(parseISO(b.date), "MMMM yyyy", { locale: es });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return { totalBookings, confirmed, cancelled, completed, totalRevenue, monthlyBookings };
  }, [bookings]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total reservas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.totalBookings}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Confirmadas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{stats.confirmed}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Canceladas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{stats.cancelled}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Ingresos (depósitos)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)}€</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Reservas por mes</CardTitle></CardHeader>
        <CardContent>
          <ul>
            {Object.entries(stats.monthlyBookings).map(([month, count]) => (
              <li key={month} className="flex justify-between py-1 border-b">
                <span>{month}</span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}