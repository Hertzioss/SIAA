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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Loader2,
    User,
    Users,
    Mail,
    Phone,
    Plus,
    Trash2,
    FileText,
    Calendar,
    RefreshCw,
    Pencil,
    Eye,
    EyeOff,
    Copy,
    Check,
    KeyRound,
    ShieldCheck,
    ShieldAlert,
    Building2,
    ExternalLink,
    CreditCard,
    Sparkles,
    IdCard,
    ArrowRight,
    DollarSign,
} from "lucide-react"
import { toast } from "sonner"
import { Tenant, TenantStatus } from "@/types/tenant"
import { Property } from "@/types/property"
import { PaymentHistoryList } from "./payment-history-list"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import { useTenantContacts, TenantContact } from "@/hooks/use-tenant-contacts"
import { useContracts, Contract, ContractInsert, ContractUpdate } from "@/hooks/use-contracts"
import { differenceInCalendarDays, differenceInYears, format, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { parseLocalDate, formatCurrency } from "@/lib/utils"
import Link from "next/link"

interface TenantSubmitData {
    name: string
    doc_id: string
    email: string | null
    phone: string | null
    birth_date: string | null
    status: TenantStatus
}

interface InitialContractData {
    unit_id: string
    start_date: string
    end_date: string | null
    rent_amount: number
    type: "residential" | "commercial"
}

interface TenantDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "create" | "view" | "edit"
    tenant?: Tenant
    properties: Property[]
    onSubmit?: (tenantData: TenantSubmitData, contractData?: InitialContractData) => Promise<void>
    onContractsUpdated?: () => void
    onModeChange?: (mode: "create" | "view" | "edit") => void
    onRegisterPayment?: (tenant: Tenant) => void
}

const RELATION_META: Record<
    TenantContact["relation"],
    { label: string; className: string }
