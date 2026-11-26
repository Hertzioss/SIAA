"use client"

import { useState, useEffect, useMemo } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useTenants } from "@/hooks/use-tenants"
import { useProperties } from "@/hooks/use-properties"
import { supabase } from "@/lib/supabase"
import { useSystemConfig } from "@/hooks/use-system-config"
import {
    Check,
    ChevronsUpDown,
    AlertCircle,
    AlertTriangle,
    Loader2,
    Mail,
    Users,
    Building2,
    User,
    ShieldAlert,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Tenant } from "@/types/tenant"

type NotificationType = "info" | "alert" | "payment" | "contract"
type NotificationScope = "tenant" | "property" | "all"
type RecipientMode = "tenant" | "contacts" | "both"

interface CreateNotificationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: {
        title: string
        message: string
        type: NotificationType
        target: { type: NotificationScope; id?: string }
        recipientType: RecipientMode
    }) => Promise<void>
    initialData?: {
        title: string
        message: string
        type: NotificationType
    }
}

interface PreviewRecipient {
    email: string
    name: string
    role: "Inquilino" | "Contacto"
    property?: string
}

function getActiveContracts(tenant: Tenant) {
    return (tenant.contracts || []).filter((c) => c.status === "active")
}

/**
 * Diálogo seguro para redactar y enviar comunicados.
 * Arranca por defecto en "Un Inquilino", muestra vista previa exacta de correos
 * y exige confirmación explícita antes de cualquier envío (especialmente masivos).
 */
