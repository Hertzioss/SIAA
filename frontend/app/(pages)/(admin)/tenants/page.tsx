'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, Mail, Phone, User, Home, FileText, Building, ChevronLeft, ChevronRight, Edit, Trash } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ExportButtons } from "@/components/export-buttons"
import { TENANTS_DATA } from "./mock-data"

export default function TenantsPage() {
    const router = useRouter()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedProperty, setSelectedProperty] = useState<string>("")
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 5

    // Derived Data
    const filteredTenants = TENANTS_DATA.filter(tenant => {
        const matchesProperty = selectedProperty ? tenant.property.includes(selectedProperty) : false
        const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.docId.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesProperty && matchesSearch
    })

    const totalPages = Math.ceil(filteredTenants.length / ITEMS_PER_PAGE)
    const currentTenants = filteredTenants.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // Reset pagination when filter changes
    const handlePropertyChange = (value: string) => {
        setSelectedProperty(value)
        setCurrentPage(1)
    }

    const handleAddTenant = () => {
        setIsDialogOpen(false)
        toast.success("Inquilino registrado exitosamente")
    }

    const handleViewProfile = (tenantId: string) => {
        router.push(`/tenants/${tenantId}`)
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inquilinos</h1>
                    <p className="text-muted-foreground">
                        Gestión de arrendatarios y ocupantes.
                    </p>
                </div>

                <div className="flex gap-2">
                    {selectedProperty && (
                        <ExportButtons
                            data={filteredTenants}
                            filename={`inquilinos_${selectedProperty.replace(/\s+/g, '_')}`}
                            columns={[
                                { header: "Nombre", key: "name" },
                                { header: "Documento", key: "docId" },
                                { header: "Propiedad", key: "property" },
                                { header: "Contrato", key: "contractType" },
                                { header: "Teléfono", key: "phone" },
                                { header: "Email", key: "email" },
                                { header: "Estado", key: "status" },
                            ]}
                            title={`Reporte de Inquilinos - ${selectedProperty}`}
                        />
                    )}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Registrar Inquilino
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Registrar Nuevo Inquilino</DialogTitle>
                                <DialogDescription>
                                    Ingrese los datos personales y asigne una propiedad.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {/* Personal Info */}
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre Completo</Label>
                                    <Input id="name" placeholder="Ej. Carlos Ruiz" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="id-doc">Cédula / Pasaporte</Label>
                                        <Input id="id-doc" placeholder="V-12345678" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Teléfono</Label>
                                        <Input id="phone" placeholder="+58 412 1234567" />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input id="email" type="email" placeholder="carlos.ruiz@email.com" />
                                </div>

                                <Separator className="my-2" />

                                {/* Contract Info */}
                                <div className="grid gap-2">
                                    <Label>Asignar Propiedad</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar propiedad vacante..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="p1">Apto 102 - Res. El Valle (Vacante)</SelectItem>
                                            <SelectItem value="p2">Local 6 - C.C. Plaza (Vacante)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Tipo de Contrato</Label>
                                        <Select>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="res-12">Residencial (12 Meses)</SelectItem>
                                                <SelectItem value="res-6">Residencial (6 Meses)</SelectItem>
                                                <SelectItem value="com-12">Comercial (12 Meses)</SelectItem>
                                                <SelectItem value="com-24">Comercial (24 Meses)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="start-date">Fecha Inicio</Label>
                                        <Input id="start-date" type="date" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddTenant}>Guardar Registro</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Listado de Inquilinos</CardTitle>
                            <CardDescription>Seleccione una propiedad para ver sus inquilinos.</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-[250px]">
                                <Select value={selectedProperty} onValueChange={handlePropertyChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar Propiedad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Res. El Valle">Res. El Valle</SelectItem>
                                        <SelectItem value="C.C. Plaza">C.C. Plaza</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar inquilino..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    disabled={!selectedProperty}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!selectedProperty ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <Building className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Seleccione una propiedad</p>
                            <p className="text-sm">Para visualizar el listado de inquilinos, primero debe seleccionar una propiedad.</p>
                        </div>
                    ) : filteredTenants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <User className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">No se encontraron inquilinos</p>
                            <p className="text-sm">No hay inquilinos registrados para esta propiedad o búsqueda.</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Propiedad</TableHead>
                                        <TableHead>Contrato</TableHead>
                                        <TableHead>Contacto</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentTenants.map((tenant) => (
                                        <TableRow key={tenant.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-primary/10 p-1.5 rounded-full">
                                                        <User className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{tenant.name}</p>
                                                        <p className="text-xs text-muted-foreground">{tenant.docId}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Home className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm">{tenant.property}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm">{tenant.contractType}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {tenant.email}</span>
                                                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {tenant.phone}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={tenant.status === 'Moroso' ? 'destructive' : 'default'} className={tenant.status === 'Solvente' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                                    {tenant.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleViewProfile(tenant.id)}>
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleViewProfile(tenant.id)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {/* Pagination Controls */}
                            <div className="flex items-center justify-end space-x-2 py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm text-muted-foreground">
                                    Página {currentPage} de {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}