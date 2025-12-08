'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Mail, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { useTemplates, NotificationTemplate } from "@/hooks/use-templates"
import { CreateNotificationDialog } from "@/components/notifications/create-notification-dialog"
import { useNotifications } from "@/hooks/use-notifications" // Need this to send the actual notification

export default function CommunicationsPage() {
    const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useTemplates()
    const { createNotification } = useNotifications()

    // UI State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [useDialogOpen, setUseDialogOpen] = useState(false) // State for "Use Template" dialog
    const [selectedTemplateForUse, setSelectedTemplateForUse] = useState<NotificationTemplate | null>(null)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Form State
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        title: "",
        message: "",
        type: "info" as 'info' | 'alert' | 'payment' | 'contract'
    })

    const resetForm = () => {
        setFormData({ name: "", title: "", message: "", type: "info" })
        setEditingTemplate(null)
    }

    const openCreateDialog = () => {
        resetForm()
        setIsDialogOpen(true)
    }

    const openEditDialog = (template: NotificationTemplate) => {
        setEditingTemplate(template)
        setFormData({
            name: template.name,
            title: template.title,
            message: template.message,
            type: template.type
        })
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            if (editingTemplate) {
                await updateTemplate(editingTemplate.id, formData)
                toast.success("Plantilla actualizada")
            } else {
                await createTemplate(formData)
                toast.success("Plantilla creada exitosamente")
            }
            setIsDialogOpen(false)
            resetForm()
        } catch (error) {
            toast.error("Ocurrió un error al guardar la plantilla")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("¿Está seguro de que desea eliminar esta plantilla?")) {
            try {
                await deleteTemplate(id)
                toast.success("Plantilla eliminada")
            } catch (error) {
                toast.error("Error al eliminar la plantilla")
            }
        }
    }

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Plantillas de Comunicación</h1>
                    <p className="text-muted-foreground">
                        Gestione las plantillas para correos y notificaciones automáticas.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Plantilla
                    </Button>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingTemplate ? "Editar Plantilla" : "Crear Nueva Plantilla"}</DialogTitle>
                            <DialogDescription>
                                Configure el contenido predeterminado para este tipo de comunicación.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre de la Plantilla (Interno)</Label>
                                <Input
                                    id="name"
                                    placeholder="Ej. Recordatorio de Pago"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">Tipo</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v: any) => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Información</SelectItem>
                                        <SelectItem value="alert">Alerta / Urgente</SelectItem>
                                        <SelectItem value="payment">Cobro / Pago</SelectItem>
                                        <SelectItem value="contract">Contrato</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Asunto / Título (Público)</Label>
                                <Input
                                    id="title"
                                    placeholder="Ej. Aviso de vencimiento"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="message">Contenido del Mensaje</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Escriba el cuerpo del mensaje..."
                                    className="min-h-[150px]"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingTemplate ? "Guardar Cambios" : "Crear Plantilla"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Mis Plantillas</CardTitle>
                    <CardDescription>Plantillas predefinidas para uso recurrente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar plantilla..."
                            className="pl-8 max-w-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-muted-foreground">Cargando plantillas...</div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No se encontraron plantillas. Cree una nueva para comenzar.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredTemplates.map((template) => (
                                <Card key={template.id} className="overflow-hidden">
                                    <div className={`h-2 w-full ${template.type === 'alert' ? 'bg-red-500' :
                                        template.type === 'payment' ? 'bg-green-500' :
                                            template.type === 'contract' ? 'bg-purple-500' : 'bg-blue-500'
                                        }`} />
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg">{template.name}</CardTitle>
                                                <CardDescription className="mt-1">{template.title}</CardDescription>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(template)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(template.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                            {template.message}
                                        </p>
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => {
                                            setSelectedTemplateForUse(template)
                                            setUseDialogOpen(true)
                                        }}>
                                            <Mail className="mr-2 h-4 w-4" /> Usar Plantilla
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog to Use/Send Template */}
            <CreateNotificationDialog
                open={useDialogOpen}
                onOpenChange={setUseDialogOpen}
                onSubmit={createNotification}
                initialData={selectedTemplateForUse ? {
                    title: selectedTemplateForUse.title,
                    message: selectedTemplateForUse.message,
                    type: selectedTemplateForUse.type
                } : undefined}
            />
        </div>
    )
}
