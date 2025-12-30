'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Plus, Search, Mail, Shield, Trash, Edit } from "lucide-react"
import { UserDialog } from "@/components/users/user-dialog"
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
import { useUsers, User } from "@/hooks/use-users"
import { Badge } from "@/components/ui/badge"

/**
 * Página de gestión de usuarios del sistema.
 * Permite administrar usuarios con roles de 'admin', 'operator' e 'inquilinos'.
 * Incluye funcionalidades para listar, buscar, crear, editar y eliminar usuarios.
 */
export default function UsersPage() {
    const { users, loading, addUser, updateUser, removeUser } = useUsers()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
    const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined)

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null)

    const [searchTerm, setSearchTerm] = useState("")

    const [currentPageStaff, setCurrentPageStaff] = useState(1)
    const [currentPageTenants, setCurrentPageTenants] = useState(1)
    const ITEMS_PER_PAGE = 5

    // Filtered Data
    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const staffUsers = filteredUsers.filter(user => ['admin', 'operator'].includes(user.role))
    const tenantUsers = filteredUsers.filter(user => user.role === 'tenant')

    // Staff Pagination
    const totalPagesStaff = Math.ceil(staffUsers.length / ITEMS_PER_PAGE)
    const currentStaffUsers = staffUsers.slice(
        (currentPageStaff - 1) * ITEMS_PER_PAGE,
        currentPageStaff * ITEMS_PER_PAGE
    )

    // Tenant Pagination
    const totalPagesTenants = Math.ceil(tenantUsers.length / ITEMS_PER_PAGE)
    const currentTenantUsers = tenantUsers.slice(
        (currentPageTenants - 1) * ITEMS_PER_PAGE,
        currentPageTenants * ITEMS_PER_PAGE
    )

    // Helper for pagination controls
    const renderPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(currentPage - 1, 1))}
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
                    onClick={() => setPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                >
                    Siguiente
                </Button>
            </div>
        )
    }

    const handleCreate = () => {
        setDialogMode("create")
        setSelectedUser(undefined)
        setIsDialogOpen(true)
    }

    const handleEdit = (user: User) => {
        setDialogMode("edit")
        setSelectedUser(user)
        setIsDialogOpen(true)
    }

    const confirmDelete = (id: string, name: string) => {
        setUserToDelete({ id, name })
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (userToDelete) {
            await removeUser(userToDelete.id)
            setIsDeleteDialogOpen(false)
            setUserToDelete(null)
        }
    }

    const handleDialogSubmit = async (data: any) => {
        if (dialogMode === 'create') {
            await addUser(data)
        } else if (dialogMode === 'edit' && selectedUser) {
            // Include password in the update if provided
            await updateUser(selectedUser.id, {
                role: data.role,
                password: data.password
            })
        }
        setIsDialogOpen(false)
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge variant="default">Admin</Badge>
            case 'operator':
                return <Badge variant="secondary">Operador</Badge>
            case 'tenant':
                return <Badge variant="outline">Inquilino</Badge>
            default:
                return <Badge variant="outline">{role}</Badge>
        }
    }

    if (loading) {
        return <div className="p-8 text-center">Cargando usuarios...</div>
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
                    <p className="text-muted-foreground">
                        Gestión de usuarios y accesos al sistema.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Registrar Usuario
                </Button>
            </div>

            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar usuario..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Admin & Operator Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Administradores y Operadores</CardTitle>
                            <CardDescription>Personal con acceso administrativo al sistema ({staffUsers.length}).</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Fecha Registro</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentStaffUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No se encontraron administradores u operadores.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                currentStaffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.full_name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                {user.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getRoleBadge(user.role)}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => confirmDelete(user.id, user.full_name)}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {renderPagination(currentPageStaff, totalPagesStaff, setCurrentPageStaff)}
                </CardContent>
            </Card>

            {/* Tenant Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Inquilinos con Acceso</CardTitle>
                            <CardDescription>Inquilinos con cuenta de usuario habilitada ({tenantUsers.length}).</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Fecha Registro</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentTenantUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No se encontraron usuarios inquilinos.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                currentTenantUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.full_name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                {user.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getRoleBadge(user.role)}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => confirmDelete(user.id, user.full_name)}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {renderPagination(currentPageTenants, totalPagesTenants, setCurrentPageTenants)}
                </CardContent>
            </Card>

            <UserDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                user={selectedUser}
                onSubmit={handleDialogSubmit}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario
                            <strong> {userToDelete?.name}</strong>.
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
