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
import { Building, Home, Plus, Edit, Trash, MapPin, User, X, Search, MoreHorizontal, FileText, Briefcase, Warehouse, ChevronLeft, ChevronRight } from "lucide-react"
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

// Mock data
const PROPERTIES_DATA = [
    {
        id: "1",
        name: "Torre Empresarial Norte",
        type: "Edificio",
        address: "Av. Principal, Urb. El Valle",
        units: 12,
        occupancy: "85%",
        owners: ["Inversiones Los Andes C.A."],
        status: "Activo"
    },
    {
        id: "2",
        name: "C.C. Plaza - Local 5",
        type: "Local Comercial",
        address: "Calle Real, Centro",
        units: 1,
        occupancy: "0%",
        owners: ["Juan Pérez"],
        status: "Vacante"
    },
    {
        id: "3",
        name: "Residencias El Parque",
        type: "Conjunto Residencial",
        address: "Av. Los Próceres",
        units: 24,
        occupancy: "95%",
        owners: ["Inversiones Los Andes C.A.", "Maria Rodriguez"],
        status: "Activo"
    },
    {
        id: "4",
        name: "Oficinas Centro Financiero",
        type: "Oficina",
        address: "Av. Francisco de Miranda",
        units: 5,
        occupancy: "100%",
        owners: ["Grupo Financiero X"],
        status: "Activo"
    },
    {
        id: "5",
        name: "Galpón Industrial Zona 1",
        type: "Galpón",
        address: "Zona Industrial II",
        units: 1,
        occupancy: "0%",
        owners: ["Logística Express"],
        status: "En Remodelación"
    },
    {
        id: "6",
        name: "Torre B - Oficina 204",
        type: "Oficina",
        address: "Calle 54, Obarrio",
        units: 1,
        occupancy: "100%",
        owners: ["Consultores Asociados"],
        status: "Activo"
    },
    {
        id: "7",
        name: "Depósito Central",
        type: "Galpón",
        address: "Carretera Nacional Km 5",
        units: 3,
        occupancy: "66%",
        owners: ["Almacenes Unidos"],
        status: "Activo"
    },
    {
        id: "8",
        name: "Residencias Vista Mar",
        type: "Edificio",
        address: "Av. Costanera",
        units: 40,
        occupancy: "90%",
        owners: ["Desarrollos Costeros"],
        status: "Activo"
    },
    {
        id: "9",
        name: "Local 12 - Feria de Comida",
        type: "Local Comercial",
        address: "C.C. Metrópolis",
        units: 1,
        occupancy: "100%",
        owners: ["Inversiones Gastronómicas"],
        status: "Activo"
    },
    {
        id: "10",
        name: "Anexo Residencial",
        type: "Casa",
        address: "Urb. La Viña",
        units: 1,
        occupancy: "0%",
        owners: ["Pedro Castillo"],
        status: "Vacante"
    }
]

const ITEMS_PER_PAGE = 5

