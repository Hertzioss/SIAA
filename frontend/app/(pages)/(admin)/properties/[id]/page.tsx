'use client'

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
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
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
    Tooltip as UiTooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
    Building2,
    MapPin,
    Users,
    DollarSign,
    ArrowLeft,
    Pencil,
    Plus,
    Search,
    CheckCircle2,
    AlertTriangle,
    Clock,
    ChevronLeft,
    ChevronRight,
    FileText,
    Mail,
    Phone,
    Trash2,
    Wrench,
    Receipt,
    LayoutDashboard,
    DoorOpen,
    Layers,
    Maximize2,
    X,
    ExternalLink,
    Loader2,
} from "lucide-react"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
} from "recharts"
import { differenceInCalendarDays, format, isValid } from "date-fns"
import { usePropertyDetails, UnitSummary } from "@/hooks/use-property-details"
import { useExpenses } from "@/hooks/use-expenses"
import { useMaintenance, MaintenanceRequest } from "@/hooks/use-maintenance"
import { supabase } from "@/lib/supabase"
import { useProperties } from "@/hooks/use-properties"
import { useContracts } from "@/hooks/use-contracts"
import { PropertyDialog } from "@/components/properties/property-dialog"
import { ExpenseCategory, ExpenseStatus } from "@/types/expense"
import { fetchBcvRate } from "@/services/exchange-rate"
import { formatCurrency, parseLocalDate } from "@/lib/utils"

const UNIT_TYPE_LABELS: Record<string, string> = {
    apartment: "Apartamento",
    office: "Oficina",
    local: "Local",
    storage: "Bodega / Depósito",
}

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    maintenance: "Mantenimiento",
    utilities: "Servicios (Agua / Luz)",
    tax: "Impuestos",
    other: "Otros",
}

const PRIORITY_META: Record<
    MaintenanceRequest["priority"],
    { label: string; className: string }
