'use client'

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Plus,
    Search,
    Mail,
    Phone,
    User,
    Building,
    Edit,
    Trash,
    FileText,
    MapPin,
    ChevronLeft,
    ChevronRight,
    X,
    ExternalLink
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { OwnerDialog } from "@/components/owners/owner-dialog"
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
import { useOwners } from "@/hooks/use-owners"
import { Owner } from "@/types/owner"
import { cn } from "@/lib/utils"

type OwnerTypeFilter = 'all' | 'individual' | 'company'
type OwnerSortOption = 'name-asc' | 'name-desc' | 'properties-desc' | 'vacant-desc'

/**
 * Página de gestión de propietarios.
 * Directorio jerárquico (Propietario → Inmuebles) con filtros por tipo,
 * ordenamiento funcional, indicador de acceso al portal y enlaces directos a cada inmueble.
 */
export default function OwnersPage() {
    const { owners, loading, createOwner, updateOwner, deleteOwner, fetchOwners } = useOwners()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create")
    const [selectedOwner, setSelectedOwner] = useState<Owner | undefined>(undefined)

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [ownerToDelete, setOwnerToDelete] = useState<{ id: string; name: string } | null>(null)

    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState<OwnerTypeFilter>("all")
    const [sortOption, setSortOption] = useState<OwnerSortOption>("name-asc")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    const normalizedSearch = searchTerm.toLowerCase().trim()
    const baseFilteredOwners = owners.filter(
        (owner) =>
            !normalizedSearch ||
            owner.name.toLowerCase().includes(normalizedSearch) ||
            owner.doc_id.toLowerCase().includes(normalizedSearch) ||
            (owner.email?.toLowerCase().includes(normalizedSearch) ?? false) ||
            (owner.phone?.toLowerCase().includes(normalizedSearch) ?? false)
    )

    const individualCount = baseFilteredOwners.filter((o) => o.type === 'individual').length
    const companyCount = baseFilteredOwners.filter((o) => o.type === 'company').length

    const filteredOwners = baseFilteredOwners.filter((o) =>
        typeFilter === 'all' ? true : o.type === typeFilter
    )

    const getVacantCount = (owner: Owner) =>
        owner.properties?.reduce(
            (sum, p) => sum + (p.units?.filter((u) => u.status === 'vacant').length || 0),
            0
        ) || 0

    const sortedOwners = [...filteredOwners].sort((a, b) => {
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name)
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name)
        if (sortOption === 'properties-desc') return (b.properties?.length || 0) - (a.properties?.length || 0)
        if (sortOption === 'vacant-desc') return getVacantCount(b) - getVacantCount(a)
        return 0
    })

    const totalPages = Math.max(1, Math.ceil(sortedOwners.length / itemsPerPage))
    const currentPageOwners = sortedOwners.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleCreate = () => {
        setDialogMode("create")
        setSelectedOwner(undefined)
        setIsDialogOpen(true)
    }

    const handleViewDetails = (owner: Owner) => {
        setDialogMode("view")
        setSelectedOwner(owner)
        setIsDialogOpen(true)
    }

    const handleEdit = (owner: Owner) => {
        setDialogMode("edit")
        setSelectedOwner(owner)
        setIsDialogOpen(true)
    }

    const confirmDelete = (id: string, name: string) => {
        setOwnerToDelete({ id, name })
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (ownerToDelete) {
            try {
                await deleteOwner(ownerToDelete.id)
                setIsDeleteDialogOpen(false)
                setOwnerToDelete(null)
            } catch {
                // Error handled in hook
            }
        }
    }

    const handleDialogSubmit = async (data: Omit<Owner, 'id' | 'created_at' | 'properties'>) => {
        if (dialogMode === 'create') {
            await createOwner(data)
        } else if (dialogMode === 'edit' && selectedOwner) {
            await updateOwner(selectedOwner.id, data)
        }
        setIsDialogOpen(false)
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    return (
        <div className="container mx-auto px-4 md:px-6 py-2 space-y-4">
            {/* Compact Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Propietarios</h1>
                    <p className="text-xs text-muted-foreground">
                        Directorio de propietarios, acceso al portal e inmuebles asociados.
                    </p>
                </div>
                <Button size="sm" className="h-9 self-start sm:self-auto" onClick={handleCreate}>
                    <Plus className="mr-1.5 h-4 w-4" /> Registrar Propietario
                </Button>
            </div>

            {/* Unified Toolbar: Type Pills + Sort + Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                        type="button"
                        onClick={() => { setTypeFilter('all'); setCurrentPage(1) }}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors tabular-nums",
                            typeFilter === 'all'
                                ? "bg-foreground text-background border-foreground"
                                : "bg-background text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span>Todos</span>
                        <span className="opacity-75">({baseFilteredOwners.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTypeFilter('individual'); setCurrentPage(1) }}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors tabular-nums",
                            typeFilter === 'individual'
                                ? "bg-primary/10 text-primary border-primary/40"
                                : "bg-background text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <User className="h-3 w-3" />
                        <span>Personas</span>
                        <span className="font-semibold">{individualCount}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTypeFilter('company'); setCurrentPage(1) }}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors tabular-nums",
                            typeFilter === 'company'
                                ? "bg-primary/10 text-primary border-primary/40"
                                : "bg-background text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Building className="h-3 w-3" />
                        <span>Empresas</span>
                        <span className="font-semibold">{companyCount}</span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={sortOption}
                        onValueChange={(val) => setSortOption(val as OwnerSortOption)}
                    >
                        <SelectTrigger className="h-9 w-full sm:w-[165px] text-xs">
                            <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
                            <SelectItem value="properties-desc">Más inmuebles</SelectItem>
                            <SelectItem value="vacant-desc">Más vacantes</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar nombre, RIF, correo..."
                            className="h-9 pl-8 pr-8 text-sm"
                            value={searchTerm}
                            onChange={handleSearchChange}
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
                                            <div className="h-3 w-32 rounded bg-muted" />
                                        </div>
                                    </div>
                                    <div className="h-6 w-36 rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    ) : currentPageOwners.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <User className="h-8 w-8 mb-2 opacity-30" />
                            <p className="text-sm font-medium text-foreground">No se encontraron propietarios</p>
                            <p className="text-xs">Prueba ajustar los filtros o registra un nuevo propietario.</p>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full divide-y">
                            {currentPageOwners.map((owner) => {
                                const propCount = owner.properties?.length || 0
                                const occupiedUnitsCount =
                                    owner.properties?.reduce(
                                        (sum, p) => sum + (p.units?.filter((u) => u.status === 'occupied').length || 0),
                                        0
                                    ) || 0
                                const vacantUnitsCount = getVacantCount(owner)

                                return (
                                    <AccordionItem key={owner.id} value={owner.id} className="border-0 px-4">
                                        <AccordionTrigger className="hover:no-underline py-3.5">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full pr-3 text-left">
                                                {/* Left: Identity + Type + Portal status */}
                                                <div className="flex items-start sm:items-center gap-3 min-w-0 lg:w-[40%]">
                                                    <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                                                        {owner.type === 'company' ? (
                                                            <Building className="h-4 w-4 text-primary" />
                                                        ) : (
                                                            <User className="h-4 w-4 text-primary" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-sm truncate">
                                                                {owner.name}
                                                            </span>
                                                            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-4">
                                                                {owner.type === 'company' ? 'Empresa' : 'Natural'}
                                                            </Badge>
                                                            {owner.user_id && (
                                                                <span
                                                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                                                                    title="Tiene acceso habilitado al portal de propietarios"
                                                                >
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                    Portal
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                            {owner.doc_id}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Center: Contact */}
                                                <div className="min-w-0 lg:w-[28%] lg:border-l lg:pl-3">
                                                    {owner.email || owner.phone ? (
                                                        <div className="flex flex-col text-xs gap-0.5 min-w-0">
                                                            {owner.email && (
                                                                <span className="flex items-center gap-1.5 text-muted-foreground truncate" title={owner.email}>
                                                                    <Mail className="h-3 w-3 shrink-0" />
                                                                    <span className="truncate">{owner.email}</span>
                                                                </span>
                                                            )}
                                                            {owner.phone && (
                                                                <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
                                                                    <Phone className="h-3 w-3 shrink-0" />
                                                                    <span>{owner.phone}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">Sin contacto</span>
                                                    )}
                                                </div>

                                                {/* Right: Stats + Actions */}
                                                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 lg:w-[32%]">
                                                    <div className="flex items-center gap-4 text-center tabular-nums">
                                                        <div>
                                                            <div className="text-[10px] text-muted-foreground">Inmuebles</div>
                                                            <div className="text-sm font-semibold">{propCount}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-muted-foreground">Ocupadas</div>
                                                            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                                                {occupiedUnitsCount}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-muted-foreground">Vacantes</div>
                                                            <div
                                                                className={cn(
                                                                    "text-sm font-semibold",
                                                                    vacantUnitsCount > 0
                                                                        ? "text-amber-700 dark:text-amber-400"
                                                                        : "text-muted-foreground"
                                                                )}
                                                            >
                                                                {vacantUnitsCount}
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
                                                            title="Ver ficha y cuentas bancarias"
                                                            className="inline-flex items-center justify-center rounded-md hover:bg-accent h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleViewDetails(owner)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleViewDetails(owner)}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            title="Editar propietario"
                                                            className="inline-flex items-center justify-center rounded-md hover:bg-accent h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleEdit(owner)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleEdit(owner)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </div>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            title="Eliminar propietario"
                                                            className="inline-flex items-center justify-center rounded-md hover:bg-destructive/10 h-8 w-8 text-destructive cursor-pointer"
                                                            onClick={() => confirmDelete(owner.id, owner.name)}
                                                            onKeyDown={(e) => e.key === 'Enter' && confirmDelete(owner.id, owner.name)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent className="pb-4 pt-1">
                                            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2.5">
                                                <div className="text-xs font-semibold text-muted-foreground">
                                                    Inmuebles asociados ({propCount})
                                                </div>

                                                {owner.properties && owner.properties.length > 0 ? (
                                                    <div className="rounded-md border bg-background overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                    <TableHead className="text-xs font-semibold">Nombre</TableHead>
                                                                    <TableHead className="text-xs font-semibold">Dirección</TableHead>
                                                                    <TableHead className="text-center text-xs font-semibold">Ocupadas</TableHead>
                                                                    <TableHead className="text-center text-xs font-semibold">Vacantes</TableHead>
                                                                    <TableHead className="text-right text-xs font-semibold">Detalle</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {owner.properties.map((property) => {
                                                                    const occupied = property.units?.filter((u) => u.status === 'occupied').length || 0
                                                                    const vacant = property.units?.filter((u) => u.status === 'vacant').length || 0

                                                                    return (
                                                                        <TableRow key={property.id}>
                                                                            <TableCell className="font-medium text-sm">
                                                                                <Link
                                                                                    href={`/properties/${property.id}`}
                                                                                    className="hover:text-primary hover:underline"
                                                                                >
                                                                                    {property.name}
                                                                                </Link>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                                                    {property.address}
                                                                                </span>
                                                                            </TableCell>
                                                                            <TableCell className="text-center tabular-nums">
                                                                                <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                                                                                    {occupied}
                                                                                </span>
                                                                            </TableCell>
                                                                            <TableCell className="text-center tabular-nums">
                                                                                <span
                                                                                    className={cn(
                                                                                        "font-semibold text-sm",
                                                                                        vacant > 0
                                                                                            ? "text-amber-700 dark:text-amber-400"
                                                                                            : "text-muted-foreground"
                                                                                    )}
                                                                                >
                                                                                    {vacant}
                                                                                </span>
                                                                            </TableCell>
                                                                            <TableCell className="text-right">
                                                                                <Link
                                                                                    href={`/properties/${property.id}`}
                                                                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                                                                >
                                                                                    Ver
                                                                                    <ExternalLink className="h-3 w-3" />
                                                                                </Link>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground italic py-2">
                                                        No hay inmuebles registrados para este propietario.
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
                    {!loading && sortedOwners.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t text-xs text-muted-foreground">
                            <div className="tabular-nums">
                                Mostrando <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                                <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, sortedOwners.length)}</span> de{' '}
                                <span className="font-medium text-foreground">{sortedOwners.length}</span> propietarios
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

            <OwnerDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                owner={selectedOwner}
                onSubmit={handleDialogSubmit}
                onOwnerUpdated={fetchOwners}
            />

            {/* Delete Alert */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al propietario{' '}
                            <strong>{ownerToDelete?.name}</strong> y todos sus datos asociados.
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