export function CreateNotificationDialog({
    open,
    onOpenChange,
    onSubmit,
    initialData,
}: CreateNotificationDialogProps) {
    const [title, setTitle] = useState(initialData?.title || "")
    const [message, setMessage] = useState(initialData?.message || "")
    const [type, setType] = useState<NotificationType>(initialData?.type || "info")

    // Safe default: always start targeting a single tenant (never "all")
    const [scope, setScope] = useState<NotificationScope>("tenant")
    const [tenantId, setTenantId] = useState<string>("")
    const [propertyId, setPropertyId] = useState<string>("")
    const [recipientType, setRecipientType] = useState<RecipientMode>("tenant")
    const [copyToAdmin, setCopyToAdmin] = useState(false)

    // UI state
    const [openTenant, setOpenTenant] = useState(false)
    const [openProperty, setOpenProperty] = useState(false)
    const [showRecipientList, setShowRecipientList] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [massSendConfirmed, setMassSendConfirmed] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { config } = useSystemConfig()
    const isEmailDisabled = config?.email_enabled === false

    const { tenants } = useTenants()
    const { properties } = useProperties()

    // Reset targeting safely every time the dialog opens
    useEffect(() => {
        if (open) {
            setTitle(initialData?.title || "")
            setMessage(initialData?.message || "")
            setType(initialData?.type || "info")
            setScope("tenant")
            setTenantId("")
            setPropertyId("")
            setRecipientType("tenant")
            setCopyToAdmin(false)
            setShowRecipientList(false)
            setConfirmOpen(false)
            setMassSendConfirmed(false)
        }
    }, [open, initialData])

    const handleScopeChange = (nextScope: NotificationScope) => {
        setScope(nextScope)
        setTenantId("")
        setPropertyId("")
        setShowRecipientList(false)
        setMassSendConfirmed(false)
    }

    // Compute exact deduplicated recipients preview matching useNotifications()
    const recipientPreview = useMemo(() => {
        let matchedTenants: Tenant[] = []

        if (scope === "tenant") {
            if (tenantId) {
                const picked = tenants.find((t) => t.id === tenantId)
                if (picked) matchedTenants = [picked]
            }
        } else if (scope === "property") {
            if (propertyId) {
                matchedTenants = tenants.filter((t) =>
                    getActiveContracts(t).some((c) => c.unit?.property?.id === propertyId)
                )
            }
        } else if (scope === "all") {
            matchedTenants = tenants.filter((t) => getActiveContracts(t).length > 0)
        }

        const emailsMap = new Map<string, PreviewRecipient>()

        for (const t of matchedTenants) {
            const activeContract =
                scope === "property"
                    ? getActiveContracts(t).find((c) => c.unit?.property?.id === propertyId)
                    : getActiveContracts(t)[0]
            const propertyName = activeContract?.unit?.property?.name

            if (recipientType === "tenant" || recipientType === "both") {
                const email = t.email?.trim()
                if (email && email.includes("@")) {
                    const key = email.toLowerCase()
                    if (!emailsMap.has(key)) {
                        emailsMap.set(key, {
                            email,
                            name: t.name,
                            role: "Inquilino",
                            property: propertyName,
                        })
                    }
                }
            }

            if (recipientType === "contacts" || recipientType === "both") {
                for (const c of t.contacts || []) {
                    const email = c.email?.trim()
                    if (email && email.includes("@")) {
                        const key = email.toLowerCase()
                        if (!emailsMap.has(key)) {
                            emailsMap.set(key, {
                                email,
                                name: c.name,
                                role: "Contacto",
                                property: propertyName,
                            })
                        }
                    }
                }
            }
        }

        return {
            tenantCount: matchedTenants.length,
            emails: Array.from(emailsMap.values()),
        }
    }, [scope, tenantId, propertyId, recipientType, tenants])

    const selectedTenant = tenants.find((t) => t.id === tenantId)
    const selectedProperty = properties.find((p) => p.id === propertyId)

    const hasValidTarget =
        scope === "all" ||
        (scope === "property" && Boolean(propertyId)) ||
        (scope === "tenant" && Boolean(tenantId))

    const canProceed =
        Boolean(title.trim()) && Boolean(message.trim()) && hasValidTarget && !isSubmitting

    const isMassSend = scope === "all" || scope === "property" || recipientPreview.emails.length > 1
    const requiresExplicitCheck = scope === "all" || recipientPreview.emails.length > 5

    const handleRequestConfirm = () => {
        if (!canProceed) return
        setMassSendConfirmed(false)
        setConfirmOpen(true)
    }

    const handleConfirmedSend = async () => {
        if (!canProceed) return
        if (requiresExplicitCheck && !massSendConfirmed) return

        setIsSubmitting(true)
        setConfirmOpen(false)
        try {
            await onSubmit({
                title: title.trim(),
                message: message.trim(),
                type,
                target: {
                    type: scope,
                    id: scope === "all" ? undefined : scope === "property" ? propertyId : tenantId,
                },
                recipientType,
            })

            if (copyToAdmin && !isEmailDisabled) {
                const { data: company } = await supabase
                    .from("companies")
                    .select("email, name")
                    .single()
                if (company?.email) {
                    await fetch("/api/emails/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            recipients: [
                                { email: company.email, name: company.name || "Administrador" },
                            ],
                            subject: `[COPIA ADMIN] ${title.trim()}`,
                            message: message.trim(),
                        }),
                    })
                }
            }
            onOpenChange(false)
        } catch (error) {
            console.error("Error submitting notification:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const scopeSummaryLabel =
        scope === "tenant"
            ? selectedTenant
                ? `Un inquilino: ${selectedTenant.name}`
                : "Un inquilino (sin seleccionar)"
            : scope === "property"
              ? selectedProperty
                  ? `Todo el inmueble: ${selectedProperty.name}`
                  : "Por inmueble (sin seleccionar)"
              : "TODOS los inquilinos con contrato activo (todas las propiedades)"

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[640px] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
                    <DialogHeader className="px-6 py-4 border-b bg-muted/20 shrink-0 text-left">
                        <DialogTitle>Redactar Comunicado</DialogTitle>
                        <DialogDescription className="text-xs">
                            Selecciona el destinatario exacto y verifica la lista antes de enviar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {isEmailDisabled && (
                            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex items-start gap-2.5">
                                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                                        Envío de correos desactivado
                                    </p>
                                    <p className="text-[11px] text-rose-700/90 dark:text-rose-400">
                                        La notificación se guardará en el sistema, pero no se
                                        enviarán correos electrónicos.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-1.5">
                            <Label htmlFor="notif-title" className="text-xs">
                                Asunto / Título *
                            </Label>
                            <Input
                                id="notif-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej. Mantenimiento Programado"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Tipo</Label>
                                <Select
                                    value={type}
                                    onValueChange={(v) => setType(v as NotificationType)}
                                >
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

                            <div className="grid gap-1.5">
                                <Label className="text-xs">Alcance *</Label>
                                <Select
                                    value={scope}
                                    onValueChange={(v) =>
                                        handleScopeChange(v as NotificationScope)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Alcance" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tenant">
                                            <span className="inline-flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                Un Inquilino (Individual)
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="property">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                Por Inmueble
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="all">
                                            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                                                <Users className="h-3.5 w-3.5" />
                                                Todos (Masivo — contratos activos)
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {scope === "tenant" && (
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Inquilino *</Label>
                                <Popover open={openTenant} onOpenChange={setOpenTenant}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openTenant}
                                            className="justify-between w-full font-normal"
                                        >
                                            <span className="truncate">
                                                {selectedTenant
                                                    ? `${selectedTenant.name}${selectedTenant.email ? ` (${selectedTenant.email})` : " (Sin correo)"}`
                                                    : "Seleccione un inquilino..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar por nombre, cédula o correo..." />
                                            <CommandList>
                                                <CommandEmpty>
                                                    No se encontró el inquilino.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {tenants.map((t) => (
                                                        <CommandItem
                                                            key={t.id}
                                                            value={`${t.name} ${t.doc_id} ${t.email || ""}`}
                                                            onSelect={() => {
                                                                setTenantId(t.id)
                                                                setOpenTenant(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4 shrink-0",
                                                                    tenantId === t.id
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-medium truncate">
                                                                    {t.name}
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground truncate">
                                                                    {t.email || "Sin correo"} ·{" "}
                                                                    {t.doc_id}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        {scope === "property" && (
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Inmueble *</Label>
                                <Popover open={openProperty} onOpenChange={setOpenProperty}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openProperty}
                                            className="justify-between w-full font-normal"
                                        >
                                            <span className="truncate">
                                                {selectedProperty
                                                    ? selectedProperty.name
                                                    : "Seleccione un inmueble..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar inmueble..." />
                                            <CommandList>
                                                <CommandEmpty>
                                                    No se encontró el inmueble.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {properties.map((p) => (
                                                        <CommandItem
                                                            key={p.id}
                                                            value={`${p.name} ${p.address || ""}`}
                                                            onSelect={() => {
                                                                setPropertyId(p.id)
                                                                setOpenProperty(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4 shrink-0",
                                                                    propertyId === p.id
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
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

                        <div className="grid gap-1.5">
                            <Label className="text-xs">Destinatarios de Correo</Label>
                            <Select
                                value={recipientType}
                                onValueChange={(v) => setRecipientType(v as RecipientMode)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tenant">Solo Inquilino</SelectItem>
                                    <SelectItem value="contacts">Solo Contactos</SelectItem>
                                    <SelectItem value="both">
                                        Ambos (Inquilino + Contactos)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Live Recipients Preview Box */}
                        {hasValidTarget && (
                            <div
                                className={cn(
                                    "rounded-lg border p-3 text-xs space-y-2",
                                    scope === "all"
                                        ? "bg-amber-500/10 border-amber-500/30"
                                        : scope === "property"
                                          ? "bg-blue-500/5 border-blue-500/20"
                                          : "bg-muted/30 border-border"
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {scope === "all" ? (
                                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                        ) : (
                                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                        )}
                                        <span className="font-medium">
                                            {scope === "all" && "Envío masivo: "}
                                            <strong className="tabular-nums">
                                                {recipientPreview.tenantCount}
                                            </strong>{" "}
                                            {recipientPreview.tenantCount === 1
                                                ? "inquilino"
                                                : "inquilinos"}{" "}
                                            ·{" "}
                                            <strong className="tabular-nums">
                                                {recipientPreview.emails.length}
                                            </strong>{" "}
                                            {recipientPreview.emails.length === 1
                                                ? "correo"
                                                : "correos"}
                                        </span>
                                    </div>
                                    {recipientPreview.emails.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[11px]"
                                            onClick={() => setShowRecipientList((v) => !v)}
                                        >
                                            {showRecipientList ? (
                                                <>
                                                    Ocultar
                                                    <ChevronUp className="ml-1 h-3 w-3" />
                                                </>
                                            ) : (
                                                <>
                                                    Ver correos
                                                    <ChevronDown className="ml-1 h-3 w-3" />
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>

                                {recipientPreview.emails.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground">
                                        No hay direcciones de correo válidas para esta selección
                                        (solo se guardará la notificación interna si hay inquilinos
                                        activos).
                                    </p>
                                )}

                                {recipientPreview.emails.length > 0 &&
                                    (showRecipientList || recipientPreview.emails.length <= 2) && (
                                        <div className="max-h-28 overflow-y-auto space-y-1 pt-1 border-t border-border/60">
                                            {recipientPreview.emails.map((r) => (
                                                <div
                                                    key={r.email.toLowerCase()}
                                                    className="flex items-center justify-between gap-2 text-[11px]"
                                                >
                                                    <span className="truncate">
                                                        <strong className="font-medium">
                                                            {r.name}
                                                        </strong>{" "}
                                                        <span className="text-muted-foreground">
                                                            &lt;{r.email}&gt;
                                                        </span>
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] px-1.5 py-0 shrink-0"
                                                    >
                                                        {r.role}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>
                        )}

                        <div className="grid gap-1.5">
                            <Label htmlFor="notif-message" className="text-xs">
                                Mensaje *
                            </Label>
                            <Textarea
                                id="notif-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escriba el contenido del comunicado..."
                                className="min-h-[110px]"
                            />
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5">
                            <Checkbox
                                id="copy-admin"
                                checked={copyToAdmin}
                                onCheckedChange={(v) => setCopyToAdmin(v === true)}
                            />
                            <div className="grid gap-0.5">
                                <Label
                                    htmlFor="copy-admin"
                                    className="cursor-pointer text-xs font-medium"
                                >
                                    Enviar copia al administrador
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Se enviará una copia al correo de la empresa configurado en
                                    Perfil.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-3.5 border-t bg-muted/20 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleRequestConfirm}
                            disabled={!canProceed}
                            className={
                                scope === "all"
                                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                                    : undefined
                            }
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                "Revisar y Enviar"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mandatory Confirmation AlertDialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            {isMassSend && (
                                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                            )}
                            {scope === "all"
                                ? "¿Confirmar envío masivo a TODOS?"
                                : "¿Confirmar envío de comunicado?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm pt-1">
                                <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">Asunto: </span>
                                        <strong className="text-foreground">{title.trim()}</strong>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Alcance: </span>
                                        <strong className="text-foreground">
                                            {scopeSummaryLabel}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">
                                            Correos a enviar:{" "}
                                        </span>
                                        <strong className="text-foreground tabular-nums">
                                            {isEmailDisabled
                                                ? "0 (envío desactivado)"
                                                : recipientPreview.emails.length}
                                        </strong>
                                        {copyToAdmin && !isEmailDisabled && (
                                            <span className="text-muted-foreground">
                                                {" "}
                                                (+1 copia al administrador)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {!isEmailDisabled && recipientPreview.emails.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-foreground">
                                            Destinatarios exactos:
                                        </p>
                                        <div className="max-h-36 overflow-y-auto rounded-md border p-2 space-y-1 bg-background">
                                            {recipientPreview.emails.map((r) => (
                                                <div
                                                    key={r.email.toLowerCase()}
                                                    className="text-xs flex items-center justify-between gap-2"
                                                >
                                                    <span className="truncate">
                                                        {r.name} ({r.email})
                                                    </span>
                                                    {r.property && (
                                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                                            {r.property}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {requiresExplicitCheck && (
                                    <div className="flex items-start gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                                        <Checkbox
                                            id="confirm-mass-send"
                                            checked={massSendConfirmed}
                                            onCheckedChange={(v) =>
                                                setMassSendConfirmed(v === true)
                                            }
                                            className="mt-0.5"
                                        />
                                        <label
                                            htmlFor="confirm-mass-send"
                                            className="text-xs font-medium text-amber-900 dark:text-amber-200 cursor-pointer leading-snug"
                                        >
                                            Confirmo que verifiqué el alcance y deseo enviar este
                                            comunicado a{" "}
                                            <strong>{recipientPreview.emails.length}</strong>{" "}
                                            destinatarios.
                                        </label>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={
                                isSubmitting || (requiresExplicitCheck && !massSendConfirmed)
                            }
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmedSend()
                            }}
                            className={
                                scope === "all"
                                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                                    : undefined
                            }
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Confirmar y Enviar"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