export default function PropertiesPage() {
    // Property Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create")
    const [selectedProperty, setSelectedProperty] = useState<any>(null)

    // Unit Dialog State (Keeping inline for now as it's specific)
    const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false)
    const [selectedBuilding, setSelectedBuilding] = useState("")

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'property' | 'unit' } | null>(null)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [searchTerm, setSearchTerm] = useState("")

    // Filtered Data
    const filteredProperties = PROPERTIES_DATA.filter(property =>
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.owners.some(owner => owner.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE)
    const currentProperties = filteredProperties.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    const router = useRouter()

    // Handlers
    const handleCreate = () => {
        setDialogMode("create")
        setSelectedProperty(null)
        setIsDialogOpen(true)
    }

    const handleViewDetails = (property: any) => {
        router.push(`/properties/${property.id}`)
    }

    const handleEdit = (property: any) => {
        setDialogMode("edit")
        setSelectedProperty(property)
        setIsDialogOpen(true)
    }

    const handleOpenUnitDialog = (buildingName: string) => {
        setSelectedBuilding(buildingName)
        setIsUnitDialogOpen(true)
    }

    const handleAddUnit = () => {
        setIsUnitDialogOpen(false)
        toast.success(`Unidad agregada a ${selectedBuilding}`)
    }

    const confirmDelete = (id: string, name: string, type: 'property' | 'unit') => {
        setItemToDelete({ id, name, type })
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = () => {
        if (itemToDelete) {
            toast.success(`${itemToDelete.type === 'property' ? 'Propiedad' : 'Unidad'} "${itemToDelete.name}" eliminada.`)
            setIsDeleteDialogOpen(false)
            setItemToDelete(null)
        }
    }

    const getPropertyIcon = (type: string) => {
        if (type.includes("Edificio") || type.includes("Conjunto")) return <Building className="h-5 w-5 text-primary" />
        if (type.includes("Oficina")) return <Briefcase className="h-5 w-5 text-primary" />
        if (type.includes("Galpón") || type.includes("Depósito")) return <Warehouse className="h-5 w-5 text-primary" />
        if (type.includes("Local")) return <Home className="h-5 w-5 text-primary" /> // Using Home as generic for Local for now, or Store if available
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
                        data={PROPERTIES_DATA}
                        filename="propiedades"
                        columns={[
                            { header: "Nombre", key: "name" },
                            { header: "Tipo", key: "type" },
                            { header: "Dirección", key: "address" },
                            { header: "Unidades", key: "units" },
                            { header: "Ocupación", key: "occupancy" },
                            { header: "Estado", key: "status" },
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
                            <CardDescription>Vista general de propiedades y ocupación.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar propiedad..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setCurrentPage(1) // Reset to first page on search
                                }}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {currentProperties.map((property) => (
                            <AccordionItem key={property.id} value={property.id}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary/10 p-2 rounded-lg">
                                                {getPropertyIcon(property.type)}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold text-lg">{property.name}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {property.address}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {property.type}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm">
                                            <div className="flex flex-col items-end">
                                                <span className="text-muted-foreground">Unidades</span>
                                                <span className="font-medium">{property.units}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-muted-foreground">Ocupación</span>
                                                <span className={`font-medium ${parseInt(property.occupancy) > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                    {property.occupancy}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end min-w-[150px]">
                                                <span className="text-muted-foreground">Propietarios</span>
                                                <span className="font-medium truncate max-w-[150px]">{property.owners.join(", ")}</span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <div
                                                    role="button"
                                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 cursor-pointer"
                                                    onClick={() => handleViewDetails(property)}
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
                                            <Button size="sm" variant="outline" onClick={() => handleOpenUnitDialog(property.name)}>
                                                <Plus className="mr-2 h-3 w-3" /> Agregar Unidad
                                            </Button>
                                        </div>

                                        {/* Mock Units Table */}
                                        <div className="border rounded-md">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Unidad</TableHead>
                                                        <TableHead>Tipo</TableHead>
                                                        <TableHead>Estado</TableHead>
                                                        <TableHead>Inquilino Actual</TableHead>
                                                        <TableHead className="text-right">Canon</TableHead>
                                                        <TableHead className="text-right">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell className="font-medium">001</TableCell>
                                                        <TableCell>{property.type === 'Oficina' ? 'Oficina' : 'Apartamento'}</TableCell>
                                                        <TableCell><Badge>Ocupado</Badge></TableCell>
                                                        <TableCell>Empresa ABC</TableCell>
                                                        <TableCell className="text-right">$850.00</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-medium">002</TableCell>
                                                        <TableCell>{property.type === 'Oficina' ? 'Oficina' : 'Apartamento'}</TableCell>
                                                        <TableCell><Badge variant="secondary">Vacante</Badge></TableCell>
                                                        <TableCell>-</TableCell>
                                                        <TableCell className="text-right">$850.00</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredProperties.length)} de {filteredProperties.length} propiedades
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
            </Card>

            {/* Property Dialog */}
            <PropertyDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                property={selectedProperty}
            />

            {/* Unit Dialog (Simplified for now) */}
            <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar Unidad a {selectedBuilding}</DialogTitle>
                        <DialogDescription>Registre una nueva unidad arrendable.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-name" className="text-right">Nombre/N°</Label>
                            <Input id="unit-name" placeholder="Ej. Apto 101" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit-type" className="text-right">Tipo</Label>
                            <Select>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="apt">Apartamento</SelectItem>
                                    <SelectItem value="office">Oficina</SelectItem>
                                    <SelectItem value="local">Local</SelectItem>
                                    <SelectItem value="warehouse">Galpón</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddUnit}>Guardar Unidad</Button>
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