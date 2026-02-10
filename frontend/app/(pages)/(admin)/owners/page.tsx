'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Mail, Phone, User, Building, Edit, Trash, FileText, ArrowUpDown, MapPin, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
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

/**
 * Página de gestión de propietarios.
 * Permite listar, buscar, crear, editar y eliminar propietarios, así como ver sus detalles.
 * También gestiona la confirmación de eliminación con un diálogo de alerta.
 */
export default function OwnersPage() {
    const { owners, loading, createOwner, updateOwner, deleteOwner, fetchOwners } = useOwners()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create")
    const [selectedOwner, setSelectedOwner] = useState<Owner | undefined>(undefined)

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [ownerToDelete, setOwnerToDelete] = useState<{ id: string, name: string } | null>(null)

    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(5)

    // Filtered Data
    const filteredOwners = owners.filter(owner =>
        owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.doc_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (owner.email && owner.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedOwners = [...filteredOwners]
    if (sortConfig) {
        sortedOwners.sort((a, b) => {
            // @ts-ignore
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1
            }
            // @ts-ignore
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1
            }
            return 0
        })
    }

    const currentPageOwners = sortedOwners.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const totalPages = Math.ceil(sortedOwners.length / itemsPerPage)

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
            } catch (error) {
                // Error handled in hook
            }
        }
    }

    const handleDialogSubmit = async (data: Omit<Owner, 'id' | 'created_at' | 'properties'>) => {
        try {
            if (dialogMode === 'create') {
                await createOwner(data)
            } else if (dialogMode === 'edit' && selectedOwner) {
                await updateOwner(selectedOwner.id, data)
            }
            setIsDialogOpen(false)
        } catch (error) {
            // Error handled in hook
            throw error // Propagate to dialog to stop loading state if needed, though dialog handles it
        }
    }

    // Reset pagination when search changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    if (loading && owners.length === 0) {
        return <div className="p-8 text-center">Cargando propietarios...</div>
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
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="text-muted-foreground">Cargando propietarios...</span>
                        </div>
                    ) : currentPageOwners.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No se encontraron propietarios.
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {currentPageOwners.map((owner) => (
                                <AccordionItem key={owner.id} value={owner.id}>
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="grid grid-cols-12 gap-4 w-full pr-4 items-center">
                                            {/* Owner Info: Col span 4 */}
                                            <div className="col-span-4 flex items-center gap-4">
                                                <div className="bg-primary/10 p-2 rounded-lg">
                                                    {owner.type === 'company' ? <Building className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-primary" />}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-semibold text-lg">{owner.name}</div>
                                                    <div className="text-sm text-muted-foreground">{owner.doc_id}</div>
                                                </div>
                                            </div>

                                            {/* Contact Info: Col span 3 */}
                                            <div className="col-span-3 flex items-center">
                                                {(owner.email || owner.phone) && (
                                                    <div className="flex flex-col border-l-2 border-primary/20 pl-4 text-sm">
                                                        {owner.email && (
                                                            <span className="flex items-center gap-1 text-muted-foreground">
                                                                <Mail className="h-3 w-3" /> {owner.email}
                                                            </span>
                                                        )}
                                                        {owner.phone && (
                                                            <span className="flex items-center gap-1 text-muted-foreground">
                                                                <Phone className="h-3 w-3" /> {owner.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Stats & Actions: Col span 5 */}
                                            <div className="col-span-5 flex items-center justify-end gap-6 text-sm">
                                                <div className="flex flex-col items-end min-w-[100px]">
                                                    <span className="text-muted-foreground text-xs">Propiedades</span>
                                                    <span className="font-medium text-base">{owner.properties?.length || 0}</span>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <div
                                                        role="button"
                                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 cursor-pointer"
                                                        onClick={() => handleViewDetails(owner)}
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div
                                                        role="button"
                                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 cursor-pointer"
                                                        onClick={() => handleEdit(owner)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </div>
                                                    <div
                                                        role="button"
                                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                                                        onClick={() => confirmDelete(owner.id, owner.name)}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4 pt-2">
                                        <div className="pl-14 space-y-4">
                                            <h4 className="text-sm font-semibold text-muted-foreground">Propiedades</h4>
                                            
                                            {/* Properties Table */}
                                            {owner.properties && owner.properties.length > 0 ? (
                                                <div className="border rounded-md">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Nombre</TableHead>
                                                                <TableHead>Dirección</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {owner.properties.map((property) => (
                                                                <TableRow key={property.id}>
                                                                    <TableCell className="font-medium">{property.name}</TableCell>
                                                                    <TableCell>
                                                                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                            <MapPin className="h-3 w-3" />
                                                                            {property.address}
                                                                        </span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground italic">
                                                    No hay propiedades registradas.
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}


                </CardContent>
                {totalPages > 1 && (
                    <CardFooter className="flex justify-between items-center py-4">
                        <div className="flex-1 text-sm text-muted-foreground">
                            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredOwners.length)} de {filteredOwners.length} propietarios
                        </div>
                        <div className="flex items-center space-x-2">
                            <p className="text-sm text-muted-foreground mr-2">Filas por página:</p>
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
                            <div className="w-4"></div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                            </Button>
                            <div className="text-sm font-medium mx-2">
                                Página {currentPage} de {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Siguiente
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                )}
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