> = {
    family: {
        label: "Familiar",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    },
    partner: {
        label: "Pareja",
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    },
    worker: {
        label: "Trabajador",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    other: {
        label: "Otro",
        className: "bg-muted text-muted-foreground border-border",
    },
}

const CONTRACT_STATUS_ORDER: Record<Contract["status"], number> = {
    active: 0,
    expired: 1,
    terminated: 2,
    cancelled: 3,
}

function getInitials(name?: string) {
    if (!name) return "IN"
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getContractStatusBadge(status: Contract["status"]) {
    switch (status) {
        case "active":
            return {
                label: "Vigente",
                className:
                    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
            }
        case "expired":
            return {
                label: "Vencido",
                className:
                    "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
            }
        case "cancelled":
            return {
                label: "Cancelado",
                className: "bg-muted text-muted-foreground border-border",
            }
        default:
            return {
                label: "Finalizado",
                className: "bg-muted text-muted-foreground border-border",
            }
    }
}

function generateSecurePassword(length = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"
    let result = ""
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

/**
 * Diálogo principal para la gestión de inquilinos.
 * Maneja registro inicial, ficha detallada, edición, contratos, contactos, pagos y acceso al portal.
 */
export function TenantDialog({
    open,
    onOpenChange,
    mode,
    tenant,
    properties,
    onSubmit,
    onContractsUpdated,
    onModeChange,
    onRegisterPayment,
}: TenantDialogProps) {
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("info")
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    // Tenant Fields
    const [name, setName] = useState("")
    const [docId, setDocId] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [birthDate, setBirthDate] = useState("")
    const [status, setStatus] = useState<TenantStatus>("solvent")

    // Contract Fields (Only for create mode)
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")
    const [selectedUnitId, setSelectedUnitId] = useState<string>("")
    const [contractType, setContractType] = useState<"residential" | "commercial">("residential")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [rentAmount, setRentAmount] = useState("")
    const [isIndefinite, setIsIndefinite] = useState(false)

    // Access Tab State
    const [hasPortalAccess, setHasPortalAccess] = useState(false)
    const [showManualPassword, setShowManualPassword] = useState(false)
    const [showPasswordChars, setShowPasswordChars] = useState(false)
    const [manualPassword, setManualPassword] = useState("")
    const [sendAccessEmail, setSendAccessEmail] = useState(true)

    // Hooks
    const {
        contacts,
        createContact,
        deleteContact,
        fetchContacts,
        isLoading: loadingContacts,
    } = useTenantContacts(tenant?.id)
    const {
        contracts,
        isLoading: loadingContracts,
        fetchTenantContracts,
        createContract,
        updateContract,
        renewContract,
    } = useContracts({ autoFetch: false })

    const tenantContracts = useMemo(() => {
        if (!tenant) return []
        return contracts
            .filter((c) => c.tenant_id === tenant.id)
            .sort((a, b) => {
                const orderDiff =
                    (CONTRACT_STATUS_ORDER[a.status] ?? 9) -
                    (CONTRACT_STATUS_ORDER[b.status] ?? 9)
                if (orderDiff !== 0) return orderDiff
                return (
                    parseLocalDate(b.start_date).getTime() -
                    parseLocalDate(a.start_date).getTime()
                )
            })
    }, [contracts, tenant])

    const activeContracts = useMemo(
        () => tenantContracts.filter((c) => c.status === "active"),
        [tenantContracts]
    )

    const totalActiveRent = useMemo(
        () => activeContracts.reduce((sum, c) => sum + Number(c.rent_amount || 0), 0),
        [activeContracts]
    )

    // Contract Dialog State
    const [isContractDialogOpen, setIsContractDialogOpen] = useState(false)
    const [contractDialogMode, setContractDialogMode] = useState<
        "create" | "edit" | "view" | "renew"
    >("create")
    const [selectedContract, setSelectedContract] = useState<Contract | undefined>(undefined)

    // New Contact Form State
    const [showAddContact, setShowAddContact] = useState(false)
    const [newContact, setNewContact] = useState<{
        name: string
        relation: TenantContact["relation"]
        phone: string
        email: string
    }>({
        name: "",
        relation: "family",
        phone: "",
        email: "",
    })

    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState<() => Promise<void> | void>()

    const resetForm = () => {
        setName("")
        setDocId("")
        setEmail("")
        setPhone("")
        setBirthDate("")
        setStatus("solvent")
        setHasPortalAccess(false)
        setShowManualPassword(false)
        setManualPassword("")
        setShowPasswordChars(false)
        setShowAddContact(false)

        setSelectedPropertyId("")
        setSelectedUnitId("")
        setContractType("residential")
        setStartDate("")
        setEndDate("")
        setRentAmount("")
        setIsIndefinite(false)

        setNewContact({ name: "", relation: "family", phone: "", email: "" })
    }

    useEffect(() => {
        if (open) {
            if ((mode === "view" || mode === "edit") && tenant) {
                setName(tenant.name || "")
                setDocId(tenant.doc_id || "")
                setEmail(tenant.email || "")
                setPhone(tenant.phone || "")
                setBirthDate(tenant.birth_date ? tenant.birth_date.split("T")[0] : "")
                setStatus(tenant.status)
                setHasPortalAccess(Boolean(tenant.user_id))
                setShowManualPassword(false)
                setManualPassword("")
                setShowPasswordChars(false)

                fetchContacts()
                fetchTenantContracts(tenant.id)
            } else {
                resetForm()
            }
        } else {
            setActiveTab("info")
            setShowAddContact(false)
        }
    }, [open, mode, tenant, fetchContacts, fetchTenantContracts])

    const handleCopy = async (value: string, key: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value)
            setCopiedKey(key)
            toast.success(`${label} copiado`)
            setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1600)
        } catch {
            toast.error("No se pudo copiar al portapapeles")
        }
    }

    const handleSubmit = async () => {
        const missingFields: string[] = []
        if (!name.trim()) missingFields.push("Nombre")
        if (!docId.trim()) missingFields.push("Documento")

        if (mode === "create") {
            if (!selectedUnitId) missingFields.push("Unidad")
            if (!startDate) missingFields.push("Fecha Inicio")
            if (!isIndefinite && !endDate) missingFields.push("Fecha Fin")
            if (!rentAmount) missingFields.push("Canon Mensual")
        }

        if (missingFields.length > 0) {
            toast.error(`Por favor complete los campos obligatorios: ${missingFields.join(", ")}`)
            return
        }

        try {
            setLoading(true)
            const tenantData: TenantSubmitData = {
                name: name.trim(),
                doc_id: docId.trim(),
                email: email.trim() || null,
                phone: phone.trim() || null,
                birth_date: birthDate || null,
                status,
            }

            let contractData: InitialContractData | undefined = undefined
            if (mode === "create") {
                contractData = {
                    unit_id: selectedUnitId,
                    start_date: startDate,
                    end_date: isIndefinite ? null : endDate,
                    rent_amount: parseFloat(rentAmount),
                    type: contractType,
                }
            }

            if (onSubmit) {
                await onSubmit(tenantData, contractData)
            }
            onOpenChange(false)
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string }
            const isDuplicate =
                error?.code === "23505" ||
                error?.message?.includes("Uniqueness violation") ||
                error?.message?.includes("duplicate key")

            if (isDuplicate) {
                toast.error("Este inquilino ya está registrado.", {
                    description:
                        "Si desea asignarle otro inmueble, búsquelo en la lista e ingrese a su perfil para añadir un nuevo contrato.",
                    duration: 6000,
                })
            } else {
                toast.error("Ocurrió un error al guardar", { description: error?.message })
                console.warn("Error submitting tenant:", error?.message || JSON.stringify(err))
            }
        } finally {
            setLoading(false)
        }
    }

    const handleAddContact = async () => {
        if (!tenant || !newContact.name.trim()) return

        const success = await createContact({
            tenant_id: tenant.id,
            name: newContact.name.trim(),
            relation: newContact.relation,
            phone: newContact.phone.trim() || undefined,
            email: newContact.email.trim() || undefined,
            is_primary: false,
        })

        if (success) {
            setNewContact({ name: "", relation: "family", phone: "", email: "" })
            setShowAddContact(false)
            onContractsUpdated?.()
        }
    }

    const handleDeleteContact = async (contactId: string) => {
        const success = await deleteContact(contactId)
        if (success) {
            onContractsUpdated?.()
        }
    }

    const handleResetPassword = () => {
        setPendingAction(() => async () => {
            if (!email || !tenant) return
            try {
                setLoading(true)
                const res = await fetch("/api/tenants/reset-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, tenantId: tenant.id }),
                })
                const data = (await res.json()) as { details?: string; error?: string }
                if (!res.ok) throw new Error(data.details || data.error || "Error al restablecer")
                toast.success("Contraseña restablecida y enviada por correo")
            } catch (err: unknown) {
                toast.error((err as { message?: string })?.message || "Error al restablecer")
            } finally {
                setLoading(false)
                setConfirmOpen(false)
            }
        })
        setConfirmOpen(true)
    }

    const handleManualPassword = async () => {
        if (!email || !tenant || !manualPassword) return
        try {
            setLoading(true)
            const res = await fetch("/api/tenants/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    tenantId: tenant.id,
                    password: manualPassword,
                }),
            })
            const data = (await res.json()) as { details?: string; error?: string }
            if (!res.ok) throw new Error(data.details || data.error || "Error al actualizar")
            toast.success("Contraseña actualizada manualmente")
            setShowManualPassword(false)
            setManualPassword("")
            setShowPasswordChars(false)
        } catch (err: unknown) {
            toast.error((err as { message?: string })?.message || "Error al actualizar")
        } finally {
            setLoading(false)
        }
    }

    const handleCreateAccess = async () => {
        if (!email || !tenant) return
        try {
            setLoading(true)
            const res = await fetch("/api/tenants/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    name: tenant.name,
                    tenantId: tenant.id,
                    sendEmail: sendAccessEmail,
                }),
            })
            const data = (await res.json()) as { details?: string; error?: string }
            if (!res.ok) throw new Error(data.details || data.error || "Error al crear acceso")
            setHasPortalAccess(true)
            onContractsUpdated?.()
            toast.success("Acceso creado exitosamente", {
                description: sendAccessEmail
                    ? "Se han enviado las credenciales al correo del inquilino."
                    : "El acceso fue creado. No se envió correo al inquilino.",
                duration: 6000,
            })
        } catch (err: unknown) {
            toast.error("No se pudo crear el acceso", {
                description: (err as { message?: string })?.message,
            })
        } finally {
            setLoading(false)
        }
    }

    const handleContractSubmit = async (data: ContractInsert | ContractUpdate) => {
        try {
            if (contractDialogMode === "create" && tenant) {
                await createContract({
                    ...(data as ContractInsert),
                    tenant_id: tenant.id,
                })
            } else if (contractDialogMode === "renew" && selectedContract && tenant) {
                await renewContract(selectedContract.id, {
                    ...(data as ContractInsert),
                    tenant_id: tenant.id,
                })
            } else if (contractDialogMode === "edit" && selectedContract) {
                await updateContract(selectedContract.id, data as ContractUpdate)
            }
            if (tenant) await fetchTenantContracts(tenant.id)
            onContractsUpdated?.()
        } catch (error) {
            console.error("Error saving contract from tenant dialog:", error)
        }
    }

    const isView = mode === "view"
    const isEdit = mode === "edit"
    const isCreate = mode === "create"

    // Filter units based on selected property (create mode)
    const selectedProperty = properties.find((p) => p.id === selectedPropertyId)
    const availableUnits = selectedProperty?.units?.filter((u) => u.status === "vacant") || []

    const parsedBirthDate = birthDate ? parseLocalDate(birthDate) : null
    const formattedBirthDate =
        parsedBirthDate && isValid(parsedBirthDate)
            ? format(parsedBirthDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
            : null
    const calculatedAge =
        parsedBirthDate && isValid(parsedBirthDate)
            ? differenceInYears(new Date(), parsedBirthDate)
            : null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <TooltipProvider delayDuration={200}>
                <DialogContent className="sm:max-w-[920px] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
                    {/* Fixed Header */}
                    <DialogHeader className="px-6 py-4 border-b bg-muted/20 shrink-0 text-left">
                        {isCreate ? (
                            <div className="flex items-center gap-3 pr-8">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg">
                                        Registrar Nuevo Inquilino
                                    </DialogTitle>
                                    <DialogDescription className="text-xs mt-0.5">
                                        Completa los datos personales y asigna su contrato inicial.
                                    </DialogDescription>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center shrink-0 ring-1 ring-primary/15">
                                        {getInitials(name || tenant?.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <DialogTitle className="text-lg truncate">
                                                {name || tenant?.name || "Inquilino"}
                                            </DialogTitle>
                                            <Badge
                                                variant="outline"
                                                className={`text-[11px] font-medium ${
                                                    status === "solvent"
                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                                }`}
                                            >
                                                {status === "solvent" ? "Solvente" : "Moroso"}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={`text-[11px] font-medium ${
                                                    hasPortalAccess
                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                        : "bg-muted text-muted-foreground border-border"
                                                }`}
                                            >
                                                <span
                                                    className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                                                        hasPortalAccess
                                                            ? "bg-emerald-500"
                                                            : "bg-muted-foreground/50"
                                                    }`}
                                                />
                                                {hasPortalAccess ? "Con portal" : "Sin portal"}
                                            </Badge>
                                        </div>
                                        <DialogDescription asChild>
                                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                                <span className="inline-flex items-center gap-1 font-mono">
                                                    <IdCard className="h-3.5 w-3.5" />
                                                    {docId || tenant?.doc_id || "Sin documento"}
                                                </span>
                                                {activeContracts.length > 0 && (
                                                    <>
                                                        <span className="text-border">•</span>
                                                        <span className="inline-flex items-center gap-1 text-foreground font-medium tabular-nums">
                                                            {formatCurrency(totalActiveRent, "USD")}/mes
                                                            <span className="text-muted-foreground font-normal">
                                                                ({activeContracts.length}{" "}
                                                                {activeContracts.length === 1
                                                                    ? "contrato vigente"
                                                                    : "contratos vigentes"}
                                                                )
                                                            </span>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </DialogDescription>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {isView && tenant && onRegisterPayment && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => {
                                                onOpenChange(false)
                                                onRegisterPayment(tenant)
                                            }}
                                        >
                                            <DollarSign className="mr-1 h-3.5 w-3.5" />
                                            Registrar pago
                                        </Button>
                                    )}
                                    {onModeChange && isView && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => onModeChange("edit")}
                                        >
                                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                            Editar
                                        </Button>
                                    )}
                                    {onModeChange && isEdit && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => onModeChange("view")}
                                        >
                                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                                            Ver ficha
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    {/* Body */}
                    {isCreate ? (
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* Col 1: Tenant Personal Info */}
                                <div className="rounded-lg border bg-card p-4 space-y-4">
                                    <div className="flex items-center gap-2 pb-1 border-b">
                                        <User className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-semibold">
                                            Datos del Inquilino
                                        </h3>
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="create-name" className="text-xs">
                                            Nombre Completo *
                                        </Label>
                                        <Input
                                            id="create-name"
                                            placeholder="Ej. Carlos Ruiz"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="create-docId" className="text-xs">
                                                Cédula / RIF *
                                            </Label>
                                            <Input
                                                id="create-docId"
                                                placeholder="V-12345678"
                                                value={docId}
                                                onChange={(e) => setDocId(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="create-birthDate" className="text-xs">
                                                Nacimiento (Opcional)
                                            </Label>
                                            <Input
                                                id="create-birthDate"
                                                type="date"
                                                value={birthDate}
                                                onChange={(e) => setBirthDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="create-phone" className="text-xs">
                                                Teléfono
                                            </Label>
                                            <Input
                                                id="create-phone"
                                                placeholder="+58 412 1234567"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="create-email" className="text-xs">
                                                Correo Electrónico
                                            </Label>
                                            <Input
                                                id="create-email"
                                                type="email"
                                                placeholder="correo@ejemplo.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Col 2: Initial Contract */}
                                <div className="rounded-lg border bg-card p-4 space-y-4">
                                    <div className="flex items-center gap-2 pb-1 border-b">
                                        <FileText className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-semibold">Contrato Inicial</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label className="text-xs">Inmueble *</Label>
                                            <Select
                                                value={selectedPropertyId}
                                                onValueChange={(val) => {
                                                    setSelectedPropertyId(val)
                                                    setSelectedUnitId("")
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione inmueble" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {properties.map((prop) => (
                                                        <SelectItem key={prop.id} value={prop.id}>
                                                            {prop.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label className="text-xs">Unidad (Vacantes) *</Label>
                                            <Select
                                                value={selectedUnitId}
                                                onValueChange={(unitId) => {
                                                    setSelectedUnitId(unitId)
                                                    const picked = availableUnits.find(
                                                        (u) => u.id === unitId
                                                    )
                                                    if (
                                                        picked?.default_rent_amount &&
                                                        !rentAmount
                                                    ) {
                                                        setRentAmount(
                                                            String(picked.default_rent_amount)
                                                        )
                                                    }
                                                }}
                                                disabled={!selectedPropertyId}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione unidad" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableUnits.length > 0 ? (
                                                        availableUnits.map((unit) => (
                                                            <SelectItem
                                                                key={unit.id}
                                                                value={unit.id}
                                                            >
                                                                {unit.name} ({unit.type})
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="none" disabled>
                                                            No hay unidades vacantes
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label className="text-xs">Tipo de Contrato</Label>
                                            <Select
                                                value={contractType}
                                                onValueChange={(val: "residential" | "commercial") =>
                                                    setContractType(val)
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="residential">
                                                        Residencial
                                                    </SelectItem>
                                                    <SelectItem value="commercial">
                                                        Comercial
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="create-rentAmount" className="text-xs">
                                                Canon Mensual (USD) *
                                            </Label>
                                            <Input
                                                id="create-rentAmount"
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                className="tabular-nums"
                                                value={rentAmount}
                                                onChange={(e) => setRentAmount(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="create-startDate" className="text-xs">
                                                Fecha Inicio *
                                            </Label>
                                            <Input
                                                id="create-startDate"
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label
                                                    htmlFor="create-endDate"
                                                    className={`text-xs ${
                                                        isIndefinite ? "text-muted-foreground" : ""
                                                    }`}
                                                >
                                                    Fecha Fin {!isIndefinite && "*"}
                                                </Label>
                                                <div className="flex items-center space-x-1.5">
                                                    <Checkbox
                                                        id="tenant-indefinite"
                                                        checked={isIndefinite}
                                                        onCheckedChange={(checked) => {
                                                            setIsIndefinite(checked === true)
                                                            if (checked === true) setEndDate("")
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor="tenant-indefinite"
                                                        className="text-[11px] font-medium leading-none cursor-pointer"
                                                    >
                                                        Indefinido
                                                    </label>
                                                </div>
                                            </div>
                                            <Input
                                                id="create-endDate"
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                disabled={isIndefinite}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            {/* Fixed Tabs Navigation */}
                            <div className="px-6 pt-3 pb-3 border-b bg-background shrink-0">
                                <TabsList className="grid w-full grid-cols-5 h-9">
                                    <TabsTrigger
                                        value="info"
                                        className="text-xs gap-1.5 data-[state=active]:shadow-xs"
                                    >
                                        <User className="h-3.5 w-3.5 hidden sm:inline" />
                                        <span>Info</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="contracts"
                                        className="text-xs gap-1.5 data-[state=active]:shadow-xs"
                                    >
                                        <FileText className="h-3.5 w-3.5 hidden sm:inline" />
                                        <span>Contratos</span>
                                        {tenantContracts.length > 0 && (
                                            <span className="ml-0.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[10px] font-semibold tabular-nums">
                                                {tenantContracts.length}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="contacts"
                                        className="text-xs gap-1.5 data-[state=active]:shadow-xs"
                                    >
                                        <Users className="h-3.5 w-3.5 hidden sm:inline" />
                                        <span>Contactos</span>
                                        {contacts.length > 0 && (
                                            <span className="ml-0.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[10px] font-semibold tabular-nums">
                                                {contacts.length}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="payments"
                                        className="text-xs gap-1.5 data-[state=active]:shadow-xs"
                                    >
                                        <CreditCard className="h-3.5 w-3.5 hidden sm:inline" />
                                        <span>Pagos</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="access"
                                        className="text-xs gap-1.5 data-[state=active]:shadow-xs"
                                    >
                                        <KeyRound className="h-3.5 w-3.5 hidden sm:inline" />
                                        <span>Acceso</span>
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                hasPortalAccess
                                                    ? "bg-emerald-500"
                                                    : "bg-amber-500"
                                            }`}
                                        />
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Scrollable Tab Panels */}
                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                {/* TAB: INFO */}
                                <TabsContent value="info" className="mt-0 space-y-5">
                                    {isView ? (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Identity Panel */}
                                                <div className="rounded-lg border bg-card p-4 space-y-3.5">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                        <User className="h-3.5 w-3.5" />
                                                        Identidad
                                                    </h4>
                                                    <div className="space-y-3 text-sm">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Nombre completo
                                                            </p>
                                                            <p className="font-medium mt-0.5">
                                                                {name || "—"}
                                                            </p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Cédula / RIF
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="font-mono font-medium">
                                                                        {docId || "—"}
                                                                    </span>
                                                                    {docId && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleCopy(
                                                                                    docId,
                                                                                    "doc",
                                                                                    "Documento"
                                                                                )
                                                                            }
                                                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                                                            title="Copiar documento"
                                                                        >
                                                                            {copiedKey === "doc" ? (
                                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                                            ) : (
                                                                                <Copy className="h-3.5 w-3.5" />
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Estado
                                                                </p>
                                                                <div className="mt-1">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-[11px] font-medium ${
                                                                            status === "solvent"
                                                                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                                                        }`}
                                                                    >
                                                                        {status === "solvent"
                                                                            ? "Solvente"
                                                                            : "Moroso"}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Fecha de nacimiento
                                                            </p>
                                                            <p className="font-medium mt-0.5 flex items-center gap-2">
                                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                                {formattedBirthDate ? (
                                                                    <span>
                                                                        {formattedBirthDate}
                                                                        {calculatedAge !== null &&
                                                                            calculatedAge >= 0 && (
                                                                                <span className="text-muted-foreground font-normal ml-1.5">
                                                                                    ({calculatedAge}{" "}
                                                                                    años)
                                                                                </span>
                                                                            )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground font-normal">
                                                                        No registrada
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Contact Panel */}
                                                <div className="rounded-lg border bg-card p-4 space-y-3.5">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        Contacto
                                                    </h4>
                                                    <div className="space-y-3 text-sm">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Correo electrónico
                                                            </p>
                                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                                {email ? (
                                                                    <>
                                                                        <a
                                                                            href={`mailto:${email}`}
                                                                            className="font-medium hover:underline truncate inline-flex items-center gap-1.5"
                                                                        >
                                                                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                            <span className="truncate">
                                                                                {email}
                                                                            </span>
                                                                        </a>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 shrink-0"
                                                                            onClick={() =>
                                                                                handleCopy(
                                                                                    email,
                                                                                    "email",
                                                                                    "Correo"
                                                                                )
                                                                            }
                                                                        >
                                                                            {copiedKey ===
                                                                            "email" ? (
                                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                                            ) : (
                                                                                <Copy className="h-3.5 w-3.5" />
                                                                            )}
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-muted-foreground">
                                                                        No registrado
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Teléfono principal
                                                            </p>
                                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                                {phone ? (
                                                                    <>
                                                                        <a
                                                                            href={`tel:${phone}`}
                                                                            className="font-medium hover:underline inline-flex items-center gap-1.5 tabular-nums"
                                                                        >
                                                                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                            {phone}
                                                                        </a>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 shrink-0"
                                                                            onClick={() =>
                                                                                handleCopy(
                                                                                    phone,
                                                                                    "phone",
                                                                                    "Teléfono"
                                                                                )
                                                                            }
                                                                        >
                                                                            {copiedKey ===
                                                                            "phone" ? (
                                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                                            ) : (
                                                                                <Copy className="h-3.5 w-3.5" />
                                                                            )}
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-muted-foreground">
                                                                        No registrado
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="pt-1 border-t flex items-center justify-between">
                                                            <span className="text-xs text-muted-foreground">
                                                                Contactos adicionales:{" "}
                                                                <strong className="text-foreground tabular-nums">
                                                                    {contacts.length}
                                                                </strong>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setActiveTab("contacts")
                                                                }
                                                                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                                                            >
                                                                Ver contactos
                                                                <ArrowRight className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Active Rentals Quick Summary */}
                                            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                        <Building2 className="h-3.5 w-3.5" />
                                                        Contratos Vigentes
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab("contracts")}
                                                        className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                                                    >
                                                        Gestionar contratos ({tenantContracts.length})
                                                        <ArrowRight className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                {loadingContracts ? (
                                                    <Skeleton className="h-12 w-full" />
                                                ) : activeContracts.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        Este inquilino no tiene contratos vigentes
                                                        actualmente.
                                                    </p>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        {activeContracts.map((c) => (
                                                            <div
                                                                key={c.id}
                                                                className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2.5"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium truncate">
                                                                        {c.units?.properties?.name ||
                                                                            "Inmueble"}{" "}
                                                                        — {c.units?.name || "Unidad"}
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {format(
                                                                            parseLocalDate(
                                                                                c.start_date
                                                                            ),
                                                                            "dd MMM yyyy",
                                                                            { locale: es }
                                                                        )}{" "}
                                                                        →{" "}
                                                                        {c.end_date
                                                                            ? format(
                                                                                  parseLocalDate(
                                                                                      c.end_date
                                                                                  ),
                                                                                  "dd MMM yyyy",
                                                                                  { locale: es }
                                                                              )
                                                                            : "Indefinido"}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-sm font-semibold tabular-nums">
                                                                        {formatCurrency(
                                                                            Number(
                                                                                c.rent_amount || 0
                                                                            ),
                                                                            "USD"
                                                                        )}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        mensual
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        /* EDIT MODE FORM */
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="rounded-lg border bg-card p-4 space-y-4">
                                                <div className="flex items-center gap-2 pb-1.5 border-b">
                                                    <User className="h-4 w-4 text-primary" />
                                                    <h4 className="text-sm font-semibold">
                                                        Identidad y Estado
                                                    </h4>
                                                </div>

                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="edit-name" className="text-xs">
                                                        Nombre Completo *
                                                    </Label>
                                                    <Input
                                                        id="edit-name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder="Nombre completo del inquilino"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="grid gap-1.5">
                                                        <Label
                                                            htmlFor="edit-docId"
                                                            className="text-xs"
                                                        >
                                                            Cédula / RIF *
                                                        </Label>
                                                        <Input
                                                            id="edit-docId"
                                                            value={docId}
                                                            onChange={(e) =>
                                                                setDocId(e.target.value)
                                                            }
                                                            placeholder="V-12345678"
                                                        />
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <Label
                                                            htmlFor="edit-birthDate"
                                                            className="text-xs"
                                                        >
                                                            Fecha de Nacimiento
                                                        </Label>
                                                        <Input
                                                            id="edit-birthDate"
                                                            type="date"
                                                            value={birthDate}
                                                            onChange={(e) =>
                                                                setBirthDate(e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid gap-1.5">
                                                    <Label className="text-xs">
                                                        Estado de Solvencia
                                                    </Label>
                                                    <Select
                                                        value={status}
                                                        onValueChange={(val: TenantStatus) =>
                                                            setStatus(val)
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="solvent">
                                                                <span className="inline-flex items-center gap-2">
                                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                                    Solvente
                                                                </span>
                                                            </SelectItem>
                                                            <SelectItem value="delinquent">
                                                                <span className="inline-flex items-center gap-2">
                                                                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                                                                    Moroso
                                                                </span>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border bg-card p-4 space-y-4">
                                                <div className="flex items-center gap-2 pb-1.5 border-b">
                                                    <Phone className="h-4 w-4 text-primary" />
                                                    <h4 className="text-sm font-semibold">
                                                        Datos de Contacto
                                                    </h4>
                                                </div>

                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="edit-phone" className="text-xs">
                                                        Teléfono Principal
                                                    </Label>
                                                    <div className="relative">
                                                        <Phone className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                                        <Input
                                                            id="edit-phone"
                                                            className="pl-9"
                                                            value={phone}
                                                            onChange={(e) =>
                                                                setPhone(e.target.value)
                                                            }
                                                            placeholder="+58 412 1234567"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="edit-email" className="text-xs">
                                                        Correo Electrónico
                                                    </Label>
                                                    <div className="relative">
                                                        <Mail className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                                        <Input
                                                            id="edit-email"
                                                            type="email"
                                                            className="pl-9"
                                                            value={email}
                                                            onChange={(e) =>
                                                                setEmail(e.target.value)
                                                            }
                                                            placeholder="correo@ejemplo.com"
                                                        />
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {hasPortalAccess
                                                            ? "Este correo se utiliza para notificaciones y acceso al portal."
                                                            : "Necesario para enviar recibos y habilitar acceso al portal."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* TAB: CONTRACTS */}
                                <TabsContent value="contracts" className="mt-0 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h4 className="text-sm font-medium">
                                                Contratos Asociados
                                            </h4>
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                {activeContracts.length}{" "}
                                                {activeContracts.length === 1
                                                    ? "vigente"
                                                    : "vigentes"}{" "}
                                                · {tenantContracts.length - activeContracts.length}{" "}
                                                histórico(s)
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => {
                                                setContractDialogMode("create")
                                                setSelectedContract(undefined)
                                                setIsContractDialogOpen(true)
                                            }}
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            Asignar Inmueble / Contrato
                                        </Button>
                                    </div>

                                    {loadingContracts ? (
                                        <div className="space-y-3">
                                            <Skeleton className="h-24 w-full rounded-lg" />
                                            <Skeleton className="h-24 w-full rounded-lg" />
                                        </div>
                                    ) : tenantContracts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center border rounded-lg border-dashed bg-muted/20">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2.5">
                                                <FileText className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm font-medium">
                                                No hay contratos registrados
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Asigna un inmueble disponible para crear el primer
                                                contrato.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {tenantContracts.map((contract) => {
                                                const badge = getContractStatusBadge(
                                                    contract.status
                                                )
                                                const daysLeft =
                                                    contract.end_date &&
                                                    contract.status === "active"
                                                        ? differenceInCalendarDays(
                                                              parseLocalDate(contract.end_date),
                                                              new Date()
                                                          )
                                                        : null
                                                const isExpiringSoon =
                                                    daysLeft !== null &&
                                                    daysLeft >= 0 &&
                                                    daysLeft <= 30

                                                return (
                                                    <div
                                                        key={contract.id}
                                                        className={`rounded-lg border p-4 transition-colors ${
                                                            contract.status === "active"
                                                                ? "bg-card"
                                                                : "bg-muted/20 opacity-90"
                                                        }`}
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                            <div className="space-y-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                    <span className="font-semibold text-sm">
                                                                        {contract.units?.properties
                                                                            ?.name || "Inmueble"}{" "}
                                                                        —{" "}
                                                                        {contract.units?.name ||
                                                                            "Unidad"}
                                                                    </span>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-[11px] font-medium ${badge.className}`}
                                                                    >
                                                                        {badge.label}
                                                                    </Badge>
                                                                    {contract.type && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[11px] font-normal text-muted-foreground"
                                                                        >
                                                                            {contract.type ===
                                                                            "commercial"
                                                                                ? "Comercial"
                                                                                : "Residencial"}
                                                                        </Badge>
                                                                    )}
                                                                    {isExpiringSoon && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                                                        >
                                                                            Vence en {daysLeft}d
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground pt-1">
                                                                    <span>
                                                                        Inicio:{" "}
                                                                        <strong className="text-foreground font-medium">
                                                                            {format(
                                                                                parseLocalDate(
                                                                                    contract.start_date
                                                                                ),
                                                                                "dd MMM yyyy",
                                                                                { locale: es }
                                                                            )}
                                                                        </strong>
                                                                    </span>
                                                                    <span>
                                                                        Fin:{" "}
                                                                        <strong className="text-foreground font-medium">
                                                                            {contract.end_date
                                                                                ? format(
                                                                                      parseLocalDate(
                                                                                          contract.end_date
                                                                                      ),
                                                                                      "dd MMM yyyy",
                                                                                      { locale: es }
                                                                                  )
                                                                                : "Indefinido"}
                                                                        </strong>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="sm:text-right shrink-0">
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    Canon mensual
                                                                </p>
                                                                <p className="text-base font-semibold tabular-nums">
                                                                    {contract.rent_amount != null
                                                                        ? formatCurrency(
                                                                              Number(
                                                                                  contract.rent_amount
                                                                              ),
                                                                              "USD"
                                                                          )
                                                                        : "—"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-3 border-t">
                                                            <Link
                                                                href={`/contracts?view=${contract.id}`}
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 text-xs"
                                                                >
                                                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                                                    Ver Detalles
                                                                </Button>
                                                            </Link>
                                                            {(contract.status === "active" ||
                                                                contract.status === "expired") && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 text-xs"
                                                                    onClick={() => {
                                                                        setSelectedContract(
                                                                            contract
                                                                        )
                                                                        setContractDialogMode(
                                                                            "renew"
                                                                        )
                                                                        setIsContractDialogOpen(
                                                                            true
                                                                        )
                                                                    }}
                                                                >
                                                                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                                                    Renovar
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={() => {
                                                                    setSelectedContract(contract)
                                                                    setContractDialogMode("edit")
                                                                    setIsContractDialogOpen(true)
                                                                }}
                                                            >
                                                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                                                Editar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* TAB: CONTACTS */}
                                <TabsContent value="contacts" className="mt-0 space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <h4 className="text-sm font-medium">
                                                Personas de Contacto
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                Familiares, socios o encargados autorizados para
                                                comunicación.
                                            </p>
                                        </div>
                                        {!isView && (
                                            <Button
                                                size="sm"
                                                variant={showAddContact ? "secondary" : "default"}
                                                className="h-8 text-xs"
                                                onClick={() => setShowAddContact((v) => !v)}
                                            >
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                {showAddContact ? "Ocultar formulario" : "Nuevo contacto"}
                                            </Button>
                                        )}
                                    </div>

                                    {!isView && showAddContact && (
                                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                                <Input
                                                    placeholder="Nombre completo *"
                                                    value={newContact.name}
                                                    onChange={(e) =>
                                                        setNewContact({
                                                            ...newContact,
                                                            name: e.target.value,
                                                        })
                                                    }
                                                />
                                                <Select
                                                    value={newContact.relation}
                                                    onValueChange={(
                                                        v: TenantContact["relation"]
                                                    ) =>
                                                        setNewContact({
                                                            ...newContact,
                                                            relation: v,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Relación" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="family">
                                                            Familiar
                                                        </SelectItem>
                                                        <SelectItem value="partner">
                                                            Pareja
                                                        </SelectItem>
                                                        <SelectItem value="worker">
                                                            Trabajador
                                                        </SelectItem>
                                                        <SelectItem value="other">Otro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    placeholder="Teléfono"
                                                    value={newContact.phone}
                                                    onChange={(e) =>
                                                        setNewContact({
                                                            ...newContact,
                                                            phone: e.target.value,
                                                        })
                                                    }
                                                />
                                                <Input
                                                    type="email"
                                                    placeholder="Correo electrónico"
                                                    value={newContact.email}
                                                    onChange={(e) =>
                                                        setNewContact({
                                                            ...newContact,
                                                            email: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() => setShowAddContact(false)}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={handleAddContact}
                                                    disabled={
                                                        !newContact.name.trim() || loadingContacts
                                                    }
                                                >
                                                    {loadingContacts && (
                                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                    )}
                                                    Guardar contacto
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-lg border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableHead className="text-xs">Nombre</TableHead>
                                                    <TableHead className="text-xs">Relación</TableHead>
                                                    <TableHead className="text-xs">Teléfono</TableHead>
                                                    <TableHead className="text-xs">Correo</TableHead>
                                                    {!isView && (
                                                        <TableHead className="text-xs text-right w-[64px]">
                                                            Acciones
                                                        </TableHead>
                                                    )}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loadingContacts ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={isView ? 4 : 5}
                                                            className="p-3"
                                                        >
                                                            <div className="space-y-2">
                                                                <Skeleton className="h-8 w-full" />
                                                                <Skeleton className="h-8 w-full" />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : contacts.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={isView ? 4 : 5}
                                                            className="text-center py-8 text-xs text-muted-foreground"
                                                        >
                                                            Sin contactos adicionales registrados.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    contacts.map((contact) => {
                                                        const relMeta =
                                                            RELATION_META[contact.relation] ||
                                                            RELATION_META.other
                                                        return (
                                                            <TableRow
                                                                key={contact.id}
                                                                className="hover:bg-muted/30"
                                                            >
                                                                <TableCell className="font-medium text-sm">
                                                                    {contact.name}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-[11px] font-medium ${relMeta.className}`}
                                                                    >
                                                                        {relMeta.label}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-xs tabular-nums">
                                                                    {contact.phone ? (
                                                                        <a
                                                                            href={`tel:${contact.phone}`}
                                                                            className="hover:underline"
                                                                        >
                                                                            {contact.phone}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-xs">
                                                                    {contact.email ? (
                                                                        <a
                                                                            href={`mailto:${contact.email}`}
                                                                            className="hover:underline"
                                                                        >
                                                                            {contact.email}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                {!isView && (
                                                                    <TableCell className="text-right">
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                                                    onClick={() =>
                                                                                        handleDeleteContact(
                                                                                            contact.id
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                Eliminar contacto
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                )}
                                                            </TableRow>
                                                        )
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>

                                {/* TAB: PAYMENTS */}
                                <TabsContent value="payments" className="mt-0">
                                    {tenant && <PaymentHistoryList tenantId={tenant.id} />}
                                </TabsContent>

                                {/* TAB: ACCESS */}
                                <TabsContent value="access" className="mt-0 space-y-4">
                                    <div className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                                                    hasPortalAccess
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                }`}
                                            >
                                                {hasPortalAccess ? (
                                                    <ShieldCheck className="h-5 w-5" />
                                                ) : (
                                                    <ShieldAlert className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {hasPortalAccess
                                                        ? "Acceso al portal activo"
                                                        : "Sin acceso al portal"}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Usuario:{" "}
                                                    <span className="font-medium text-foreground">
                                                        {email || "No hay correo registrado"}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <Badge
                                            variant="outline"
                                            className={`w-fit text-xs ${
                                                hasPortalAccess
                                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                            }`}
                                        >
                                            {hasPortalAccess ? "Habilitado" : "Pendiente"}
                                        </Badge>
                                    </div>

                                    {isView ? (
                                        <div className="rounded-lg border border-dashed bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <p className="text-xs text-muted-foreground">
                                                Para crear el acceso o gestionar contraseñas, cambia
                                                al modo de edición.
                                            </p>
                                            {onModeChange && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs shrink-0"
                                                    onClick={() => onModeChange("edit")}
                                                >
                                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                                    Habilitar edición
                                                </Button>
                                            )}
                                        </div>
                                    ) : !hasPortalAccess ? (
                                        <div className="rounded-lg border border-dashed bg-muted/20 p-4 space-y-3.5">
                                            <div>
                                                <h4 className="text-sm font-medium">
                                                    Habilitar acceso al portal de inquilinos
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {email
                                                        ? "El inquilino podrá iniciar sesión para reportar pagos y descargar recibos."
                                                        : "Primero registra un correo electrónico en la pestaña Info y guarda los cambios."}
                                                </p>
                                            </div>

                                            {email && (
                                                <>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id="sendAccessEmail"
                                                            checked={sendAccessEmail}
                                                            onCheckedChange={(checked) =>
                                                                setSendAccessEmail(checked === true)
                                                            }
                                                        />
                                                        <label
                                                            htmlFor="sendAccessEmail"
                                                            className="text-xs font-medium cursor-pointer"
                                                        >
                                                            Enviar credenciales por correo al
                                                            inquilino
                                                        </label>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleCreateAccess}
                                                        disabled={loading}
                                                    >
                                                        {loading && (
                                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                        )}
                                                        Crear Acceso al Portal
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border bg-card p-4 space-y-4">
                                            <div>
                                                <h4 className="text-sm font-medium">
                                                    Gestión de Contraseña
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Asigna una contraseña manualmente o envía una
                                                    nueva generada por correo electrónico.
                                                </p>
                                            </div>

                                            {showManualPassword ? (
                                                <div className="rounded-md bg-muted/40 border p-3.5 space-y-3">
                                                    <Label
                                                        htmlFor="manual-password"
                                                        className="text-xs"
                                                    >
                                                        Nueva Contraseña Manual
                                                    </Label>
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative flex-1">
                                                            <Input
                                                                id="manual-password"
                                                                type={
                                                                    showPasswordChars
                                                                        ? "text"
                                                                        : "password"
                                                                }
                                                                value={manualPassword}
                                                                onChange={(e) =>
                                                                    setManualPassword(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Escriba o genere una contraseña"
                                                                className="pr-16 font-mono text-sm"
                                                            />
                                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() =>
                                                                        setShowPasswordChars(
                                                                            (v) => !v
                                                                        )
                                                                    }
                                                                    title={
                                                                        showPasswordChars
                                                                            ? "Ocultar"
                                                                            : "Mostrar"
                                                                    }
                                                                >
                                                                    {showPasswordChars ? (
                                                                        <EyeOff className="h-3.5 w-3.5" />
                                                                    ) : (
                                                                        <Eye className="h-3.5 w-3.5" />
                                                                    )}
                                                                </Button>
                                                                {manualPassword && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        onClick={() =>
                                                                            handleCopy(
                                                                                manualPassword,
                                                                                "pwd",
                                                                                "Contraseña"
                                                                            )
                                                                        }
                                                                        title="Copiar contraseña"
                                                                    >
                                                                        {copiedKey === "pwd" ? (
                                                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                                        ) : (
                                                                            <Copy className="h-3.5 w-3.5" />
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="shrink-0 text-xs"
                                                            onClick={() => {
                                                                setManualPassword(
                                                                    generateSecurePassword()
                                                                )
                                                                setShowPasswordChars(true)
                                                            }}
                                                        >
                                                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                                            Generar
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 text-xs"
                                                            onClick={() => {
                                                                setShowManualPassword(false)
                                                                setManualPassword("")
                                                            }}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            className="h-8 text-xs"
                                                            onClick={handleManualPassword}
                                                            disabled={!manualPassword || loading}
                                                        >
                                                            {loading && (
                                                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                            )}
                                                            Actualizar contraseña
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowManualPassword(true)}
                                                        disabled={!email || loading}
                                                    >
                                                        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                                                        Establecer Contraseña Manual
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/20"
                                                        onClick={handleResetPassword}
                                                        disabled={!email || loading}
                                                    >
                                                        <Mail className="mr-1.5 h-3.5 w-3.5" />
                                                        Resetear y Enviar por Correo
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}

                    {/* Fixed Footer */}
                    <DialogFooter className="px-6 py-3.5 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-2 sm:justify-between">
                        <div className="text-xs text-muted-foreground hidden sm:block">
                            {isEdit &&
                                activeTab !== "info" &&
                                "Los cambios en esta pestaña se guardan de forma inmediata."}
                            {isEdit &&
                                activeTab === "info" &&
                                "Recuerda guardar después de modificar los datos personales."}
                            {isCreate && "Los campos marcados con * son obligatorios."}
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            {isView ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cerrar
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onOpenChange(false)}
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    {(isCreate || activeTab === "info") && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleSubmit}
                                            disabled={loading}
                                        >
                                            {loading && (
                                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                            )}
                                            {isCreate
                                                ? "Registrar Inquilino"
                                                : "Guardar Datos Personales"}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </TooltipProvider>

            <ContractDialog
                open={isContractDialogOpen}
                onOpenChange={setIsContractDialogOpen}
                mode={contractDialogMode}
                contract={selectedContract}
                properties={properties}
                tenants={tenant ? [tenant] : []}
                onSubmit={handleContractSubmit}
            />

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restablecer contraseña?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se generará una nueva contraseña para{" "}
                            <span className="font-medium text-foreground">{email}</span> y se
                            enviará por correo electrónico al inquilino.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingAction) pendingAction()
                            }}
                        >
                            Restablecer y enviar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    )
}
