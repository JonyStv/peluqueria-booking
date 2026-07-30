"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createService, updateService, deleteService, reorderServices } from "@/actions/services";

function SortableServiceRow({ service, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="w-10">
        <div {...listeners} className="cursor-grab flex justify-center">
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
      </TableCell>
      <TableCell>{service.name}</TableCell>
      <TableCell>{service.price}€</TableCell>
      <TableCell>{service.duration} min</TableCell>
      <TableCell>
        <Button variant="outline" size="sm" onClick={() => onEdit(service)} className="mr-2">
          Editar
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(service.id)}>
          Eliminar
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function ServiceManager({ initialServices }) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", duration: "" });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === active.id);
      const newIndex = services.findIndex((s) => s.id === over.id);
      const newServices = arrayMove(services, oldIndex, newIndex);
      setServices(newServices);
      const orderedIds = newServices.map((s) => s.id);
      await reorderServices(orderedIds);
      router.refresh();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration, 10),
    };

    if (editing) {
      const updated = await updateService(editing, data);
      setServices((prev) => prev.map((s) => (s.id === editing ? updated : s)));
    } else {
      const created = await createService(data);
      setServices((prev) => [...prev, created]);
    }
    setDialogOpen(false);
    setEditing(null);
    setFormData({ name: "", price: "", duration: "" });
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (confirm("¿Eliminar este servicio?")) {
      await deleteService(id);
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

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: "", price: "", duration: "" });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Servicios</h2>
          <Button onClick={openCreate}>Nuevo Servicio</Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={services.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <SortableServiceRow
                    key={service.id}
                    service={service}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}