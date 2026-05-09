import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useTenants } from "@/hooks/use-tenants"
import { useProperties } from "@/hooks/use-properties"
import { supabase } from "@/lib/supabase"
import { useSystemConfig } from "@/hooks/use-system-config"
import { Check, ChevronsUpDown, AlertCircle, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface CreateNotificationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: {
        title: string;
        message: string;
        type: 'info' | 'alert' | 'payment' | 'contract';
        target: { type: 'all' | 'property' | 'tenant'; id?: string };
        recipientType: 'tenant' | 'contacts' | 'both';
    }) => Promise<void>
    initialData?: {
        title: string
        message: string
        type: 'info' | 'alert' | 'payment' | 'contract'
    }
}

/**
 * Diálogo para crear y enviar notificaciones masivas o dirigidas.
 * Permite seleccionar el alcance (Todos, Propiedad, Inquilino) y tipo de mensaje.
 */
export function CreateNotificationDialog({ open, onOpenChange, onSubmit, initialData }: CreateNotificationDialogProps) {
    const [title, setTitle] = useState(initialData?.title || "")
    const [message, setMessage] = useState(initialData?.message || "")
    const [type, setType] = useState<'info' | 'alert' | 'payment' | 'contract'>(initialData?.type || "info")

    // Targeting State
    const [scope, setScope] = useState<'all' | 'property' | 'tenant'>("all")
    const [tenantId, setTenantId] = useState<string>("")
    const [propertyId, setPropertyId] = useState<string>("")
    const [recipientType, setRecipientType] = useState<'tenant' | 'contacts' | 'both'>('tenant')
    const [copyToAdmin, setCopyToAdmin] = useState(false)

    // UI state for Comboboxes
    const [openTenant, setOpenTenant] = useState(false)
    const [openProperty, setOpenProperty] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const { config } = useSystemConfig()
    const isEmailDisabled = config?.email_enabled === false

    // Update state when initialData changes or dialog opens
    useEffect(() => {
        if (open && initialData) {
            setTitle(initialData.title)
            setMessage(initialData.message)
            setType(initialData.type)
        }
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
                },
                recipientType
            })

            // Send admin copy if requested
            if (copyToAdmin && !isEmailDisabled) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('email, name')
                    .single()
                if (company?.email) {
                    await fetch('/api/emails/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipients: [{ email: company.email, name: company.name || 'Administrador' }],
                            subject: `[COPIA ADMIN] ${title}`,
                            message
                        })
                    })
                }
            }
            onOpenChange(false)
            // Reset form
            setTitle("")
            setMessage("")
            setType("info")
            setScope("all")
            setTenantId("")
            setPropertyId("")
            setRecipientType("tenant")
            setCopyToAdmin(false)
        } catch (error) {
            console.error("Error submitting notification:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Redactar Comunicado</DialogTitle>
                    <DialogDescription>
                        Crea una nueva notificación para el sistema o para destinatarios específicos.
                    </DialogDescription>
                </DialogHeader>

                {isEmailDisabled && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-800 dark:text-red-400">Envío de correos desactivado</p>
                            <p className="text-xs text-red-700 dark:text-red-500">
                                La notificación se guardará en el sistema, pero no se enviarán correos electrónicos a los inquilinos.
                            </p>
                        </div>
                    </div>
                )}

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
                                <SelectTrigger className="w-full">
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
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Alcance" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="property">Por Inmueble</SelectItem>
                                    <SelectItem value="tenant">Un Inquilino</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {scope === 'property' && (
                        <div className="grid gap-2">
                            <Label htmlFor="property">Inmueble</Label>
                            <Popover open={openProperty} onOpenChange={setOpenProperty}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openProperty}
                                        className="justify-between w-full font-normal"
                                    >
                                        {propertyId
                                            ? properties.find((p) => p.id === propertyId)?.name
                                            : "Seleccione inmueble..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar inmueble..." />
                                        <CommandList>
                                            <CommandEmpty>No se encontró el inmueble.</CommandEmpty>
                                            <CommandGroup>
                                                {properties.map((p) => (
                                                    <CommandItem
                                                        key={p.id}
                                                        value={p.name}
                                                        onSelect={() => {
                                                            setPropertyId(p.id)
                                                            setOpenProperty(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                propertyId === p.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {p.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}


                    {scope === 'tenant' && (
                        <div className="grid gap-2">
                            <Label htmlFor="tenant">Inquilino</Label>
                            <Popover open={openTenant} onOpenChange={setOpenTenant}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openTenant}
                                        className="justify-between w-full font-normal"
                                    >
                                        {tenantId
                                            ? tenants.find((t) => t.id === tenantId)?.name
                                            : "Seleccione inquilino..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar por nombre..." />
                                        <CommandList>
                                            <CommandEmpty>No se encontró el inquilino.</CommandEmpty>
                                            <CommandGroup>
                                                {tenants.map((t) => (
                                                    <CommandItem
                                                        key={t.id}
                                                        value={t.name}
                                                        onSelect={() => {
                                                            setTenantId(t.id)
                                                            setOpenTenant(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                tenantId === t.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {t.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>Destinatarios de Correo</Label>
                        <Select value={recipientType} onValueChange={(v: any) => setRecipientType(v)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tenant">Solo Inquilino</SelectItem>
                                <SelectItem value="contacts">Solo Contactos</SelectItem>
                                <SelectItem value="both">Ambos (Inquilino + Contactos)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

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

                    <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                        <Checkbox
                            id="copy-admin"
                            checked={copyToAdmin}
                            onCheckedChange={(v) => setCopyToAdmin(Boolean(v))}
                        />
                        <div className="grid gap-0.5">
                            <Label htmlFor="copy-admin" className="cursor-pointer font-medium">
                                Enviar copia al administrador
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Se enviará una copia del comunicado al correo de la empresa configurado en Perfil.
                            </p>
                        </div>
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
