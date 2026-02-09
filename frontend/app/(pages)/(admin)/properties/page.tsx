'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, Home, Plus, Edit, Trash, MapPin, User, X, Search, MoreHorizontal, FileText, Briefcase, Warehouse, ChevronLeft, ChevronRight, Loader2, ArrowUpDown } from "lucide-react"
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
import { ExportButtons } from "@/components/export-buttons"
import { useProperties } from "@/hooks/use-properties"
import { Property } from "@/types/property"

/**
 * Página principal de administración de propiedades.
 * Permite listar, crear, editar y eliminar propiedades y sus unidades.
 * Incluye filtrado, paginación y exportación de datos.
 */
export default function PropertiesPage() {
    const { properties, propertyTypes, loading, createProperty, updateProperty, deleteProperty, createUnit, updateUnit, deleteUnit } = useProperties()

    // Property Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create")
    const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(undefined)

    // Unit Dialog State
    const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false)
    const [unitDialogMode, setUnitDialogMode] = useState<"create" | "edit">("create")
    const [selectedPropertyId, setSelectedPropertyId] = useState("")
    const [selectedBuildingName, setSelectedBuildingName] = useState("")
    const [selectedUnit, setSelectedUnit] = useState<any>(null)

    // Unit Form State
    const [unitName, setUnitName] = useState("")
    const [unitType, setUnitType] = useState("apartment")
    const [unitStatus, setUnitStatus] = useState("vacant")
    const [unitRent, setUnitRent] = useState("")
    const [unitArea, setUnitArea] = useState("")
    const [unitFloor, setUnitFloor] = useState("")

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'property' | 'unit' } | null>(null)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(5)
    const [searchTerm, setSearchTerm] = useState("")

    // Filtered Data
    const filteredProperties = properties.filter(property =>
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.property_type?.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sorting State for Properties (List)
    const [propertySortConfig, setPropertySortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' })

    // Sorting State for Units (Table)
    const [unitSortConfig, setUnitSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

    const requestUnitSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (unitSortConfig && unitSortConfig.key === key && unitSortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setUnitSortConfig({ key, direction })
    }

    const sortedProperties = [...filteredProperties].sort((a: any, b: any) => {
        const key = propertySortConfig.key
        let aVal = a[key]
        let bVal = b[key]

        if (key === 'property_type') {
            aVal = a.property_type?.label || ''
            bVal = b.property_type?.label || ''
        }

        if (aVal < bVal) return propertySortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return propertySortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    const totalPages = Math.ceil(sortedProperties.length / itemsPerPage)
    const currentProperties = sortedProperties.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const router = useRouter()

    // Handlers
    const handleCreate = () => {
        setDialogMode("create")
        setSelectedProperty(undefined)
        setIsDialogOpen(true)
    }

    const handleViewDetails = (property: Property) => {
        setDialogMode("view")
        setSelectedProperty(property)
        setIsDialogOpen(true)
    }

    const handleEdit = (property: Property) => {
        setDialogMode("edit")
        setSelectedProperty(property)
        setIsDialogOpen(true)
    }

    const handleFormSubmit = async (data: any) => {
        try {
            if (dialogMode === 'create') {
                await createProperty(data)
            } else if (dialogMode === 'edit' && selectedProperty) {
                await updateProperty(selectedProperty.id, data)
            }
        } catch (error) {
            console.error(error)
            // Error is handled in the hook
        }
    }

    const handleOpenCreateUnit = (propertyId: string, propertyName: string) => {
        setUnitDialogMode("create")
        setSelectedPropertyId(propertyId)
        setSelectedBuildingName(propertyName)
        setSelectedUnit(null)
        // Reset form
        setUnitName("")
        setUnitType("apartment")
        setUnitStatus("vacant")
        setUnitRent("")
        setUnitArea("")
        setUnitFloor("")

        setIsUnitDialogOpen(true)
    }

    const handleOpenEditUnit = (unit: any, propertyName: string) => {
        setUnitDialogMode("edit")
        setSelectedPropertyId(unit.property_id) // Ensure property_id is set for edit
        setSelectedBuildingName(propertyName)
        setSelectedUnit(unit)
        // Populate form
        setUnitName(unit.name)
        setUnitType(unit.type)
        setUnitStatus(unit.status)
        setUnitRent(unit.default_rent_amount?.toString() || "")
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
                    toast.success("Propiedad eliminada exitosamente.")
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
        if (typeName === 'building' || typeName === 'commercial_center') return <Building className="h-5 w-5 text-primary" />
        if (typeName === 'standalone') return <Home className="h-5 w-5 text-primary" />
        return <Home className="h-5 w-5 text-primary" />
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Propiedades</h1>
                    <p className="text-muted-foreground">
                        Gestión jerárquica de edificios, oficinas, galpones y unidades.
                    </p>
                </div>
                <div className="flex gap-2">
                    <ExportButtons
                        data={properties}
                        filename="propiedades"
                        columns={[
                            { header: "Nombre", key: "name" },
                            { header: "Tipo", key: "property_type.label" },
                            { header: "Dirección", key: "address" },
                            { header: "Niveles", key: "floors" },
                            { 
                                header: "Resumen Unidades", 
                                key: "units", 
                                transform: (u: any[]) => {
                                    if (!u) return "0";
                                    const total = u.length;
                                    const occ = u.filter((getItem: any) => getItem.status === 'occupied').length;
                                    const vac = u.filter((getItem: any) => getItem.status === 'vacant').length;
                                    return `${total} (${occ} Oc, ${vac} Vac)`;
                                }
                            },
                            { 
                                header: "Detalle Unidades", 
                                key: "units", 
                                transform: (u: any[]) => {
                                    if (!u) return "-";
                                    return u.map((unit: any) => {
                                        const status = unit.status === 'occupied' ? 'Ocupada' : 'Vacante';
                                        const tenant = unit.tenantName ? ` - ${unit.tenantName}` : '';
                                        return `${unit.name} (${status})${tenant}`;
                                    }).join('\n');
                                }
                            },
                        ]}
                        title="Reporte de Propiedades"
                    />
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Propiedad
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Portafolio de Inmuebles</CardTitle>
                            <CardDescription>Vista general de propiedades.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select
                                value={`${propertySortConfig.key}-${propertySortConfig.direction}`}
                                onValueChange={(val) => {
                                    const [key, direction] = val.split('-')
                                    setPropertySortConfig({ key, direction: direction as 'asc' | 'desc' })
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Ordenar por" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
                                    <SelectItem value="property_type-asc">Tipo (A-Z)</SelectItem>
                                    <SelectItem value="property_type-desc">Tipo (Z-A)</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar propiedad..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : sortedProperties.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No se encontraron propiedades.
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {currentProperties.map((property) => {
                                const sortedUnits = property.units ? [...property.units].sort((a: any, b: any) => {
                                    if (!unitSortConfig) return 0

                                    let aVal = a[unitSortConfig.key]
                                    let bVal = b[unitSortConfig.key]

                                    // Handle numeric comparison for rent
                                    if (unitSortConfig.key === 'default_rent_amount') {
                                        aVal = Number(aVal || 0)
                                        bVal = Number(bVal || 0)
                                    }

                                    if (aVal < bVal) return unitSortConfig.direction === 'asc' ? -1 : 1
                                    if (aVal > bVal) return unitSortConfig.direction === 'asc' ? 1 : -1
                                    return 0
                                }) : []

                                return (
                                    <AccordionItem key={property.id} value={property.id}>
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-primary/10 p-2 rounded-lg">
                                                        {getPropertyIcon(property.property_type?.name)}
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-semibold text-lg">{property.name}</div>
                                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" /> {property.address}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1 capitalize">
                                                            {property.property_type?.label || 'Sin Clasificar'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 text-sm">
                                                    <div className="flex flex-col items-end min-w-[100px]">
                                                        <span className="text-muted-foreground text-xs">Unidades</span>
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-medium text-base">{property.units?.length || 0}</span>
                                                            {property.units && property.units.length > 0 && (
                                                                <div className="flex gap-2 text-[10px] text-muted-foreground">
                                                                    <span className="text-green-600 font-medium">
                                                                        {property.units.filter((u: any) => u.status === 'occupied').length} Oc
                                                                    </span>
                                                                    <span className="text-muted-foreground">/</span>
                                                                    <span>
                                                                        {property.units.filter((u: any) => u.status === 'vacant').length} Vac
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-muted-foreground text-xs">Área Total</span>
                                                        <span className="font-medium">
                                                            {property.total_area ? `${property.total_area} m²` : '-'}
                                                        </span>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <div
                                                            role="button"
                                                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 cursor-pointer"
                                                            onClick={() => router.push(`/properties/${property.id}`)}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <div
                                                            role="button"
                                                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 cursor-pointer"
                                                            onClick={() => handleEdit(property)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </div>
                                                        <div
                                                            role="button"
                                                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                                                            onClick={() => confirmDelete(property.id, property.name, 'property')}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-4 pt-2">
                                            <div className="pl-14 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-sm font-semibold text-muted-foreground">Unidades / Espacios Arrendables</h4>
                                                    <Button size="sm" variant="outline" onClick={() => handleOpenCreateUnit(property.id, property.name)}>
                                                        <Plus className="mr-2 h-3 w-3" /> Agregar Unidad
                                                    </Button>
                                                </div>

                                                {/* Units Table */}
                                                {property.units && property.units.length > 0 ? (
                                                    <div className="border rounded-md">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>
                                                                        <Button variant="ghost" onClick={() => requestUnitSort('name')} className="hover:bg-transparent px-0 font-bold h-auto py-1">
                                                                            Unidad
                                                                            <ArrowUpDown className="ml-2 h-3 w-3" />
                                                                        </Button>
                                                                    </TableHead>
                                                                    <TableHead>
                                                                        <Button variant="ghost" onClick={() => requestUnitSort('type')} className="hover:bg-transparent px-0 font-bold h-auto py-1">
                                                                            Tipo
                                                                            <ArrowUpDown className="ml-2 h-3 w-3" />
                                                                        </Button>
                                                                    </TableHead>
                                                                    <TableHead>
                                                                        <Button variant="ghost" onClick={() => requestUnitSort('status')} className="hover:bg-transparent px-0 font-bold h-auto py-1">
                                                                            Estado
                                                                            <ArrowUpDown className="ml-2 h-3 w-3" />
                                                                        </Button>
                                                                    </TableHead>
                                                                    <TableHead className="text-right">
                                                                        <Button variant="ghost" onClick={() => requestUnitSort('default_rent_amount')} className="hover:bg-transparent px-0 font-bold h-auto py-1">
                                                                            Canon Base
                                                                            <ArrowUpDown className="ml-2 h-3 w-3" />
                                                                        </Button>
                                                                    </TableHead>
                                                                    <TableHead className="text-right">Acciones</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {sortedUnits.map((unit: any) => (
                                                                    <TableRow key={unit.id}>
                                                                        <TableCell className="font-medium">{unit.name}</TableCell>
                                                                        <TableCell className="capitalize">
                                                                            {unit.type === 'apartment' ? 'Apartamento' : unit.type === 'office' ? 'Oficina' : unit.type === 'local' ? 'Local' : 'Bodega'}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge variant={unit.status === 'vacant' ? 'secondary' : 'default'} className="capitalize">
                                                                                {unit.status === 'vacant' ? 'Vacante' : unit.status}
                                                                            </Badge>
                                                                            {unit.isOccupied && unit.tenantName && (
                                                                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                                                    <User className="h-3 w-3" />
                                                                                    <span className="truncate max-w-[150px]" title={unit.tenantName}>
                                                                                        {unit.tenantName}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {unit.default_rent_amount ? `$${unit.default_rent_amount}` : '-'}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <div className="flex justify-end gap-2">
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditUnit(unit, property.name)}>
                                                                                    <Edit className="h-4 w-4" />
                                                                                </Button>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirmDelete(unit.id, unit.name, 'unit')}>
                                                                                    <Trash className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground italic">
                                                        No hay unidades registradas.
                                                    </div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    )}
                </CardContent>
                {totalPages > 1 && (
                    <CardFooter className="flex justify-between items-center">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredProperties.length)} de {filteredProperties.length} propiedades
                            </span>
                            <div className="flex items-center gap-2">
                                <span>Filas por página:</span>
                                <Select
                                    value={itemsPerPage.toString()}
                                    onValueChange={(val) => {
                                        setItemsPerPage(Number(val))
                                        setCurrentPage(1)
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue placeholder={itemsPerPage.toString()} />
                                    </SelectTrigger>
                                    <SelectContent side="top">
                                        {[5, 10, 20, 50, 100].map((pageSize) => (
                                            <SelectItem key={pageSize} value={pageSize.toString()}>
                                                {pageSize}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm font-medium">
                                Página {currentPage} de {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                )}
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
                        <DialogTitle>{unitDialogMode === 'create' ? 'Agregar Unidad' : 'Editar Unidad'} - {selectedBuildingName}</DialogTitle>
                        <DialogDescription>Gestione los detalles de la unidad.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-name" className="text-right">Nombre/N°</Label>
                            <Input id="unit-name" value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="Ej. Apto 101" className="col-span-3" />
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
                            <Label htmlFor="unit-rent" className="text-right">Canon</Label>
                            <Input id="unit-rent" type="number" value={unitRent} onChange={e => setUnitRent(e.target.value)} placeholder="0.00" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-area" className="text-right">Área</Label>
                            <Input id="unit-area" type="number" value={unitArea} onChange={e => setUnitArea(e.target.value)} placeholder="0.00" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-floor" className="text-right">Piso</Label>
                            <Input id="unit-floor" value={unitFloor} onChange={e => setUnitFloor(e.target.value)} placeholder="Ej. 1" className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUnitSubmit}>{unitDialogMode === 'create' ? 'Guardar Unidad' : 'Actualizar Unidad'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la {itemToDelete?.type === 'property' ? 'propiedad' : 'unidad'}
                            <strong> {itemToDelete?.name}</strong> y todos sus datos asociados.
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