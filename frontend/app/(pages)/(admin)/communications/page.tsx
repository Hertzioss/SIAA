'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, Edit, Trash2, Copy } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

// Mock Data for Templates
const TEMPLATES_DATA = [
    {
        id: "1",
        name: "Factura Estándar",
        type: "Factura",
        subject: "Factura de Alquiler - {mes} {año}",
        lastUpdated: "01/11/2024",
        status: "Activa"
    },
    {
        id: "2",
        name: "Recordatorio de Pago (Amigable)",
        type: "Recordatorio",
        subject: "Recordatorio: Pago Pendiente",
        lastUpdated: "15/10/2024",
        status: "Activa"
    },
    {
        id: "3",
        name: "Aviso de Corte",
        type: "Aviso",
        subject: "URGENTE: Aviso de Suspensión de Servicios",
        lastUpdated: "20/09/2024",
        status: "Borrador"
    },
    {
        id: "4",
        name: "Bienvenida Nuevo Inquilino",
        type: "Bienvenida",
        subject: "Bienvenido a {propiedad}",
        lastUpdated: "05/11/2024",
        status: "Activa"
    }
]

export default function CommunicationsPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<any>(null)

    const handleSaveTemplate = () => {
        setIsDialogOpen(false)
        toast.success(editingTemplate ? "Plantilla actualizada" : "Plantilla creada exitosamente")
        setEditingTemplate(null)
    }

    const handleEdit = (template: any) => {
        setEditingTemplate(template)
        setIsDialogOpen(true)
    }

    const handleDelete = (id: string) => {
        toast.success("Plantilla eliminada")
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Plantillas de Comunicación</h1>
                    <p className="text-muted-foreground">
                        Gestione las plantillas para correos y notificaciones automáticas.
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) setEditingTemplate(null)
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Nueva Plantilla
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px]">
                        <DialogHeader>
                            <DialogTitle>{editingTemplate ? "Editar Plantilla" : "Crear Nueva Plantilla"}</DialogTitle>
                            <DialogDescription>
                                Configure el contenido y asunto. Use variables como {'{inquilino}'}, {'{mes}'}, {'{monto}'}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Nombre de la Plantilla</Label>
                                    <Input placeholder="Ej. Recordatorio 1" defaultValue={editingTemplate?.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Tipo</Label>
                                    <Select defaultValue={editingTemplate?.type}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar tipo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Factura">Factura</SelectItem>
                                            <SelectItem value="Recordatorio">Recordatorio</SelectItem>
                                            <SelectItem value="Aviso">Aviso</SelectItem>
                                            <SelectItem value="Bienvenida">Bienvenida</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Asunto del Correo</Label>
                                <Input placeholder="Ej. Recordatorio de Pago - {mes}" defaultValue={editingTemplate?.subject} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Contenido del Mensaje</Label>
                                <Textarea
                                    placeholder="Estimado {inquilino}, le recordamos que..."
                                    className="min-h-[200px] font-mono text-sm"
                                    defaultValue={editingTemplate ? "Contenido de ejemplo..." : ""}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Variables disponibles: {'{inquilino}'}, {'{propiedad}'}, {'{monto}'}, {'{fecha_vencimiento}'}.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveTemplate}>
                                {editingTemplate ? "Guardar Cambios" : "Crear Plantilla"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Mis Plantillas</CardTitle>
                            <CardDescription>Plantillas predefinidas para uso recurrente.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar plantilla..." className="pl-8" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Asunto</TableHead>
                                <TableHead>Última Edición</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {TEMPLATES_DATA.map((template) => (
                                <TableRow key={template.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            {template.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{template.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {template.subject}
                                    </TableCell>
                                    <TableCell className="text-sm">{template.lastUpdated}</TableCell>
                                    <TableCell>
                                        <Badge variant={template.status === 'Activa' ? 'default' : 'secondary'} className={template.status === 'Activa' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                            {template.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(template.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