> = {
    low: {
        label: "Baja",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    },
    medium: {
        label: "Media",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    high: {
        label: "Alta",
        className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    },
    urgent: {
        label: "Urgente",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    },
}

type UnitFilterStatus = "all" | "Ocupado" | "Vacante" | "Vencido" | "Mantenimiento"

function getUnitStatusBadge(status: UnitSummary["status"]) {
    switch (status) {
        case "Ocupado":
            return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
        case "Vacante":
            return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
        case "Vencido":
            return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
        case "Mantenimiento":
            return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
    }
}

/**
 * Página de detalle de un inmueble específico.
 * Muestra ficha, propietarios, KPIs, alertas reales, unidades, inquilinos, gastos y mantenimiento.
 */
export default function PropertyDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const propertyId = params.id as string

    const { propertyTypes, updateProperty } = useProperties()
    const { updateContract } = useContracts({ autoFetch: false })

    const { property, units, tenants, stats, loading, refresh } =
        usePropertyDetails(propertyId)

    const {
        expenses: allExpenses,
        loading: loadingExpenses,
        createExpense,
        deleteExpense,
    } = useExpenses()

    const propertyExpenses = useMemo(
        () => allExpenses.filter((e) => e.property_id === propertyId),
        [allExpenses, propertyId]
    )

    const {
        requests,
        loading: loadingMaintenance,
        createRequest,
        updateRequestStatus,
        deleteRequest,
    } = useMaintenance(propertyId)

    const openRequestsCount = useMemo(
        () => requests.filter((r) => r.status === "open" || r.status === "in_progress").length,
        [requests]
    )

    // UI State
    const [activeTab, setActiveTab] = useState("overview")
    const [isEditPropertyDialogOpen, setIsEditPropertyDialogOpen] = useState(false)

    // Unit Dialog State (Create & Edit)
    const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false)
    const [unitDialogMode, setUnitDialogMode] = useState<"create" | "edit">("create")
    const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
    const [savingUnit, setSavingUnit] = useState(false)
    const [unitName, setUnitName] = useState("")
    const [unitType, setUnitType] = useState("apartment")
    const [unitStatus, setUnitStatus] = useState("vacant")
    const [unitArea, setUnitArea] = useState("")
    const [unitRent, setUnitRent] = useState("")
    const [unitFloor, setUnitFloor] = useState("")

    // Expense Dialog State
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
    const [savingExpense, setSavingExpense] = useState(false)
    const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("maintenance")
    const [expenseDescription, setExpenseDescription] = useState("")
    const [expenseAmount, setExpenseAmount] = useState("")
    const [expenseDate, setExpenseDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
    const [expenseStatus, setExpenseStatus] = useState<ExpenseStatus>("pending")
    const [currency, setCurrency] = useState<"USD" | "Bs">("USD")
    const [exchangeRate, setExchangeRate] = useState<number>(0)

    // Maintenance Dialog State
    const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false)
    const [savingMaintenance, setSavingMaintenance] = useState(false)
    const [maintenanceTitle, setMaintenanceTitle] = useState("")
    const [maintenanceDescription, setMaintenanceDescription] = useState("")
    const [maintenancePriority, setMaintenancePriority] =
        useState<MaintenanceRequest["priority"]>("medium")
    const [maintenanceUnitId, setMaintenanceUnitId] = useState("common")

    // Confirm Dialogs
    const [confirmState, setConfirmState] = useState<{
        open: boolean
        title: string
        description: string
        confirmLabel: string
        onConfirm: () => Promise<void>
    } | null>(null)

    // Units & Tenants Filters / Pagination
    const [unitSearch, setUnitSearch] = useState("")
    const [unitStatusFilter, setUnitStatusFilter] = useState<UnitFilterStatus>("all")
    const [currentUnitsPage, setCurrentUnitsPage] = useState(1)
    const [currentTenantsPage, setCurrentTenantsPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    useEffect(() => {
        const loadRate = async () => {
            const rate = await fetchBcvRate()
            if (rate) setExchangeRate(rate)
        }
        loadRate()
    }, [])

    const openCreateUnit = () => {
        setUnitDialogMode("create")
        setEditingUnitId(null)
        setUnitName("")
        setUnitType("apartment")
        setUnitStatus("vacant")
        setUnitArea("")
        setUnitRent("")
        setUnitFloor("")
        setIsUnitDialogOpen(true)
    }

    const openEditUnit = (unit: UnitSummary) => {
        setUnitDialogMode("edit")
        setEditingUnitId(unit.id)
        setUnitName(unit.name)
        setUnitType(unit.type || "apartment")
        setUnitStatus(unit.rawStatus || "vacant")
        setUnitArea(unit.area != null ? String(unit.area) : "")
        setUnitRent(unit.defaultRent != null ? String(unit.defaultRent) : String(unit.rent || ""))
        setUnitFloor(unit.floor || "")
        setIsUnitDialogOpen(true)
    }

    const handleSaveUnit = async () => {
        if (!unitName.trim()) {
            toast.error("El nombre de la unidad es requerido")
            return
        }

        const payload = {
            property_id: propertyId,
            name: unitName.trim(),
            type: unitType,
            status: unitStatus,
            area: unitArea ? parseFloat(unitArea) : null,
            default_rent_amount: unitRent ? parseFloat(unitRent) : null,
            floor: unitFloor.trim() || null,
        }

        try {
            setSavingUnit(true)
            if (unitDialogMode === "create") {
                const { error } = await supabase.from("units").insert(payload)
                if (error) throw error
                toast.success("Unidad registrada exitosamente")
            } else if (editingUnitId) {
                const { error } = await supabase
                    .from("units")
                    .update(payload)
                    .eq("id", editingUnitId)
                if (error) throw error
                toast.success("Unidad actualizada exitosamente")
            }
            setIsUnitDialogOpen(false)
            refresh()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error desconocido"
            toast.error("Error al guardar unidad: " + message)
        } finally {
            setSavingUnit(false)
        }
    }

    const requestDeleteUnit = (unit: UnitSummary) => {
        setConfirmState({
            open: true,
            title: `¿Eliminar unidad "${unit.name}"?`,
            description:
                "Esta acción eliminará permanentemente la unidad y no se puede deshacer.",
            confirmLabel: "Eliminar unidad",
            onConfirm: async () => {
                const { error } = await supabase.from("units").delete().eq("id", unit.id)
                if (error) {
                    toast.error("No se pudo eliminar la unidad: " + error.message)
                    return
                }
                toast.success("Unidad eliminada")
                refresh()
            },
        })
    }

    const handleCreateExpense = async () => {
        if (!expenseDescription.trim() || !expenseAmount) {
            toast.error("Descripción y monto son requeridos")
            return
        }
        try {
            setSavingExpense(true)
            await createExpense({
                property_id: propertyId,
                category: expenseCategory,
                description: expenseDescription.trim(),
                amount: parseFloat(expenseAmount),
                currency,
                exchange_rate: exchangeRate,
                date: expenseDate,
                status: expenseStatus,
            })
            setIsExpenseDialogOpen(false)
            setExpenseDescription("")
            setExpenseAmount("")
        } finally {
            setSavingExpense(false)
        }
    }

    const handleCreateMaintenance = async () => {
        if (!maintenanceTitle.trim()) {
            toast.error("El título es requerido")
            return
        }
        try {
            setSavingMaintenance(true)
            await createRequest({
                property_id: propertyId,
                title: maintenanceTitle.trim(),
                description: maintenanceDescription.trim(),
                priority: maintenancePriority,
                status: "open",
                unit_id: maintenanceUnitId === "common" ? null : maintenanceUnitId,
            })
            setIsMaintenanceDialogOpen(false)
            setMaintenanceTitle("")
            setMaintenanceDescription("")
            setMaintenancePriority("medium")
            setMaintenanceUnitId("common")
        } finally {
            setSavingMaintenance(false)
        }
    }

    const requestTerminateContract = (contractId: string, tenantName: string) => {
        setConfirmState({
            open: true,
            title: "¿Finalizar contrato?",
            description: `El contrato de ${tenantName} se marcará como finalizado con fecha de hoy.`,
            confirmLabel: "Finalizar contrato",
            onConfirm: async () => {
                await updateContract(contractId, {
                    status: "terminated",
                    end_date: format(new Date(), "yyyy-MM-dd"),
                })
                refresh()
            },
        })
    }

    // Derived Alerts for Overview
    const propertyAlerts = useMemo(() => {
        const alerts: {
            id: string
            severity: "rose" | "amber" | "blue"
            title: string
            detail: string
            targetTab: string
        }[] = []

        const expiredTenants = tenants.filter((t) => t.status === "Vencido")
        if (expiredTenants.length > 0) {
            alerts.push({
                id: "expired-contracts",
                severity: "rose",
                title: `${expiredTenants.length} ${expiredTenants.length === 1 ? "contrato vencido" : "contratos vencidos"}`,
                detail: expiredTenants.map((t) => `${t.unit} (${t.name})`).join(", "),
                targetTab: "tenants",
            })
        }

        const expiringSoon = tenants.filter((t) => {
            if (t.contractStatus !== "active" || !t.rawEndDate) return false
            const days = differenceInCalendarDays(parseLocalDate(t.rawEndDate), new Date())
            return days >= 0 && days <= 30
        })
        if (expiringSoon.length > 0) {
            alerts.push({
                id: "expiring-soon",
                severity: "amber",
                title: `${expiringSoon.length} ${expiringSoon.length === 1 ? "contrato por vencer" : "contratos por vencer"} (≤ 30 días)`,
                detail: expiringSoon.map((t) => `${t.unit} · ${t.leaseEnd}`).join(", "),
                targetTab: "tenants",
            })
        }

        const urgentOrHigh = requests.filter(
            (r) =>
                (r.status === "open" || r.status === "in_progress") &&
                (r.priority === "urgent" || r.priority === "high")
        )
        if (urgentOrHigh.length > 0) {
            alerts.push({
                id: "urgent-maintenance",
                severity: "rose",
                title: `${urgentOrHigh.length} ${urgentOrHigh.length === 1 ? "ticket prioritario" : "tickets prioritarios"} de mantenimiento`,
                detail: urgentOrHigh.map((r) => r.title).join(", "),
                targetTab: "maintenance",
            })
        }

        if (stats.vacantUnits > 0) {
            alerts.push({
                id: "vacant-units",
                severity: "blue",
                title: `${stats.vacantUnits} ${stats.vacantUnits === 1 ? "unidad vacante" : "unidades vacantes"}`,
                detail: "Disponibles para asignar a un nuevo contrato.",
                targetTab: "units",
            })
        }

        const pendingExpenses = propertyExpenses.filter((e) => e.status === "pending")
        if (pendingExpenses.length > 0) {
            alerts.push({
                id: "pending-expenses",
                severity: "amber",
                title: `${pendingExpenses.length} ${pendingExpenses.length === 1 ? "gasto pendiente" : "gastos pendientes"} de pago`,
                detail: "Revisa la pestaña de gastos para actualizar su estado.",
                targetTab: "expenses",
            })
        }

        return alerts
    }, [tenants, requests, stats.vacantUnits, propertyExpenses])

    // Filter & Paginate Units
    const filteredUnits = useMemo(() => {
        const q = unitSearch.trim().toLowerCase()
        return units.filter((u) => {
            const matchesSearch =
                !q ||
                u.name.toLowerCase().includes(q) ||
                u.tenant.toLowerCase().includes(q) ||
                (UNIT_TYPE_LABELS[u.type] || u.type).toLowerCase().includes(q)
            const matchesStatus = unitStatusFilter === "all" || u.status === unitStatusFilter
            return matchesSearch && matchesStatus
        })
    }, [units, unitSearch, unitStatusFilter])

    const totalUnitsPages = Math.max(1, Math.ceil(filteredUnits.length / ITEMS_PER_PAGE))
    const currentUnits = filteredUnits.slice(
        (currentUnitsPage - 1) * ITEMS_PER_PAGE,
        currentUnitsPage * ITEMS_PER_PAGE
    )

    const totalTenantsPages = Math.max(1, Math.ceil(tenants.length / ITEMS_PER_PAGE))
    const currentTenants = tenants.slice(
        (currentTenantsPage - 1) * ITEMS_PER_PAGE,
        currentTenantsPage * ITEMS_PER_PAGE
    )

    const hasPaymentChartData = stats.paymentChartData.some((d) => d.value > 0)

    if (loading) {
        return (
            <div className="container mx-auto px-4 md:px-6 py-4 space-y-5">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-8 w-72" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-10 w-[440px]" />
                <Skeleton className="h-80 w-full rounded-xl" />
            </div>
        )
    }

    if (!property) {
        return (
            <div className="container mx-auto px-4 md:px-6 py-12 text-center space-y-3">
                <p className="text-base font-medium">Inmueble no encontrado</p>
                <Button variant="outline" size="sm" onClick={() => router.push("/properties")}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Volver a Inmuebles
                </Button>
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="container mx-auto px-4 md:px-6 py-2 space-y-5">
                {/* Header */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link
                            href="/properties"
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Inmuebles
                        </Link>
                        <span>/</span>
                        <span className="text-foreground font-medium truncate">
                            {property.name}
                        </span>
                    </div>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3.5 min-w-0">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/15">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-2xl font-bold tracking-tight truncate">
                                        {property.name}
                                    </h1>
                                    {property.property_type?.label && (
                                        <Badge variant="outline" className="text-xs font-medium">
                                            {property.property_type.label}
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        {property.address}
                                    </span>
                                    {property.total_area != null && (
                                        <span className="inline-flex items-center gap-1 tabular-nums">
                                            <Maximize2 className="h-3.5 w-3.5 shrink-0" />
                                            {Number(property.total_area).toLocaleString("es-VE")} m²
                                        </span>
                                    )}
                                    {property.floors != null && (
                                        <span className="inline-flex items-center gap-1 tabular-nums">
                                            <Layers className="h-3.5 w-3.5 shrink-0" />
                                            {property.floors}{" "}
                                            {property.floors === 1 ? "nivel" : "niveles"}
                                        </span>
                                    )}
                                </div>

                                {property.owners && property.owners.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        <span className="text-[11px] text-muted-foreground mr-0.5">
                                            Propietarios:
                                        </span>
                                        {property.owners.map((owner) => (
                                            <Badge
                                                key={owner.owner_id}
                                                variant="secondary"
                                                className="text-[11px] font-normal gap-1 py-0.5"
                                            >
                                                <span>{owner.name}</span>
                                                <span className="text-muted-foreground tabular-nums">
                                                    {owner.participation_percentage}%
                                                </span>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditPropertyDialogOpen(true)}
                            >
                                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                Editar Inmueble
                            </Button>
                            <Button size="sm" onClick={openCreateUnit}>
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Nueva Unidad
                            </Button>
                        </div>
                    </div>

                    {property.description && (
                        <p className="text-xs text-muted-foreground bg-muted/30 border rounded-lg px-3.5 py-2">
                            {property.description}
                        </p>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card
                        className="cursor-pointer transition-colors hover:border-primary/40"
                        onClick={() => setActiveTab("units")}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
                            <CardTitle className="text-xs font-medium text-muted-foreground">
                                Total Unidades
                            </CardTitle>
                            <DoorOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-2xl font-bold tabular-nums">{stats.totalUnits}</div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {stats.occupiedUnits} ocupadas · {stats.vacantUnits} vacantes
                                {stats.expiredUnits > 0 && ` · ${stats.expiredUnits} vencidas`}
                            </p>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer transition-colors hover:border-primary/40"
                        onClick={() => setActiveTab("units")}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
                            <CardTitle className="text-xs font-medium text-muted-foreground">
                                Ocupación
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-2">
                            <div className="text-2xl font-bold tabular-nums">
                                {stats.occupancyRate}%
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${stats.occupancyRate}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer transition-colors hover:border-primary/40"
                        onClick={() => setActiveTab("overview")}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
                            <CardTitle className="text-xs font-medium text-muted-foreground">
                                Cobrado (Mes Actual)
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-2xl font-bold tabular-nums">
                                {formatCurrency(stats.totalRevenue, "USD")}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                                Canon esperado: {formatCurrency(stats.expectedMonthlyRent, "USD")}
                            </p>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer transition-colors hover:border-primary/40"
                        onClick={() => setActiveTab("maintenance")}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
                            <CardTitle className="text-xs font-medium text-muted-foreground">
                                Mantenimiento
                            </CardTitle>
                            <Wrench
                                className={`h-4 w-4 ${
                                    openRequestsCount > 0
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-muted-foreground"
                                }`}
                            />
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-2xl font-bold tabular-nums">
                                {openRequestsCount}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                                Abiertas / en progreso ({requests.length} totales)
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="h-9 w-full sm:w-auto justify-start overflow-x-auto">
                        <TabsTrigger value="overview" className="text-xs gap-1.5">
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Resumen
                        </TabsTrigger>
                        <TabsTrigger value="units" className="text-xs gap-1.5">
                            <DoorOpen className="h-3.5 w-3.5" />
                            Unidades
                            <span className="rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-semibold tabular-nums">
                                {units.length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="tenants" className="text-xs gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Inquilinos
                            <span className="rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-semibold tabular-nums">
                                {tenants.length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="expenses" className="text-xs gap-1.5">
                            <Receipt className="h-3.5 w-3.5" />
                            Gastos
                            {propertyExpenses.length > 0 && (
                                <span className="rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-semibold tabular-nums">
                                    {propertyExpenses.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="maintenance" className="text-xs gap-1.5">
                            <Wrench className="h-3.5 w-3.5" />
                            Mantenimiento
                            {openRequestsCount > 0 && (
                                <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 text-[10px] font-semibold tabular-nums">
                                    {openRequestsCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-7">
                            <Card className="lg:col-span-4">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">
                                        Estado Financiero y Solvencia
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Cobranza del mes en curso (equiv. USD) y estado de contratos.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[270px]">
                                        <div className="flex flex-col items-center justify-center">
                                            <h4 className="text-xs font-medium mb-2 text-muted-foreground">
                                                Cobranza del Mes
                                            </h4>
                                            {hasPaymentChartData ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={stats.paymentChartData.filter(
                                                                (d) => d.value > 0
                                                            )}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={52}
                                                            outerRadius={74}
                                                            paddingAngle={4}
                                                            dataKey="value"
                                                        >
                                                            {stats.paymentChartData
                                                                .filter((d) => d.value > 0)
                                                                .map((entry, index) => (
                                                                    <Cell
                                                                        key={`cell-${index}`}
                                                                        fill={entry.color}
                                                                    />
                                                                ))}
                                                        </Pie>
                                                        <RechartsTooltip
                                                            formatter={(value: number) =>
                                                                formatCurrency(value, "USD")
                                                            }
                                                            contentStyle={{
                                                                backgroundColor:
                                                                    "hsl(var(--popover))",
                                                                borderColor: "hsl(var(--border))",
                                                                color: "hsl(var(--popover-foreground))",
                                                                borderRadius: "8px",
                                                                fontSize: "12px",
                                                            }}
                                                        />
                                                        <Legend
                                                            verticalAlign="bottom"
                                                            height={32}
                                                            iconType="circle"
                                                            wrapperStyle={{ fontSize: "12px" }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="text-xs text-muted-foreground text-center px-4">
                                                    Sin movimientos ni canon activo este mes.
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-center justify-center">
                                            <h4 className="text-xs font-medium mb-2 text-muted-foreground">
                                                Estado de Inquilinos
                                            </h4>
                                            {tenants.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        layout="vertical"
                                                        data={stats.arrearsChartData}
                                                        margin={{
                                                            top: 8,
                                                            right: 24,
                                                            left: 8,
                                                            bottom: 8,
                                                        }}
                                                    >
                                                        <CartesianGrid
                                                            strokeDasharray="3 3"
                                                            horizontal={false}
                                                        />
                                                        <XAxis type="number" domain={[0, 100]} hide />
                                                        <YAxis
                                                            dataKey="name"
                                                            type="category"
                                                            width={68}
                                                            tick={{ fontSize: 11 }}
                                                        />
                                                        <RechartsTooltip
                                                            cursor={{ fill: "transparent" }}
                                                            formatter={(value, _name, props) => [
                                                                `${value}% (${props.payload?.count || 0} inq.)`,
                                                                "Distribución",
                                                            ]}
                                                            contentStyle={{
                                                                backgroundColor:
                                                                    "hsl(var(--popover))",
                                                                borderColor: "hsl(var(--border))",
                                                                color: "hsl(var(--popover-foreground))",
                                                                borderRadius: "8px",
                                                                fontSize: "12px",
                                                            }}
                                                        />
                                                        <Bar
                                                            dataKey="value"
                                                            radius={[0, 4, 4, 0]}
                                                            barSize={18}
                                                        >
                                                            {stats.arrearsChartData.map(
                                                                (entry, index) => (
                                                                    <Cell
                                                                        key={`bar-${index}`}
                                                                        fill={
                                                                            entry.color || "#3b82f6"
                                                                        }
                                                                    />
                                                                )
                                                            )}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="text-xs text-muted-foreground text-center px-4">
                                                    Sin inquilinos asignados todavía.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Real Alerts Card */}
                            <Card className="lg:col-span-3">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">
                                        Alertas y Pendientes
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Elementos que requieren atención en este inmueble.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {propertyAlerts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                            <p className="text-sm font-medium">Todo en orden</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                No hay alertas activas para esta propiedad.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {propertyAlerts.map((alert) => (
                                                <button
                                                    key={alert.id}
                                                    type="button"
                                                    onClick={() => setActiveTab(alert.targetTab)}
                                                    className="w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition-colors flex items-start gap-3"
                                                >
                                                    <div
                                                        className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                                                            alert.severity === "rose"
                                                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                                : alert.severity === "amber"
                                                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                                        }`}
                                                    >
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-semibold">
                                                            {alert.title}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                                            {alert.detail}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* UNITS TAB */}
                    <TabsContent value="units" className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle className="text-base">
                                            Inventario de Unidades
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Espacios arrendables, estado de ocupación y canon
                                            vigente.
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="relative w-full sm:w-56">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar unidad o inquilino..."
                                                className="h-8 pl-8 pr-7 text-xs"
                                                value={unitSearch}
                                                onChange={(e) => {
                                                    setUnitSearch(e.target.value)
                                                    setCurrentUnitsPage(1)
                                                }}
                                            />
                                            {unitSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUnitSearch("")
                                                        setCurrentUnitsPage(1)
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <Button size="sm" className="h-8 text-xs" onClick={openCreateUnit}>
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            Agregar unidad
                                        </Button>
                                    </div>
                                </div>

                                {/* Status filter pills */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                    {(
                                        [
                                            { key: "all", label: "Todas", count: units.length },
                                            {
                                                key: "Ocupado",
                                                label: "Ocupadas",
                                                count: stats.occupiedUnits,
                                            },
                                            {
                                                key: "Vacante",
                                                label: "Vacantes",
                                                count: stats.vacantUnits,
                                            },
                                            ...(stats.expiredUnits > 0
                                                ? [
                                                      {
                                                          key: "Vencido" as const,
                                                          label: "Vencidas",
                                                          count: stats.expiredUnits,
                                                      },
                                                  ]
                                                : []),
                                        ] as {
                                            key: UnitFilterStatus
                                            label: string
                                            count: number
                                        }[]
                                    ).map((pill) => (
                                        <Button
                                            key={pill.key}
                                            type="button"
                                            size="sm"
                                            variant={
                                                unitStatusFilter === pill.key
                                                    ? "secondary"
                                                    : "ghost"
                                            }
                                            className="h-7 px-2.5 text-xs gap-1.5"
                                            onClick={() => {
                                                setUnitStatusFilter(pill.key)
                                                setCurrentUnitsPage(1)
                                            }}
                                        >
                                            <span>{pill.label}</span>
                                            <span className="text-[11px] text-muted-foreground tabular-nums">
                                                {pill.count}
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="text-xs">Unidad</TableHead>
                                                <TableHead className="text-xs">Tipo</TableHead>
                                                <TableHead className="text-xs">Área</TableHead>
                                                <TableHead className="text-xs">Estado</TableHead>
                                                <TableHead className="text-xs">Inquilino</TableHead>
                                                <TableHead className="text-xs text-right">
                                                    Canon
                                                </TableHead>
                                                <TableHead className="text-xs text-right w-[92px]">
                                                    Acciones
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {currentUnits.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={7}
                                                        className="text-center py-8 text-xs text-muted-foreground"
                                                    >
                                                        No hay unidades que coincidan con el filtro.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                currentUnits.map((unit) => (
                                                    <TableRow
                                                        key={unit.id}
                                                        className="hover:bg-muted/30"
                                                    >
                                                        <TableCell className="font-medium text-sm">
                                                            <span>{unit.name}</span>
                                                            {unit.floor && (
                                                                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                                                                    Piso {unit.floor}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {UNIT_TYPE_LABELS[unit.type] ||
                                                                unit.type}
                                                        </TableCell>
                                                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                                                            {unit.area != null
                                                                ? `${Number(unit.area).toLocaleString("es-VE")} m²`
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] font-medium ${getUnitStatusBadge(
                                                                    unit.status
                                                                )}`}
                                                            >
                                                                {unit.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {unit.tenant}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-sm tabular-nums">
                                                            {unit.rent > 0
                                                                ? formatCurrency(unit.rent, "USD")
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="inline-flex items-center gap-0.5">
                                                                <UiTooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            onClick={() =>
                                                                                openEditUnit(unit)
                                                                            }
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Editar unidad
                                                                    </TooltipContent>
                                                                </UiTooltip>
                                                                <UiTooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                                                            onClick={() =>
                                                                                requestDeleteUnit(
                                                                                    unit
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Eliminar unidad
                                                                    </TooltipContent>
                                                                </UiTooltip>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {totalUnitsPages > 1 && (
                                    <div className="flex items-center justify-between pt-3">
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            Mostrando {currentUnits.length} de{" "}
                                            {filteredUnits.length} unidades
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-2.5"
                                                onClick={() =>
                                                    setCurrentUnitsPage((p) => Math.max(p - 1, 1))
                                                }
                                                disabled={currentUnitsPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="text-xs font-medium tabular-nums px-1.5">
                                                {currentUnitsPage} / {totalUnitsPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-2.5"
                                                onClick={() =>
                                                    setCurrentUnitsPage((p) =>
                                                        Math.min(p + 1, totalUnitsPages)
                                                    )
                                                }
                                                disabled={currentUnitsPage >= totalUnitsPages}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TENANTS TAB */}
                    <TabsContent value="tenants" className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    Inquilinos del Inmueble
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Contratos activos y vencidos, contacto directo y estado de
                                    solvencia.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="text-xs">Inquilino</TableHead>
                                                <TableHead className="text-xs">Unidad</TableHead>
                                                <TableHead className="text-xs">Contacto</TableHead>
                                                <TableHead className="text-xs text-right">
                                                    Canon
                                                </TableHead>
                                                <TableHead className="text-xs">
                                                    Vencimiento
                                                </TableHead>
                                                <TableHead className="text-xs">Estado</TableHead>
                                                <TableHead className="text-xs text-right w-[104px]">
                                                    Acciones
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {currentTenants.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={7}
                                                        className="text-center py-8 text-xs text-muted-foreground"
                                                    >
                                                        No hay inquilinos con contratos activos o
                                                        vencidos en este inmueble.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                currentTenants.map((tenant) => {
                                                    const daysLeft =
                                                        tenant.contractStatus === "active" &&
                                                        tenant.rawEndDate
                                                            ? differenceInCalendarDays(
                                                                  parseLocalDate(tenant.rawEndDate),
                                                                  new Date()
                                                              )
                                                            : null
                                                    return (
                                                        <TableRow
                                                            key={tenant.contractId}
                                                            className="hover:bg-muted/30"
                                                        >
                                                            <TableCell className="font-medium text-sm">
                                                                {tenant.name}
                                                            </TableCell>
                                                            <TableCell className="text-xs font-medium">
                                                                {tenant.unit}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col gap-0.5 text-xs">
                                                                    {tenant.email && (
                                                                        <a
                                                                            href={`mailto:${tenant.email}`}
                                                                            className="inline-flex items-center gap-1 hover:underline text-foreground"
                                                                        >
                                                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                                                            {tenant.email}
                                                                        </a>
                                                                    )}
                                                                    {tenant.phone && (
                                                                        <a
                                                                            href={`tel:${tenant.phone}`}
                                                                            className="inline-flex items-center gap-1 hover:underline text-muted-foreground tabular-nums"
                                                                        >
                                                                            <Phone className="h-3 w-3" />
                                                                            {tenant.phone}
                                                                        </a>
                                                                    )}
                                                                    {!tenant.email &&
                                                                        !tenant.phone && (
                                                                            <span className="text-muted-foreground">
                                                                                —
                                                                            </span>
                                                                        )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm font-medium tabular-nums">
                                                                {formatCurrency(
                                                                    tenant.rentAmount,
                                                                    "USD"
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-xs whitespace-nowrap">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span>{tenant.leaseEnd}</span>
                                                                    {daysLeft !== null &&
                                                                        daysLeft >= 0 &&
                                                                        daysLeft <= 30 && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                                                            >
                                                                                {daysLeft}d
                                                                            </Badge>
                                                                        )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[11px] font-medium ${
                                                                        tenant.status === "Al día"
                                                                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                                            : tenant.status ===
                                                                                "Moroso"
                                                                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                                                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                                                    }`}
                                                                >
                                                                    {tenant.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="inline-flex items-center gap-0.5">
                                                                    <UiTooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7"
                                                                                asChild
                                                                            >
                                                                                <Link
                                                                                    href={`/contracts?view=${tenant.contractId}`}
                                                                                >
                                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                                </Link>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            Ver contrato
                                                                        </TooltipContent>
                                                                    </UiTooltip>
                                                                    {tenant.status !==
                                                                        "Vencido" && (
                                                                        <UiTooltip>
                                                                            <TooltipTrigger
                                                                                asChild
                                                                            >
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                                                    onClick={() =>
                                                                                        requestTerminateContract(
                                                                                            tenant.contractId,
                                                                                            tenant.name
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <FileText className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                Finalizar contrato
                                                                            </TooltipContent>
                                                                        </UiTooltip>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {totalTenantsPages > 1 && (
                                    <div className="flex items-center justify-end gap-1.5 pt-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2.5"
                                            onClick={() =>
                                                setCurrentTenantsPage((p) => Math.max(p - 1, 1))
                                            }
                                            disabled={currentTenantsPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs font-medium tabular-nums px-1.5">
                                            {currentTenantsPage} / {totalTenantsPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2.5"
                                            onClick={() =>
                                                setCurrentTenantsPage((p) =>
                                                    Math.min(p + 1, totalTenantsPages)
                                                )
                                            }
                                            disabled={currentTenantsPage >= totalTenantsPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* EXPENSES TAB */}
                    <TabsContent value="expenses" className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base">
                                            Registro de Gastos
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Egresos y servicios asociados exclusivamente a este
                                            inmueble.
                                        </CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setIsExpenseDialogOpen(true)}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                        Registrar Gasto
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="text-xs">Fecha</TableHead>
                                                <TableHead className="text-xs">Categoría</TableHead>
                                                <TableHead className="text-xs">
                                                    Descripción
                                                </TableHead>
                                                <TableHead className="text-xs">Estado</TableHead>
                                                <TableHead className="text-xs text-right">
                                                    Monto
                                                </TableHead>
                                                <TableHead className="text-xs text-right w-[68px]">
                                                    Acciones
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingExpenses ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="p-3">
                                                        <Skeleton className="h-8 w-full" />
                                                    </TableCell>
                                                </TableRow>
                                            ) : propertyExpenses.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={6}
                                                        className="text-center py-8 text-xs text-muted-foreground"
                                                    >
                                                        No hay gastos registrados para este
                                                        inmueble.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                propertyExpenses.map((expense) => {
                                                    const parsedDate = expense.date
                                                        ? parseLocalDate(expense.date)
                                                        : null
                                                    return (
                                                        <TableRow
                                                            key={expense.id}
                                                            className="hover:bg-muted/30"
                                                        >
                                                            <TableCell className="text-xs tabular-nums whitespace-nowrap">
                                                                {parsedDate && isValid(parsedDate)
                                                                    ? format(
                                                                          parsedDate,
                                                                          "dd/MM/yyyy"
                                                                      )
                                                                    : expense.date}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[11px] font-normal"
                                                                >
                                                                    {EXPENSE_CATEGORY_LABELS[
                                                                        expense.category
                                                                    ] || expense.category}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-sm">
                                                                {expense.description || "—"}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[11px] font-medium ${
                                                                        expense.status === "paid"
                                                                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                                                    }`}
                                                                >
                                                                    {expense.status === "paid"
                                                                        ? "Pagado"
                                                                        : "Pendiente"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-sm text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">
                                                                -
                                                                {formatCurrency(
                                                                    expense.amount,
                                                                    expense.currency || "USD"
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <UiTooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                                                            onClick={() =>
                                                                                setConfirmState({
                                                                                    open: true,
                                                                                    title: "¿Eliminar gasto?",
                                                                                    description:
                                                                                        "El registro del egreso será eliminado permanentemente.",
                                                                                    confirmLabel:
                                                                                        "Eliminar",
                                                                                    onConfirm:
                                                                                        async () => {
                                                                                            await deleteExpense(
                                                                                                expense.id
                                                                                            )
                                                                                        },
                                                                                })
                                                                            }
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Eliminar gasto
                                                                    </TooltipContent>
                                                                </UiTooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* MAINTENANCE TAB */}
                    <TabsContent value="maintenance" className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base">Mantenimiento</CardTitle>
                                        <CardDescription className="text-xs">
                                            Solicitudes, reparaciones y trabajos en curso.
                                        </CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setIsMaintenanceDialogOpen(true)}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                        Nueva Solicitud
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="text-xs">Unidad</TableHead>
                                                <TableHead className="text-xs">Problema</TableHead>
                                                <TableHead className="text-xs">Prioridad</TableHead>
                                                <TableHead className="text-xs">Estado</TableHead>
                                                <TableHead className="text-xs">Reporte</TableHead>
                                                <TableHead className="text-xs text-right w-[68px]">
                                                    Acciones
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingMaintenance ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="p-3">
                                                        <Skeleton className="h-8 w-full" />
                                                    </TableCell>
                                                </TableRow>
                                            ) : requests.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={6}
                                                        className="text-center py-8 text-xs text-muted-foreground"
                                                    >
                                                        No hay solicitudes de mantenimiento
                                                        registradas.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                requests.map((item) => {
                                                    const priorityMeta =
                                                        PRIORITY_META[item.priority] ||
                                                        PRIORITY_META.medium
                                                    const createdDate = item.created_at
                                                        ? parseLocalDate(item.created_at)
                                                        : null
                                                    return (
                                                        <TableRow
                                                            key={item.id}
                                                            className="hover:bg-muted/30"
                                                        >
                                                            <TableCell className="font-medium text-xs whitespace-nowrap">
                                                                {item.unit?.name || "Áreas Comunes"}
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="text-sm font-medium">
                                                                    {item.title}
                                                                </p>
                                                                {item.description && (
                                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                                        {item.description}
                                                                    </p>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[11px] font-medium ${priorityMeta.className}`}
                                                                >
                                                                    {priorityMeta.label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Select
                                                                    value={item.status}
                                                                    onValueChange={(val) =>
                                                                        updateRequestStatus(
                                                                            item.id,
                                                                            val
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger className="h-8 w-[135px] text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="open">
                                                                            Abierto
                                                                        </SelectItem>
                                                                        <SelectItem value="in_progress">
                                                                            En Progreso
                                                                        </SelectItem>
                                                                        <SelectItem value="resolved">
                                                                            Resuelto
                                                                        </SelectItem>
                                                                        <SelectItem value="closed">
                                                                            Cerrado
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {createdDate &&
                                                                    isValid(createdDate)
                                                                        ? format(
                                                                              createdDate,
                                                                              "dd/MM/yyyy"
                                                                          )
                                                                        : "—"}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <UiTooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                                                            onClick={() =>
                                                                                setConfirmState({
                                                                                    open: true,
                                                                                    title: "¿Eliminar solicitud?",
                                                                                    description:
                                                                                        "Se eliminará este ticket de mantenimiento de forma permanente.",
                                                                                    confirmLabel:
                                                                                        "Eliminar",
                                                                                    onConfirm:
                                                                                        async () => {
                                                                                            await deleteRequest(
                                                                                                item.id
                                                                                            )
                                                                                        },
                                                                                })
                                                                            }
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Eliminar solicitud
                                                                    </TooltipContent>
                                                                </UiTooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Edit Property Modal */}
                <PropertyDialog
                    open={isEditPropertyDialogOpen}
                    onOpenChange={setIsEditPropertyDialogOpen}
                    mode="edit"
                    property={property}
                    propertyTypes={propertyTypes}
                    onSubmit={async (data) => {
                        await updateProperty(property.id, data)
                        refresh()
                    }}
                />

                {/* Create / Edit Unit Modal */}
                <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>
                                {unitDialogMode === "create"
                                    ? "Agregar Nueva Unidad"
                                    : "Editar Unidad"}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                {property.name} — completa las características de la unidad.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3.5 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="unit-name" className="text-xs">
                                        Nombre / N° *
                                    </Label>
                                    <Input
                                        id="unit-name"
                                        value={unitName}
                                        onChange={(e) => setUnitName(e.target.value)}
                                        placeholder="Ej. Apto 101"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Tipo</Label>
                                    <Select value={unitType} onValueChange={setUnitType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="apartment">Apartamento</SelectItem>
                                            <SelectItem value="office">Oficina</SelectItem>
                                            <SelectItem value="local">Local</SelectItem>
                                            <SelectItem value="storage">Bodega / Depósito</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Estado</Label>
                                    <Select value={unitStatus} onValueChange={setUnitStatus}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vacant">Vacante</SelectItem>
                                            <SelectItem value="occupied">Ocupada</SelectItem>
                                            <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="unit-rent" className="text-xs">
                                        Canon Base (USD)
                                    </Label>
                                    <Input
                                        id="unit-rent"
                                        type="number"
                                        step="0.01"
                                        className="tabular-nums"
                                        value={unitRent}
                                        onChange={(e) => setUnitRent(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="unit-area" className="text-xs">
                                        Área (m²)
                                    </Label>
                                    <Input
                                        id="unit-area"
                                        type="number"
                                        step="0.01"
                                        className="tabular-nums"
                                        value={unitArea}
                                        onChange={(e) => setUnitArea(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="unit-floor" className="text-xs">
                                        Piso / Nivel
                                    </Label>
                                    <Input
                                        id="unit-floor"
                                        value={unitFloor}
                                        onChange={(e) => setUnitFloor(e.target.value)}
                                        placeholder="Ej. PB, 1, 2"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsUnitDialogOpen(false)}
                                disabled={savingUnit}
                            >
                                Cancelar
                            </Button>
                            <Button size="sm" onClick={handleSaveUnit} disabled={savingUnit}>
                                {savingUnit && (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                )}
                                {unitDialogMode === "create"
                                    ? "Guardar Unidad"
                                    : "Actualizar Unidad"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Expense Modal */}
                <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
                            <DialogDescription className="text-xs">
                                Ingrese los detalles del egreso, servicio o reparación.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3.5 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Categoría</Label>
                                    <Select
                                        value={expenseCategory}
                                        onValueChange={(value) =>
                                            setExpenseCategory(value as ExpenseCategory)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="maintenance">
                                                Mantenimiento
                                            </SelectItem>
                                            <SelectItem value="utilities">
                                                Servicios (Agua / Luz)
                                            </SelectItem>
                                            <SelectItem value="tax">Impuestos</SelectItem>
                                            <SelectItem value="other">Otros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Fecha</Label>
                                    <Input
                                        type="date"
                                        value={expenseDate}
                                        onChange={(e) => setExpenseDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Descripción *</Label>
                                <Input
                                    placeholder="Ej. Reparación tubería sótano"
                                    value={expenseDescription}
                                    onChange={(e) => setExpenseDescription(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Monto *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="tabular-nums"
                                        placeholder="0.00"
                                        value={expenseAmount}
                                        onChange={(e) => setExpenseAmount(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Moneda</Label>
                                    <Select
                                        value={currency}
                                        onValueChange={(val: "USD" | "Bs") => setCurrency(val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                            <SelectItem value="Bs">Bolívares (Bs)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Tasa de Cambio (Bs/USD)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="tabular-nums"
                                        value={exchangeRate}
                                        onChange={(e) =>
                                            setExchangeRate(parseFloat(e.target.value) || 0)
                                        }
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Estado de Pago</Label>
                                    <Select
                                        value={expenseStatus}
                                        onValueChange={(value) =>
                                            setExpenseStatus(value as ExpenseStatus)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pendiente</SelectItem>
                                            <SelectItem value="paid">Pagado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsExpenseDialogOpen(false)}
                                disabled={savingExpense}
                            >
                                Cancelar
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleCreateExpense}
                                disabled={savingExpense}
                            >
                                {savingExpense && (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                )}
                                Guardar Gasto
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Maintenance Modal */}
                <Dialog
                    open={isMaintenanceDialogOpen}
                    onOpenChange={setIsMaintenanceDialogOpen}
                >
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Nueva Solicitud de Mantenimiento</DialogTitle>
                            <DialogDescription className="text-xs">
                                Cree un ticket para seguimiento de reparaciones o trabajos.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3.5 py-2">
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Título / Asunto *</Label>
                                <Input
                                    placeholder="Ej. Aire acondicionado ruidoso"
                                    value={maintenanceTitle}
                                    onChange={(e) => setMaintenanceTitle(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Prioridad</Label>
                                    <Select
                                        value={maintenancePriority}
                                        onValueChange={(val) =>
                                            setMaintenancePriority(
                                                val as MaintenanceRequest["priority"]
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Baja</SelectItem>
                                            <SelectItem value="medium">Media</SelectItem>
                                            <SelectItem value="high">Alta</SelectItem>
                                            <SelectItem value="urgent">Urgente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Unidad Afectada</Label>
                                    <Select
                                        value={maintenanceUnitId}
                                        onValueChange={setMaintenanceUnitId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="common">Áreas Comunes</SelectItem>
                                            {units.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Descripción Detallada</Label>
                                <Textarea
                                    rows={3}
                                    className="resize-none text-sm"
                                    placeholder="Describa el problema o trabajo requerido..."
                                    value={maintenanceDescription}
                                    onChange={(e) => setMaintenanceDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsMaintenanceDialogOpen(false)}
                                disabled={savingMaintenance}
                            >
                                Cancelar
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleCreateMaintenance}
                                disabled={savingMaintenance}
                            >
                                {savingMaintenance && (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                )}
                                Crear Solicitud
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Shared Confirmation AlertDialog */}
                <AlertDialog
                    open={Boolean(confirmState?.open)}
                    onOpenChange={(open) => {
                        if (!open) setConfirmState(null)
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {confirmState?.description}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async () => {
                                    if (confirmState?.onConfirm) {
                                        await confirmState.onConfirm()
                                    }
                                    setConfirmState(null)
                                }}
                            >
                                {confirmState?.confirmLabel || "Confirmar"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    )
}
