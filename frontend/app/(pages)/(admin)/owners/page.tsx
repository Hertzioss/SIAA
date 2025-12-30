'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Plus, Search, Mail, Phone, User, Building, Edit, Trash, FileText } from "lucide-react"
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
    const itemsPerPage = 5

    // Filtered Data
    const filteredOwners = owners.filter(owner =>
        owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.doc_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (owner.email && owner.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const currentPageOwners = filteredOwners.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const totalPages = Math.ceil(filteredOwners.length / itemsPerPage)

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

    const handleDialogSubmit = async (data: any) => {
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
                            {currentPageOwners.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No se encontraron propietarios
                                    </TableCell>
                                </TableRow>
                            ) : (
                                currentPageOwners.map((owner) => (
                                    <TableRow key={owner.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-primary/10 p-1.5 rounded-full">
                                                    {owner.type === 'company' ? <Building className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                                                </div>
                                                {owner.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{owner.doc_id}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                {owner.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {owner.email}</span>}
                                                {owner.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {owner.phone}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>{owner.properties?.length || 0} {(owner.properties?.length || 0) === 1 ? 'Propiedad' : 'Propiedades'}</TableCell>
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
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
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