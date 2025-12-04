'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Plus, Search, MoreHorizontal, Mail, Phone, User, Building, Edit, Trash, FileText } from "lucide-react"
import { toast } from "sonner"
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

// Mock Data
const OWNERS_DATA = [
    {
        id: "1",
        type: "individual",
        name: "Juan Pérez",
        docId: "V-12.345.678",
        email: "juan@email.com",
        phone: "0414-1234567",
        address: "Av. Principal de Las Mercedes, Edif. A, Piso 3",
        properties: [
            { name: "Apto 101 - Res. El Valle", type: "Apartamento", status: "Ocupado" },
            { name: "Local 5 - C.C. Plaza", type: "Local Comercial", status: "Vacante" }
        ]
    },
    {
        id: "2",
        type: "company",
        name: "Inversiones Los Andes C.A.",
        docId: "J-29876543-1",
        email: "contacto@andes.com",
        phone: "0212-9876543",
        address: "Zona Industrial Los Cortijos, Galpón 4",
        properties: [
            { name: "Edificio Administrativo Andes", type: "Edificio", status: "Parcialmente Ocupado" }
        ],
        beneficiaries: [
            { name: "Carlos Ruiz", docId: "V-5.555.555", participation: "60" },
            { name: "Maria Rodriguez", docId: "V-4.444.444", participation: "40" }
        ]
    },
    {
        id: "3",
        type: "company",
        name: "Sucesión Rodriguez",
        docId: "J-12345678-9",
        email: "sucesion@email.com",
        phone: "0412-0000000",
        address: "Calle Real de Sabana Grande",
        properties: [
            { name: "Quinta La Esperanza", type: "Casa", status: "Vacante" }
        ],
        beneficiaries: [
            { name: "Pedro Rodriguez", docId: "V-1.111.111", participation: "20" },
            { name: "Ana Rodriguez", docId: "V-2.222.222", participation: "20" },
            { name: "Luis Rodriguez", docId: "V-3.333.333", participation: "20" },
            { name: "Carmen Rodriguez", docId: "V-4.444.444", participation: "20" },
            { name: "Jose Rodriguez", docId: "V-5.555.555", participation: "20" }
        ]
    },
    {
        id: "4",
        type: "individual",
        name: "Maria Gonzalez",
        docId: "V-15.678.901",
        email: "maria.gonzalez@email.com",
        phone: "0416-5558899",
        address: "Urb. La Castellana, Qta. Los Rosales",
        properties: [
            { name: "Apto 5B - Res. Altamira", type: "Apartamento", status: "Ocupado" }
        ]
    },
    {
        id: "5",
        type: "company",
        name: "Desarrollos Inmobiliarios Global S.A.",
        docId: "J-40001234-5",
        email: "admin@globalre.com",
        phone: "0212-2634455",
        address: "Torre Financiera, Piso 15, Oficina 15-A",
        properties: [
            { name: "Torre Global", type: "Edificio", status: "Ocupado" },
            { name: "Galpón Zona Sur", type: "Galpón", status: "Vacante" }
        ],
        beneficiaries: [
            { name: "Grupo Inversor A", docId: "J-50000000-1", participation: "70" },
            { name: "Roberto Martinez", docId: "V-8.999.111", participation: "30" }
        ]
    },
    {
        id: "6",
        type: "individual",
        name: "Carlos Eduardo Lopez",
        docId: "V-10.222.333",
        email: "celopez@email.com",
        phone: "0414-9990011",
        address: "Av. Sucre, Los Dos Caminos",
        properties: []
    },
    {
        id: "7",
        type: "company",
        name: "Inmobiliaria El Sol C.A.",
        docId: "J-30999888-2",
        email: "info@elsol.com",
        phone: "0212-7776655",
        address: "C.C. El Recreo, Nivel C2",
        properties: [
            { name: "Local C2-05", type: "Local Comercial", status: "Ocupado" },
            { name: "Local C2-06", type: "Local Comercial", status: "Ocupado" }
        ],
        beneficiaries: [
            { name: "Ana Maria Soler", docId: "V-6.123.123", participation: "100" }
        ]
    },
    {
        id: "8",
        type: "individual",
        name: "Roberto Gomez",
        docId: "V-18.444.555",
        email: "roberto.g@email.com",
        phone: "0424-3332211",
        address: "Res. Parque Central, Edif. Tajamar",
        properties: [
            { name: "Apto 12-F", type: "Apartamento", status: "En Reparación" }
        ]
    },
    {
        id: "9",
        type: "company",
        name: "Sucesión Familia Perez",
        docId: "J-11223344-5",
        email: "familia.perez@email.com",
        phone: "0412-1112233",
        address: "Calle 5, La Urbina",
        properties: [
            { name: "Casa Quinta La Paz", type: "Casa", status: "Vacante" }
        ],
        beneficiaries: [
            { name: "Hijo 1 Perez", docId: "V-20.000.001", participation: "33.33" },
            { name: "Hijo 2 Perez", docId: "V-20.000.002", participation: "33.33" },
            { name: "Hijo 3 Perez", docId: "V-20.000.003", participation: "33.33" }
        ]
    },
    {
        id: "10",
        type: "individual",
        name: "Luisa Martinez",
        docId: "V-11.222.333",
        email: "lmartinez@email.com",
        phone: "0416-8887766",
        address: "Av. Rómulo Gallegos",
        properties: [
            { name: "Oficina 3B", type: "Oficina", status: "Ocupado" }
        ]
    },
    {
        id: "11",
        type: "individual",
        name: "Fernando Torres",
        docId: "V-9.876.543",
        email: "ftorres@email.com",
        phone: "0414-0001122",
        address: "Colinas de Bello Monte",
        properties: []
    }
]

