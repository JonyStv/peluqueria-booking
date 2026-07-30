// src/components/ServiceManager.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createService, updateService, deleteService } from "@/actions/services";

export function ServiceManager({ initialServices }) {
  const [services, setServices] = useState(initialServices);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", duration: "" });
  const router = useRouter();

  // Sincronizar si initialServices cambia (por si refrescas la página)
  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration, 10),
    };

    let result;
    if (editing) {
      result = await updateService(editing, data);
      // Actualizar estado local reemplazando el servicio editado
      setServices((prev) => prev.map((s) => (s.id === editing ? result : s)));
    } else {
      result = await createService(data);
      // Actualizar estado local añadiendo el nuevo servicio
      setServices((prev) => [...prev, result]);
    }
    setDialogOpen(false);
    setEditing(null);
    setFormData({ name: "", price: "", duration: "" });
    // Opcional: refrescar la ruta para actualizar otras partes de la página (estadísticas, etc.)
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (confirm("¿Eliminar este servicio?")) {
      await deleteService(id);
      // Actualizar estado local quitando el servicio eliminado
      setServices((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    }
  };

  const openEdit = (service) => {
    setEditing(service.id);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration.toString(),
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Servicios</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormData({ name: "", price: "", duration: "" });
                }}
              >
                Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Precio (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Duración (min)</Label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit">{editing ? "Actualizar" : "Crear"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>{service.name}</TableCell>
                <TableCell>{service.price}€</TableCell>
                <TableCell>{service.duration} min</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => openEdit(service)} className="mr-2">
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(service.id)}>
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}