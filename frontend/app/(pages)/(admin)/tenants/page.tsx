'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, Mail, Phone, User, Home, FileText, Building, ChevronLeft, ChevronRight, Edit, Trash, Loader2, DollarSign, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ExportButtons } from "@/components/export-buttons"
import { useTenants } from "@/hooks/use-tenants"
import { useProperties } from "@/hooks/use-properties"
import { TenantDialog } from "@/components/tenants/tenant-dialog"
import { PaymentDialog } from "@/components/tenants/payment-dialog"
import { Tenant } from "@/types/tenant"
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

/**
 * Página de administración de inquilinos.
 * Permite registrar, editar, eliminar y visualizar inquilinos.
 * Incluye registro directo de pagos.
 */
export default function TenantsPage() {
    const { tenants, loading, createTenant, updateTenant, deleteTenant } = useTenants()
    const { properties } = useProperties()
    const router = useRouter()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create")
    const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>(undefined)

    const [searchTerm, setSearchTerm] = useState("")
    const [propertyFilter, setPropertyFilter] = useState("all")
    const [ownerFilter, setOwnerFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 5

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)

    // Derived Data
    const uniqueOwners = Array.from(
        new Map(
            properties.flatMap(p => p.owners || []).map(o => [o.owner_id, o])
        ).values()
    ).sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Dependent Filter Logic
    const handleOwnerChange = (value: string) => {
        setOwnerFilter(value);
        setPropertyFilter("all"); // Reset property filter when owner changes
        setCurrentPage(1);
    }

    const handlePropertyChange = (value: string) => {
        setPropertyFilter(value);
        setCurrentPage(1);

        if (value !== "all") {
            const property = properties.find(p => p.id === value);
            // If property has owners, auto-select the first one (or main one)
            if (property && property.owners && property.owners.length > 0) {
                // Assuming we want to filter by the first owner found if multiple
                setOwnerFilter(property.owners[0].owner_id);
            }
        }
    }

    const availableProperties = ownerFilter === "all"
        ? properties
        : properties.filter(p => p.owners?.some(o => o.owner_id === ownerFilter));

    // Calculate Derived Data based on filters
    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.doc_id.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesProperty = propertyFilter === "all" || (tenant as any).contracts?.some((c: any) =>
            c.unit?.property?.id === propertyFilter
        )

        const matchesOwner = ownerFilter === "all" || (tenant as any).contracts?.some((c: any) => {
            const propertyId = c.unit?.property?.id;
            if (!propertyId) return false;
            const property = properties.find(p => p.id === propertyId);
            return property?.owners?.some((o: any) => o.owner_id === ownerFilter);
        })

        return matchesSearch && matchesProperty && matchesOwner
    })

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedTenants = [...filteredTenants]
    if (sortConfig) {
        sortedTenants.sort((a, b) => {
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

    const totalPages = Math.ceil(sortedTenants.length / ITEMS_PER_PAGE)
    const currentTenants = sortedTenants.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
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

    const handleFormSubmit = async (tenantData: any, contractData?: any) => {
        try {
            if (dialogMode === 'create') {
                await createTenant(tenantData, contractData)
            } else if (dialogMode === 'edit' && selectedTenant) {
                await updateTenant(selectedTenant.id, tenantData)
            }
        } catch (error) {
            console.error(error)
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
                    <ExportButtons
                        data={filteredTenants}
                        filename="inquilinos"
                        columns={[
                            { header: "Nombre", key: "name" },
                            { header: "Documento", key: "doc_id" },
                            { header: "Teléfono", key: "phone" },
                            { header: "Email", key: "email" },
                            { header: "Estado", key: "status" },
                        ]}
                        title="Reporte de Inquilinos"
                    />
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Registrar Inquilino
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Listado de Inquilinos</CardTitle>
                            <CardDescription>Base de datos de inquilinos registrados.</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            <Select
                                value={ownerFilter}
                                onValueChange={handleOwnerChange}
                                disabled={propertyFilter !== "all"}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Por Propietario" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Propietarios</SelectItem>
                                    {uniqueOwners.map((owner: any) => (
                                        <SelectItem key={owner.owner_id} value={owner.owner_id}>{owner.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={propertyFilter} onValueChange={handlePropertyChange}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Por Propiedad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las Propiedades</SelectItem>
                                    {availableProperties.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar inquilino..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
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
                    ) : filteredTenants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <User className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">No se encontraron inquilinos</p>
                            <p className="text-sm">No hay inquilinos registrados que coincidan con la búsqueda.</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => requestSort('name')} className="hover:bg-transparent px-0 font-bold">
                                                Nombre
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => requestSort('phone')} className="hover:bg-transparent px-0 font-bold">
                                                Contacto
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => requestSort('status')} className="hover:bg-transparent px-0 font-bold">
                                                Estado
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
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
                                                        <p className="text-xs text-muted-foreground">{tenant.doc_id}</p>
                                                        {((tenant as any).contracts?.[0]?.unit?.property?.name) && (
                                                            <div className="flex flex-col gap-0.5 mt-1">
                                                                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                                                    <Home className="h-3 w-3" />
                                                                    {(tenant as any).contracts[0].unit.property.name} - {(tenant as any).contracts[0].unit.name}
                                                                </p>
                                                                {(() => {
                                                                    const propertyId = (tenant as any).contracts[0].unit.property.id;
                                                                    const fullProperty = properties.find(p => p.id === propertyId);
                                                                    const ownerName = fullProperty?.owners?.[0]?.name;

                                                                    if (ownerName) {
                                                                        return (
                                                                            <p className="flex items-center gap-1 text-[10px] text-muted-foreground/80 pl-4">
                                                                                <Building className="h-3 w-3" />
                                                                                {ownerName}
                                                                            </p>
                                                                        )
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    {tenant.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {tenant.email}</span>}
                                                    {tenant.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {tenant.phone}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={tenant.status === 'delinquent' ? 'destructive' : 'default'} className={tenant.status === 'solvent' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                                    {tenant.status === 'solvent' ? 'Solvente' : 'Moroso'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleView(tenant)}>
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(tenant)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handlePayment(tenant)} title="Registrar Pago">
                                                        <DollarSign className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => confirmDelete(tenant)}>
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
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
                            )}
                        </>
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
            />

            <PaymentDialog
                open={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                tenant={selectedTenant}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al inquilino
                            <strong> {tenantToDelete?.name}</strong>.
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