export default function OwnersPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create")
    const [selectedOwner, setSelectedOwner] = useState<any>(null)

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [ownerToDelete, setOwnerToDelete] = useState<{ id: string, name: string } | null>(null)

    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5

    // Filtered Data
    const filteredOwners = OWNERS_DATA.filter(owner =>
        owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.docId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const currentPageOwners = filteredOwners.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const totalPages = Math.ceil(filteredOwners.length / itemsPerPage)

    const handleCreate = () => {
        setDialogMode("create")
        setSelectedOwner(null)
        setIsDialogOpen(true)
    }

    const handleViewDetails = (owner: any) => {
        setDialogMode("view")
        setSelectedOwner(owner)
        setIsDialogOpen(true)
    }

    const handleEdit = (owner: any) => {
        setDialogMode("edit")
        setSelectedOwner(owner)
        setIsDialogOpen(true)
    }

    const confirmDelete = (id: string, name: string) => {
        setOwnerToDelete({ id, name })
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = () => {
        if (ownerToDelete) {
            toast.success(`Propietario "${ownerToDelete.name}" eliminado.`)
            setIsDeleteDialogOpen(false)
            setOwnerToDelete(null)
        }
    }

    // Reset pagination when search changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Propietarios</h1>
                    <p className="text-muted-foreground">
                        Directorio de propietarios de inmuebles.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Registrar Propietario
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Listado de Propietarios</CardTitle>
                            <CardDescription>Total de {filteredOwners.length} propietarios encontrados.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar propietario..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Identificación</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Propiedades</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentPageOwners.map((owner) => (
                                <TableRow key={owner.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-primary/10 p-1.5 rounded-full">
                                                {owner.type === 'company' ? <Building className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                                            </div>
                                            {owner.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{owner.docId}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {owner.email}</span>
                                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {owner.phone}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{owner.properties.length} {owner.properties.length === 1 ? 'Propiedad' : 'Propiedades'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleViewDetails(owner)}>
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(owner)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => confirmDelete(owner.id, owner.name)}>
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
                            Anterior
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
                            Siguiente
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <OwnerDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                owner={selectedOwner}
            />

            {/* Delete Alert */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al propietario
                            <strong> {ownerToDelete?.name}</strong> y todos sus datos asociados.
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