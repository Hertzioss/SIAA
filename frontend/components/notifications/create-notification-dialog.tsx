import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useTenants } from "@/hooks/use-tenants"
import { useProperties } from "@/hooks/use-properties"

interface CreateNotificationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: {
        title: string;
        message: string;
        type: 'info' | 'alert' | 'payment' | 'contract';
        target: { type: 'all' | 'property' | 'tenant'; id?: string }
    }) => Promise<void>
    initialData?: {
        title: string
        message: string
        type: 'info' | 'alert' | 'payment' | 'contract'
    }
}

export function CreateNotificationDialog({ open, onOpenChange, onSubmit, initialData }: CreateNotificationDialogProps) {
    const [title, setTitle] = useState(initialData?.title || "")
    const [message, setMessage] = useState(initialData?.message || "")
    const [type, setType] = useState<'info' | 'alert' | 'payment' | 'contract'>(initialData?.type || "info")

    // Targeting State
    const [scope, setScope] = useState<'all' | 'property' | 'tenant'>("all")
    const [tenantId, setTenantId] = useState<string>("")
    const [propertyId, setPropertyId] = useState<string>("")

    const [isSubmitting, setIsSubmitting] = useState(false)

    // Update state when initialData changes or dialog opens
    useEffect(() => {
        if (open && initialData) {
            setTitle(initialData.title)
            setMessage(initialData.message)
            setType(initialData.type)
        }
        // We generally don't reset scope/tenant/property from initialData unless we store that in templates too.
        // For now templates only have content.
    }, [open, initialData])

    const { tenants } = useTenants()
    const { properties } = useProperties()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !message) return

        setIsSubmitting(true)
        try {
            await onSubmit({
                title,
                message,
                type,
                target: {
                    type: scope,
                    id: scope === 'all' ? undefined : (scope === 'property' ? propertyId : tenantId)
                }
            })
            onOpenChange(false)
            // Reset form
            setTitle("")
            setMessage("")
            setType("info")
            setScope("all")
            setTenantId("")
            setPropertyId("")
        } catch (error) {
            console.error("Error submitting notification:", error)
            // Toast is likely handled in onSubmit (the hook), but we catch here to prevent crash
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Redactar Comunicado</DialogTitle>
                    <DialogDescription>
                        Crea una nueva notificación para el sistema o para destinatarios específicos.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Asunto / Título</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Mantenimiento Programado"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Tipo</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="info">Información</SelectItem>
                                    <SelectItem value="alert">Alerta</SelectItem>
                                    <SelectItem value="payment">Cobro</SelectItem>
                                    <SelectItem value="contract">Contrato</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="scope">Alcance</Label>
                            <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Alcance" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Inquilinos</SelectItem>
                                    <SelectItem value="property">Por Propiedad</SelectItem>
                                    <SelectItem value="tenant">Un Inquilino</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {scope === 'property' && (
                        <div className="grid gap-2">
                            <Label htmlFor="property">Propiedad</Label>
                            <Select value={propertyId} onValueChange={setPropertyId} required={scope === 'property'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione propiedad" />
                                </SelectTrigger>
                                <SelectContent>
                                    {properties.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {scope === 'tenant' && (
                        <div className="grid gap-2">
                            <Label htmlFor="tenant">Inquilino</Label>
                            <Select value={tenantId} onValueChange={setTenantId} required={scope === 'tenant'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Busque inquilino" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tenants.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="message">Mensaje</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escriba el contenido del comunicado..."
                            className="min-h-[100px]"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                                </>
                            ) : (
                                "Enviar Comunicado"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
