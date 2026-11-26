'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Building,
    Building2,
    Home,
    Plus,
    Edit,
    Trash,
    MapPin,
    User,
    X,
    Search,
    FileText,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown
} from "lucide-react"
import { toast } from "sonner"
import { PropertyDialog } from "@/components/properties/property-dialog"
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
import { useProperties } from "@/hooks/use-properties"
import { Property, Unit } from "@/types/property"
import { cn, formatCurrency } from "@/lib/utils"

type PropertySortKey = 'name' | 'property_type' | 'units_count' | 'vacant_count'
type UnitSortKey = 'name' | 'type' | 'status' | 'default_rent_amount'

/**
 * Página principal de administración de inmuebles.
 * Muestra el portafolio jerárquico (Inmueble → Unidades) con métricas de ocupación,
 * filtros por propietario/vacantes, ordenamiento y gestión CRUD.
 */
export default function PropertiesPage() {
    const {
        properties,
        propertyTypes,
        loading,
        createProperty,
        updateProperty,
        deleteProperty,
        createUnit,
        updateUnit,
        deleteUnit
    } = useProperties()

    const router = useRouter()

    // Property Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create")
    const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(undefined)

    // Unit Dialog State
    const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false)
    const [unitDialogMode, setUnitDialogMode] = useState<"create" | "edit">("create")
    const [selectedPropertyId, setSelectedPropertyId] = useState("")
    const [selectedBuildingName, setSelectedBuildingName] = useState("")
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)

    // Unit Form State
    const [unitName, setUnitName] = useState("")
    const [unitType, setUnitType] = useState("apartment")
    const [unitStatus, setUnitStatus] = useState("vacant")
    const [unitRent, setUnitRent] = useState("")
    const [unitArea, setUnitArea] = useState("")
    const [unitFloor, setUnitFloor] = useState("")

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'property' | 'unit' } | null>(null)

    // Filters & Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [searchTerm, setSearchTerm] = useState("")
    const [ownerFilter, setOwnerFilter] = useState("all")
    const [onlyVacant, setOnlyVacant] = useState(false)

    // Sorting State
    const [propertySortConfig, setPropertySortConfig] = useState<{ key: PropertySortKey; direction: 'asc' | 'desc' }>({
        key: 'name',
        direction: 'asc'
    })
    const [unitSortConfig, setUnitSortConfig] = useState<{ key: UnitSortKey; direction: 'asc' | 'desc' } | null>(null)

    // Unique owners for filter
    const uniqueOwners = Array.from(
        new Map(
            properties.flatMap((p) => p.owners || []).map((o) => [o.owner_id, o])
        ).values()
    ).sort((a, b) => a.name.localeCompare(b.name))

    // Portfolio summary counts
    const totalUnitsAll = properties.reduce((sum, p) => sum + (p.units?.length || 0), 0)
    const occupiedUnitsAll = properties.reduce(
        (sum, p) => sum + (p.units?.filter((u) => u.status === 'occupied').length || 0),
        0
    )
    const vacantUnitsAll = properties.reduce(
        (sum, p) => sum + (p.units?.filter((u) => u.status === 'vacant').length || 0),
        0
    )
    const occupancyPct = totalUnitsAll > 0 ? Math.round((occupiedUnitsAll / totalUnitsAll) * 100) : 0

    // Filtered properties
    const normalizedSearch = searchTerm.toLowerCase().trim()
    const filteredProperties = properties.filter((property) => {
        const matchesSearch =
            !normalizedSearch ||
            property.name.toLowerCase().includes(normalizedSearch) ||
            (property.property_type?.label || '').toLowerCase().includes(normalizedSearch) ||
            property.address.toLowerCase().includes(normalizedSearch) ||
            property.owners?.some((o) => o.name.toLowerCase().includes(normalizedSearch)) ||
            property.units?.some(
                (u) =>
                    u.name.toLowerCase().includes(normalizedSearch) ||
                    (u.tenantName || '').toLowerCase().includes(normalizedSearch)
            )

        const matchesOwner =
            ownerFilter === 'all' || property.owners?.some((o) => o.owner_id === ownerFilter)

        const matchesVacant =
            !onlyVacant || (property.units?.some((u) => u.status === 'vacant') ?? false)

        return matchesSearch && matchesOwner && matchesVacant
    })

    const requestUnitSort = (key: UnitSortKey) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (unitSortConfig && unitSortConfig.key === key && unitSortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setUnitSortConfig({ key, direction })
    }

    const sortedProperties = [...filteredProperties].sort((a, b) => {
        const { key, direction } = propertySortConfig
        let cmp = 0
        if (key === 'name') {
            cmp = a.name.localeCompare(b.name)
        } else if (key === 'property_type') {
            cmp = (a.property_type?.label || '').localeCompare(b.property_type?.label || '')
        } else if (key === 'units_count') {
            cmp = (a.units?.length || 0) - (b.units?.length || 0)
        } else if (key === 'vacant_count') {
            const aVac = a.units?.filter((u) => u.status === 'vacant').length || 0
            const bVac = b.units?.filter((u) => u.status === 'vacant').length || 0
            cmp = aVac - bVac
        }
        return direction === 'asc' ? cmp : -cmp
    })

    const totalPages = Math.max(1, Math.ceil(sortedProperties.length / itemsPerPage))
    const currentProperties = sortedProperties.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Handlers
    const handleCreate = () => {
        setDialogMode("create")
        setSelectedProperty(undefined)
        setIsDialogOpen(true)
    }

    const handleEdit = (property: Property) => {
        setDialogMode("edit")
        setSelectedProperty(property)
        setIsDialogOpen(true)
    }

    const handleFormSubmit = async (data: Record<string, unknown>) => {
        try {
            if (dialogMode === 'create') {
                await createProperty(data)
            } else if (dialogMode === 'edit' && selectedProperty) {
                await updateProperty(selectedProperty.id, data)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleOpenCreateUnit = (propertyId: string, propertyName: string) => {
        setUnitDialogMode("create")
        setSelectedPropertyId(propertyId)
        setSelectedBuildingName(propertyName)
        setSelectedUnit(null)
        setUnitName("")
        setUnitType("apartment")
        setUnitStatus("vacant")
        setUnitRent("")
        setUnitArea("")
        setUnitFloor("")
        setIsUnitDialogOpen(true)
    }

    const handleOpenEditUnit = (unit: Unit, propertyName: string) => {
        setUnitDialogMode("edit")
        setSelectedPropertyId(unit.property_id)
        setSelectedBuildingName(propertyName)
        setSelectedUnit(unit)
        setUnitName(unit.name)
        setUnitType(unit.type)
        setUnitStatus(unit.status)
        setUnitRent((unit.activeRentAmount ?? unit.default_rent_amount)?.toString() || "")
        setUnitArea(unit.area?.toString() || "")
        setUnitFloor(unit.floor || "")
        setIsUnitDialogOpen(true)
    }

    const handleUnitSubmit = async () => {
        if (!unitName || (!selectedPropertyId && unitDialogMode === 'create')) {
            toast.error("El nombre de la unidad y la propiedad son obligatorios.")
            return
        }

        const payload = {
            name: unitName,
            type: unitType,
            status: unitStatus,
            default_rent_amount: unitRent ? parseFloat(unitRent) : null,
            area: unitArea ? parseFloat(unitArea) : null,
            floor: unitFloor,
            ...(unitDialogMode === 'create' ? { property_id: selectedPropertyId } : {})
        }

        try {
            if (unitDialogMode === 'create') {
                await createUnit(payload)
                toast.success("Unidad creada exitosamente.")
            } else if (selectedUnit) {
                await updateUnit(selectedUnit.id, payload)
                toast.success("Unidad actualizada exitosamente.")
            }
            setIsUnitDialogOpen(false)
        } catch (error) {
            console.error("Error submitting unit:", error)
            toast.error("Error al guardar la unidad.")
        }
    }

    const confirmDelete = (id: string, name: string, type: 'property' | 'unit') => {
        setItemToDelete({ id, name, type })
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (itemToDelete) {
            try {
                if (itemToDelete.type === 'property') {
                    await deleteProperty(itemToDelete.id)
                    toast.success("Inmueble eliminado exitosamente.")
                } else {
                    await deleteUnit(itemToDelete.id)
                    toast.success("Unidad eliminada exitosamente.")
                }
                setIsDeleteDialogOpen(false)
                setItemToDelete(null)
            } catch (error) {
                console.error("Error deleting item:", error)
                toast.error("Error al eliminar el elemento.")
            }
        }
    }

    const getPropertyIcon = (typeName?: string) => {
        if (typeName === 'building' || typeName === 'commercial_center') {
            return <Building className="h-4 w-4 text-primary" />
        }
        return <Home className="h-4 w-4 text-primary" />
    }

    return (
        <div className="container mx-auto px-4 md:px-6 py-2 space-y-4">
            {/* Compact Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inmuebles</h1>
                    <p className="text-xs text-muted-foreground">
                        Gestión jerárquica de edificios, oficinas, galpones y sus unidades.
                    </p>
                </div>
                <Button size="sm" className="h-9 self-start sm:self-auto" onClick={handleCreate}>
                    <Plus className="mr-1.5 h-4 w-4" /> Agregar Propiedad
                </Button>
            </div>

            {/* Compact Portfolio Summary Strip + Quick Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => { setOnlyVacant(false); setCurrentPage(1) }}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors",
                            !onlyVacant
                                ? "bg-foreground text-background border-foreground"
                                : "bg-background text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="tabular-nums">{properties.length} inmuebles</span>
                        <span className="opacity-60">·</span>
                        <span className="tabular-nums">{totalUnitsAll} unidades ({occupancyPct}% ocup.)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setOnlyVacant((v) => !v); setCurrentPage(1) }}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors tabular-nums",
                            onlyVacant
                                ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-background text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span>Con vacantes</span>
                        <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                            {vacantUnitsAll}
                        </span>
                    </button>
                </div>

                {/* Unified Filters */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <Select
                        value={ownerFilter}
                        onValueChange={(val) => { setOwnerFilter(val); setCurrentPage(1) }}
                    >
                        <SelectTrigger className="h-9 w-full sm:w-[175px] text-xs">
                            <SelectValue placeholder="Propietario" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los propietarios</SelectItem>
                            {uniqueOwners.map((o) => (
                                <SelectItem key={o.owner_id} value={o.owner_id}>{o.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={`${propertySortConfig.key}-${propertySortConfig.direction}`}
                        onValueChange={(val) => {
                            const [key, direction] = val.split('-')
                            setPropertySortConfig({
                                key: key as PropertySortKey,
                                direction: direction as 'asc' | 'desc'
                            })
                        }}
                    >
                        <SelectTrigger className="h-9 w-full sm:w-[165px] text-xs">
                            <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
                            <SelectItem value="property_type-asc">Tipo (A-Z)</SelectItem>
                            <SelectItem value="units_count-desc">Más unidades</SelectItem>
                            <SelectItem value="vacant_count-desc">Más vacantes</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar inmueble, unidad, inquilino..."
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

            {/* Accordion List Card */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="divide-y p-4 space-y-3 animate-pulse">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-muted" />
                                        <div className="space-y-1.5">
                                            <div className="h-4 w-44 rounded bg-muted" />
                                            <div className="h-3 w-56 rounded bg-muted" />
                                        </div>
                                    </div>
                                    <div className="h-6 w-40 rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    ) : sortedProperties.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <Building2 className="h-8 w-8 mb-2 opacity-30" />
                            <p className="text-sm font-medium text-foreground">No se encontraron inmuebles</p>
                            <p className="text-xs">Prueba ajustar los filtros o registra una nueva propiedad.</p>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full divide-y">
                            {currentProperties.map((property) => {
                                const unitCount = property.units?.length || 0
                                const occupiedCount = property.units?.filter((u) => u.status === 'occupied').length || 0
                                const vacantCount = property.units?.filter((u) => u.status === 'vacant').length || 0
                                const propOccPct = unitCount > 0 ? Math.round((occupiedCount / unitCount) * 100) : 0

                                const sortedUnits = property.units
                                    ? [...property.units].sort((a, b) => {
                                          if (!unitSortConfig) return 0
                                          const { key, direction } = unitSortConfig
                                          let cmp = 0
                                          if (key === 'default_rent_amount') {
                                              const aVal = Number(a.activeRentAmount ?? a.default_rent_amount ?? 0)
                                              const bVal = Number(b.activeRentAmount ?? b.default_rent_amount ?? 0)
                                              cmp = aVal - bVal
                                          } else if (key === 'name') {
                                              cmp = a.name.localeCompare(b.name, undefined, { numeric: true })
                                          } else if (key === 'type') {
                                              cmp = a.type.localeCompare(b.type)
                                          } else if (key === 'status') {
                                              cmp = a.status.localeCompare(b.status)
                                          }
                                          return direction === 'asc' ? cmp : -cmp
                                      })
                                    : []

                                return (
                                    <AccordionItem key={property.id} value={property.id} className="border-0 px-4">
                                        <AccordionTrigger className="hover:no-underline py-3.5">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full pr-3 text-left">
                                                {/* Left: Identity + Type + Address */}
                                                <div className="flex items-start sm:items-center gap-3 min-w-0 lg:w-[38%]">
                                                    <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                                                        {getPropertyIcon(property.property_type?.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-sm truncate">
                                                                {property.name}
                                                            </span>
                                                            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-4 capitalize">
                                                                {property.property_type?.label || 'Sin clasificar'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{property.address}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Center: Owners */}
                                                <div className="min-w-0 lg:w-[24%] lg:border-l lg:pl-3">
                                                    {property.owners && property.owners.length > 0 ? (
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[11px] text-muted-foreground">Propietario</span>
                                                            <span className="text-xs font-medium truncate" title={property.owners.map((o) => o.name).join(', ')}>
                                                                {property.owners.map((o) => o.name).join(', ')}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">Sin propietario</span>
                                                    )}
                                                </div>

                                                {/* Right: Metrics + Area + Actions */}
                                                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 lg:w-[38%]">
                                                    <div className="flex items-center gap-3 tabular-nums">
                                                        <div className="flex flex-col min-w-[92px]">
                                                            <div className="flex items-center justify-between text-xs gap-2">
                                                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                                    {occupiedCount}/{unitCount}
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground">
                                                                    {vacantCount > 0 ? `${vacantCount} vac.` : 'Lleno'}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500"
                                                                    style={{ width: `${propOccPct}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="text-right min-w-[64px] border-l pl-3">
                                                            <div className="text-[10px] text-muted-foreground">Área</div>
                                                            <div className="text-xs font-medium">
                                                                {property.total_area ? `${property.total_area} m²` : '—'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="flex items-center gap-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            title="Ver detalle del inmueble"
                                                            className="inline-flex items-center justify-center rounded-md hover:bg-accent h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                                                            onClick={() => router.push(`/properties/${property.id}`)}
                                                            onKeyDown={(e) => e.key === 'Enter' && router.push(`/properties/${property.id}`)}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            title="Editar inmueble"
                                                            className="inline-flex items-center justify-center rounded-md hover:bg-accent h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleEdit(property)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleEdit(property)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </div>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            title="Eliminar inmueble"
                                                            className="inline-flex items-center justify-center rounded-md hover:bg-destructive/10 h-8 w-8 text-destructive cursor-pointer"
                                                            onClick={() => confirmDelete(property.id, property.name, 'property')}
                                                            onKeyDown={(e) => e.key === 'Enter' && confirmDelete(property.id, property.name, 'property')}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent className="pb-4 pt-1">
                                            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-semibold text-muted-foreground">
                                                        Unidades / espacios arrendables ({unitCount})
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs"
                                                        onClick={() => handleOpenCreateUnit(property.id, property.name)}
                                                    >
                                                        <Plus className="mr-1 h-3 w-3" /> Agregar unidad
                                                    </Button>
                                                </div>

                                                {property.units && property.units.length > 0 ? (
                                                    <div className="rounded-md border bg-background overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                    <TableHead>
                                                                        <Button variant="ghost" onClick={() => requestUnitSort('name')} className="hover:bg-transparent px-0 font-semibold h-auto py-1 text-xs">
                                                                            Unidad <ArrowUpDown className="ml-1.5 h-3 w-3" />
                                                                        </Button>
                                                                    </TableHead>
                                                                    <TableHead>
                                                                        <Button variant="ghost" onClick={() => requestUnitSort('type')} className="hover:bg-transparent px-0 font-semibold h-auto py-1 text-xs">
                                                                            Tipo <ArrowUpDown className="ml-1.5 h-3 w-3" />
                                                                        </Button>
                                                                    </TableHead>
                                                                    <TableHead>
                                                                        <Button variant="ghost" onClick={() => requestUnitSort('status')} className="hover:bg-transparent px-0 font-semibold h-auto py-1 text-xs">
                                                                            Estado / Inquilino <ArrowUpDown className="ml-1.5 h-3 w-3" />
                                                                        </Button>
                                                                    </TableHead>
                                                                    <TableHead className="text-right">
                                                                        <Button variant="ghost" onClick={() => requestUnitSort('default_rent_amount')} className="hover:bg-transparent px-0 font-semibold h-auto py-1 text-xs">
                                                                            Canon <ArrowUpDown className="ml-1.5 h-3 w-3" />
                                                                        </Button>
                                                                    </TableHead>
                                                                    <TableHead className="text-right text-xs font-semibold">Acciones</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {sortedUnits.map((unit) => {
                                                                    const displayRent = unit.activeRentAmount ?? unit.default_rent_amount
                                                                    return (
                                                                        <TableRow key={unit.id}>
                                                                            <TableCell className="font-medium text-sm">
                                                                                {unit.name}
                                                                                {unit.floor && (
                                                                                    <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
                                                                                        Piso {unit.floor}
                                                                                    </span>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="text-xs text-muted-foreground">
                                                                                {unit.type === 'apartment'
                                                                                    ? 'Apartamento'
                                                                                    : unit.type === 'office'
                                                                                        ? 'Oficina'
                                                                                        : unit.type === 'local'
                                                                                            ? 'Local'
                                                                                            : 'Bodega'}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className={cn(
                                                                                            "text-[11px] font-medium",
                                                                                            unit.status === 'occupied'
                                                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                                                                : unit.status === 'maintenance'
                                                                                                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                                                                                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                                                                                        )}
                                                                                    >
                                                                                        {unit.status === 'vacant'
                                                                                            ? 'Vacante'
                                                                                            : unit.status === 'occupied'
                                                                                                ? 'Ocupada'
                                                                                                : unit.status === 'maintenance'
                                                                                                    ? 'Mantenimiento'
                                                                                                    : unit.status}
                                                                                    </Badge>
                                                                                    {unit.isOccupied && unit.tenantName && (
                                                                                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1 truncate max-w-[200px]" title={unit.tenantName}>
                                                                                            <User className="h-3 w-3 shrink-0" />
                                                                                            {unit.tenantName}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="text-right font-medium text-sm tabular-nums whitespace-nowrap">
                                                                                {displayRent != null ? formatCurrency(Number(displayRent), 'USD') : '—'}
                                                                            </TableCell>
                                                                            <TableCell className="text-right">
                                                                                <div className="flex justify-end gap-1">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-7 w-7"
                                                                                        onClick={() => handleOpenEditUnit(unit, property.name)}
                                                                                        title="Editar unidad"
                                                                                    >
                                                                                        <Edit className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                                                        onClick={() => confirmDelete(unit.id, unit.name, 'unit')}
                                                                                        title="Eliminar unidad"
                                                                                    >
                                                                                        <Trash className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground italic py-2">
                                                        No hay unidades registradas en este inmueble.
                                                    </div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    )}

                    {/* Pagination Footer */}
                    {!loading && sortedProperties.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t text-xs text-muted-foreground">
                            <div className="tabular-nums">
                                Mostrando <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                                <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, sortedProperties.length)}</span> de{' '}
                                <span className="font-medium text-foreground">{sortedProperties.length}</span> inmuebles
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

            {/* Property Dialog */}
            <PropertyDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                property={selectedProperty}
                propertyTypes={propertyTypes}
                onSubmit={handleFormSubmit}
            />

            {/* Unit Dialog */}
            <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {unitDialogMode === 'create' ? 'Agregar Unidad' : 'Editar Unidad'} — {selectedBuildingName}
                        </DialogTitle>
                        <DialogDescription>Gestione los detalles de la unidad.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-name" className="text-right">Nombre/N°</Label>
                            <Input id="unit-name" value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="Ej. Apto 101" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-type" className="text-right">Tipo</Label>
                            <Select value={unitType} onValueChange={setUnitType}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="apartment">Apartamento</SelectItem>
                                    <SelectItem value="office">Oficina</SelectItem>
                                    <SelectItem value="local">Local</SelectItem>
                                    <SelectItem value="storage">Bodega</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-status" className="text-right">Estado</Label>
                            <Select value={unitStatus} onValueChange={setUnitStatus}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vacant">Vacante</SelectItem>
                                    <SelectItem value="occupied">Ocupada</SelectItem>
                                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-rent" className="text-right">Canon ($)</Label>
                            <Input id="unit-rent" type="number" value={unitRent} onChange={(e) => setUnitRent(e.target.value)} placeholder="0.00" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-area" className="text-right">Área (m²)</Label>
                            <Input id="unit-area" type="number" value={unitArea} onChange={(e) => setUnitArea(e.target.value)} placeholder="0.00" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-floor" className="text-right">Piso</Label>
                            <Input id="unit-floor" value={unitFloor} onChange={(e) => setUnitFloor(e.target.value)} placeholder="Ej. 1" className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUnitDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleUnitSubmit}>
                            {unitDialogMode === 'create' ? 'Guardar Unidad' : 'Actualizar Unidad'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la {itemToDelete?.type === 'property' ? 'propiedad' : 'unidad'}{' '}
                            <strong>{itemToDelete?.name}</strong> y todos sus datos asociados.
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
