'use client'

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
    Plus,
    Search,
    Mail,
    Phone,
    User,
    FileText,
    Building,
    ChevronLeft,
    ChevronRight,
    Edit,
    Trash,
    DollarSign,
    ArrowUpDown,
    Printer,
    X,
    Users
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ExportButtons } from "@/components/export-buttons"
import { useTenants, ContractData } from "@/hooks/use-tenants"
import { useProperties } from "@/hooks/use-properties"
import { TenantDialog } from "@/components/tenants/tenant-dialog"
import { PaymentDialog } from "@/components/tenants/payment-dialog"
import { Tenant } from "@/types/tenant"
import { cn, formatCurrency } from "@/lib/utils"
import { useReactToPrint } from "react-to-print"
import { TenantListReport } from "@/components/reports/tenant-list-report"
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

type TenantSortKey = 'name' | 'phone' | 'status' | 'canon'
type TenantStatusFilter = 'all' | 'solvent' | 'delinquent'

/**
 * Página de administración de inquilinos.
 * Conserva toda la información de contacto, estado, canon y ubicación en filas compactas y escaneables.
 */
export default function TenantsPage() {
    const { tenants, loading, fetchTenants, createTenant, updateTenant, deleteTenant } = useTenants()
    const { properties } = useProperties()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create")
    const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>(undefined)
    const reportRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `Reporte_Inquilinos_${new Date().toLocaleDateString('es-VE').replace(/\//g, '-')}`
    })

    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>("all")
    const [propertyFilter, setPropertyFilter] = useState("all")
    const [ownerFilter, setOwnerFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)

    const [sortConfig, setSortConfig] = useState<{ key: TenantSortKey; direction: 'asc' | 'desc' } | null>(null)

    const getPrimaryContract = (tenant: Tenant) =>
        tenant.contracts?.find((c) => c.status === 'active') || tenant.contracts?.[0]

    // Unique owners
    const uniqueOwners = Array.from(
        new Map(
            properties.flatMap((p) => p.owners || []).map((o) => [o.owner_id, o])
        ).values()
    ).sort((a, b) => a.name.localeCompare(b.name))

    // Dependent Filter Logic
    const handleOwnerChange = (value: string) => {
        setOwnerFilter(value)
        setPropertyFilter("all")
        setCurrentPage(1)
    }

    const handlePropertyChange = (value: string) => {
        setPropertyFilter(value)
        setCurrentPage(1)

        if (value !== "all") {
            const property = properties.find((p) => p.id === value)
            if (property && property.owners && property.owners.length > 0) {
                setOwnerFilter(property.owners[0].owner_id)
            }
        }
    }

    const availableProperties =
        ownerFilter === "all"
            ? properties
            : properties.filter((p) => p.owners?.some((o) => o.owner_id === ownerFilter))

    // Base filter (search + owner + property) so status pills reflect live counts for the current scope
    const normalizedSearch = searchTerm.toLowerCase().trim()
    const baseFilteredTenants = tenants.filter((tenant) => {
        const matchesSearch =
            !normalizedSearch ||
            tenant.name.toLowerCase().includes(normalizedSearch) ||
            tenant.doc_id.toLowerCase().includes(normalizedSearch) ||
            (tenant.email?.toLowerCase().includes(normalizedSearch) ?? false) ||
            (tenant.phone?.toLowerCase().includes(normalizedSearch) ?? false) ||
            (tenant.contacts?.some(
                (c) =>
                    c.name.toLowerCase().includes(normalizedSearch) ||
                    (c.email?.toLowerCase().includes(normalizedSearch) ?? false) ||
                    (c.phone?.toLowerCase().includes(normalizedSearch) ?? false)
            ) ?? false)

        const matchesProperty =
            propertyFilter === "all" ||
            (tenant.contracts?.some((c) => c.unit?.property?.id === propertyFilter) ?? false)

        const matchesOwner =
            ownerFilter === "all" ||
            (tenant.contracts?.some((c) => {
                const propId = c.unit?.property?.id
                if (!propId) return false
                const property = properties.find((p) => p.id === propId)
                return property?.owners?.some((o) => o.owner_id === ownerFilter) ?? false
            }) ?? false)

        return matchesSearch && matchesProperty && matchesOwner
    })

    const solventCount = baseFilteredTenants.filter((t) => t.status === 'solvent').length
    const delinquentCount = baseFilteredTenants.filter((t) => t.status === 'delinquent').length

    const filteredTenants = baseFilteredTenants.filter((t) =>
        statusFilter === 'all' ? true : t.status === statusFilter
    )

    const requestSort = (key: TenantSortKey) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedTenants = [...filteredTenants]
    if (sortConfig) {
        sortedTenants.sort((a, b) => {
            const { key, direction } = sortConfig
            let cmp = 0
            if (key === 'canon') {
                const aVal = Number(getPrimaryContract(a)?.rent_amount ?? -1)
                const bVal = Number(getPrimaryContract(b)?.rent_amount ?? -1)
                cmp = aVal - bVal
            } else if (key === 'name') {
                cmp = a.name.localeCompare(b.name)
            } else if (key === 'phone') {
                cmp = (a.phone || '').localeCompare(b.phone || '')
            } else if (key === 'status') {
                cmp = a.status.localeCompare(b.status)
            }
            return direction === 'asc' ? cmp : -cmp
        })
    }

    const totalPages = Math.max(1, Math.ceil(sortedTenants.length / itemsPerPage))
    const currentTenants = sortedTenants.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleCreate = () => {
        setDialogMode("create")
        setSelectedTenant(undefined)
        setIsDialogOpen(true)
    }

    const handleEdit = (tenant: Tenant) => {
        setDialogMode("edit")
        setSelectedTenant(tenant)
        setIsDialogOpen(true)
    }

    const handleView = (tenant: Tenant) => {
        setDialogMode("view")
        setSelectedTenant(tenant)
        setIsDialogOpen(true)
    }

    const handlePayment = (tenant: Tenant) => {
        setSelectedTenant(tenant)
        setIsPaymentDialogOpen(true)
    }

    const handleFormSubmit = async (
        tenantData: Omit<Tenant, 'id' | 'created_at'>,
        contractData?: ContractData
    ) => {
        if (dialogMode === 'create') {
            await createTenant(tenantData, contractData)
        } else if (dialogMode === 'edit' && selectedTenant) {
            await updateTenant(selectedTenant.id, tenantData)
        }
    }

    const confirmDelete = (tenant: Tenant) => {
        setTenantToDelete(tenant)
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (tenantToDelete) {
            await deleteTenant(tenantToDelete.id)
            setIsDeleteDialogOpen(false)
            setTenantToDelete(null)
        }
    }

    const exportData = filteredTenants
        .map((tenant) => {
            const contract = getPrimaryContract(tenant)
            const propertyId = contract?.unit?.property?.id
            const fullProperty = propertyId ? properties.find((p) => p.id === propertyId) : null
            const ownerName = fullProperty?.owners?.[0]?.name || "-"

            return {
                ...tenant,
                propertyName: contract?.unit?.property?.name || "Sin Asignar",
                unitName: contract?.unit?.name || "Sin Asignar",
                ownerName,
                statusText: tenant.status === 'solvent' ? 'Solvente' : 'Moroso',
                monthlyAmount: contract?.rent_amount || 0,
                currency: "USD"
            }
        })
        .sort((a, b) => {
            const propSort = a.propertyName.localeCompare(b.propertyName)
            if (propSort !== 0) return propSort
            return a.unitName.localeCompare(b.unitName, undefined, { numeric: true, sensitivity: 'base' })
        })

    const relationLabel = (rel?: string) => {
        if (rel === 'family') return 'Familiar'
        if (rel === 'partner') return 'Pareja'
        if (rel === 'worker') return 'Trabajador'
        return 'Otro'
    }

    return (
        <div className="container mx-auto px-4 md:px-6 py-2 space-y-4">
            {/* Compact Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inquilinos</h1>
                    <p className="text-xs text-muted-foreground">
                        Gestión de arrendatarios, contratos vigentes, cánones y contactos.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <ExportButtons
                        data={exportData}
                        filename="inquilinos"
                        columns={[
                            { header: "Nombre", key: "name" },
                            { header: "Documento", key: "doc_id" },
                            { header: "Teléfono", key: "phone" },
                            { header: "Propiedad", key: "propertyName" },
                            { header: "Unidad", key: "unitName" },
                            { header: "Propietario", key: "ownerName" },
                            { header: "Canon", key: "monthlyAmount" },
                            { header: "Moneda", key: "currency" },
                        ]}
                        title="Reporte de Inquilinos"
                        hidePdf={true}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint()}
                        className="h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900 dark:hover:bg-rose-950/40"
                    >
                        <Printer className="mr-1.5 h-4 w-4" /> PDF
                    </Button>
                    <Button size="sm" className="h-9" onClick={handleCreate}>
                        <Plus className="mr-1.5 h-4 w-4" /> Registrar Inquilino
                    </Button>
                </div>
            </div>

            {/* Unified Toolbar: Status Pills + Owner/Property Filters + Search */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                        type="button"
                        onClick={() => { setStatusFilter('all'); setCurrentPage(1) }}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors tabular-nums",
                            statusFilter === 'all'
                                ? "bg-foreground text-background border-foreground"
                                : "bg-background text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span>Todos</span>
                        <span className="opacity-75">({baseFilteredTenants.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setStatusFilter('solvent'); setCurrentPage(1) }}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors tabular-nums",
                            statusFilter === 'solvent'
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-background text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span>Solventes</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{solventCount}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setStatusFilter('delinquent'); setCurrentPage(1) }}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors tabular-nums",
                            statusFilter === 'delinquent'
                                ? "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                                : "bg-background text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span>Morosos</span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">{delinquentCount}</span>
                    </button>
                </div>

                {/* Filters + Search */}
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={ownerFilter}
                        onValueChange={handleOwnerChange}
                        disabled={propertyFilter !== "all"}
                    >
                        <SelectTrigger className="h-9 w-full sm:w-[175px] text-xs">
                            <SelectValue placeholder="Propietario" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los propietarios</SelectItem>
                            {uniqueOwners.map((owner) => (
                                <SelectItem key={owner.owner_id} value={owner.owner_id}>
                                    {owner.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={propertyFilter} onValueChange={handlePropertyChange}>
                        <SelectTrigger className="h-9 w-full sm:w-[175px] text-xs">
                            <SelectValue placeholder="Inmueble" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los inmuebles</SelectItem>
                            {availableProperties.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar nombre, cédula, contacto..."
                            className="h-9 pl-8 pr-8 text-sm"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setCurrentPage(1)
                            }}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => { setSearchTerm(''); setCurrentPage(1) }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                aria-label="Limpiar búsqueda"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tenants Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => requestSort('name')} className="hover:bg-transparent px-0 font-semibold text-xs">
                                            Nombre <ArrowUpDown className="ml-1.5 h-3 w-3" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => requestSort('phone')} className="hover:bg-transparent px-0 font-semibold text-xs">
                                            Contacto <ArrowUpDown className="ml-1.5 h-3 w-3" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => requestSort('status')} className="hover:bg-transparent px-0 font-semibold text-xs">
                                            Estado <ArrowUpDown className="ml-1.5 h-3 w-3" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <Button variant="ghost" onClick={() => requestSort('canon')} className="hover:bg-transparent px-0 font-semibold text-xs">
                                            Canon <ArrowUpDown className="ml-1.5 h-3 w-3" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold">Ubicación</TableHead>
                                    <TableHead className="text-right text-xs font-semibold">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell><div className="h-4 w-36 rounded bg-muted" /><div className="h-3 w-24 rounded bg-muted mt-1.5" /></TableCell>
                                            <TableCell><div className="h-3.5 w-40 rounded bg-muted" /><div className="h-3 w-28 rounded bg-muted mt-1.5" /></TableCell>
                                            <TableCell><div className="h-5 w-16 rounded-full bg-muted" /></TableCell>
                                            <TableCell className="text-right"><div className="h-4 w-16 rounded bg-muted ml-auto" /></TableCell>
                                            <TableCell><div className="h-3.5 w-36 rounded bg-muted" /><div className="h-3 w-28 rounded bg-muted mt-1.5" /></TableCell>
                                            <TableCell className="text-right"><div className="h-7 w-24 rounded bg-muted ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : currentTenants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <User className="h-8 w-8 mb-2 opacity-30" />
                                                <p className="text-sm font-medium text-foreground">No se encontraron inquilinos</p>
                                                <p className="text-xs">No hay inquilinos registrados que coincidan con los filtros.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentTenants.map((tenant) => {
                                        const primaryContract = getPrimaryContract(tenant)
                                        const propertyId = primaryContract?.unit?.property?.id
                                        const fullProperty = propertyId ? properties.find((p) => p.id === propertyId) : null
                                        const ownerName = fullProperty?.owners?.[0]?.name
                                        const extraContacts = tenant.contacts || []

                                        return (
                                            <TableRow key={tenant.id}>
                                                {/* 1. Name & Doc ID */}
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="bg-primary/10 p-1.5 rounded-full shrink-0">
                                                            <User className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm truncate max-w-[200px]">{tenant.name}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{tenant.doc_id}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* 2. Contact + Compact Extra Contacts */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs gap-0.5 max-w-[240px]">
                                                        {tenant.email && (
                                                            <span className="flex items-center gap-1.5 text-foreground truncate" title={tenant.email}>
                                                                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                <span className="truncate">{tenant.email}</span>
                                                            </span>
                                                        )}
                                                        {tenant.phone && (
                                                            <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
                                                                <Phone className="h-3 w-3 shrink-0" />
                                                                <span>{tenant.phone}</span>
                                                            </span>
                                                        )}
                                                        {extraContacts.length > 0 && (
                                                            <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                                                                <span className="truncate">
                                                                    {extraContacts[0].name}
                                                                    {extraContacts[0].phone ? ` · ${extraContacts[0].phone}` : ''}
                                                                </span>
                                                                {extraContacts.length > 1 && (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <button
                                                                                type="button"
                                                                                className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium text-primary hover:bg-muted/80 shrink-0"
                                                                            >
                                                                                <Users className="h-2.5 w-2.5" />
                                                                                +{extraContacts.length - 1}
                                                                            </button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-64 p-3 space-y-2" align="start">
                                                                            <div className="text-xs font-semibold">Contactos adicionales ({extraContacts.length})</div>
                                                                            <div className="divide-y space-y-1.5">
                                                                                {extraContacts.map((c, idx) => (
                                                                                    <div key={idx} className="pt-1.5 first:pt-0 text-xs space-y-0.5">
                                                                                        <div className="flex items-center justify-between gap-2">
                                                                                            <span className="font-medium truncate">{c.name}</span>
                                                                                            <span className="text-[10px] text-muted-foreground">{relationLabel(c.relation)}</span>
                                                                                        </div>
                                                                                        {c.phone && <div className="text-[11px] text-muted-foreground">{c.phone}</div>}
                                                                                        {c.email && <div className="text-[11px] text-muted-foreground truncate">{c.email}</div>}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* 3. Status */}
                                                <TableCell className="whitespace-nowrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[11px] font-medium",
                                                            tenant.status === 'solvent'
                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                                        )}
                                                    >
                                                        {tenant.status === 'solvent' ? 'Solvente' : 'Moroso'}
                                                    </Badge>
                                                </TableCell>

                                                {/* 4. Canon */}
                                                <TableCell className="text-right font-semibold text-sm tabular-nums whitespace-nowrap">
                                                    {primaryContract?.rent_amount != null
                                                        ? formatCurrency(Number(primaryContract.rent_amount), 'USD')
                                                        : <span className="text-muted-foreground text-xs font-normal italic">—</span>}
                                                </TableCell>

                                                {/* 5. Location */}
                                                <TableCell>
                                                    {primaryContract?.unit ? (
                                                        <div className="flex flex-col text-xs gap-0.5 max-w-[230px]">
                                                            <span className="flex items-center gap-1 font-medium text-foreground truncate">
                                                                <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                <span className="truncate">
                                                                    {primaryContract.unit.property?.name} · {primaryContract.unit.name}
                                                                </span>
                                                            </span>
                                                            {ownerName && (
                                                                <span className="flex items-center gap-1 text-muted-foreground pl-4 truncate">
                                                                    <User className="h-3 w-3 shrink-0" />
                                                                    <span className="truncate">{ownerName}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs italic">—</span>
                                                    )}
                                                </TableCell>

                                                {/* 6. Actions */}
                                                <TableCell className="text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(tenant)} title="Ver ficha del inquilino">
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(tenant)} title="Editar inquilino y contratos">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                                            onClick={() => handlePayment(tenant)}
                                                            title="Registrar pago"
                                                        >
                                                            <DollarSign className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => confirmDelete(tenant)}
                                                            title="Eliminar inquilino"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Footer */}
                    {!loading && filteredTenants.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t text-xs text-muted-foreground">
                            <div className="tabular-nums">
                                Mostrando <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                                <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredTenants.length)}</span> de{' '}
                                <span className="font-medium text-foreground">{filteredTenants.length}</span> inquilinos
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Filas:</span>
                                <Select
                                    value={itemsPerPage.toString()}
                                    onValueChange={(val) => {
                                        setItemsPerPage(Number(val))
                                        setCurrentPage(1)
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[68px] text-xs">
                                        <SelectValue placeholder={itemsPerPage.toString()} />
                                    </SelectTrigger>
                                    <SelectContent side="top">
                                        {[10, 20, 50, 100].map((size) => (
                                            <SelectItem key={size} value={size.toString()}>
                                                {size}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-medium text-foreground tabular-nums px-1">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <TenantDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                tenant={selectedTenant}
                properties={properties}
                onSubmit={handleFormSubmit}
                onContractsUpdated={fetchTenants}
                onModeChange={setDialogMode}
                onRegisterPayment={handlePayment}
            />

            <PaymentDialog
                open={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                tenant={selectedTenant}
                isAdmin={true}
            />

            {/* Componente Oculto para exportación a PDF Stylized */}
            <div style={{ display: 'none' }}>
                <TenantListReport
                    ref={reportRef}
                    data={exportData}
                    filters={{
                        ownerName:
                            ownerFilter !== 'all'
                                ? uniqueOwners.find((o) => o.owner_id === ownerFilter)?.name
                                : undefined,
                        propertyName:
                            propertyFilter !== 'all'
                                ? properties.find((p) => p.id === propertyFilter)?.name
                                : undefined
                    }}
                />
            </div>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al inquilino{' '}
                            <strong>{tenantToDelete?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
