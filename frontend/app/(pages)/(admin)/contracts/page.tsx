'use client'

import { useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileText, Download, Mail, Plus, MoreHorizontal, Search, Edit, Trash, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useProperties } from "@/hooks/use-properties"
import { useTenants } from "@/hooks/use-tenants"
import { useContracts } from "@/hooks/use-contracts"
import { generateContractPDF } from "@/components/contracts/contract-pdf-generator"

import { useRouter, useSearchParams } from "next/navigation"
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
 * Componente de contenido para la gestión de contratos.
 * Lista contratos con filtrado por estado y búsqueda.
 */
function ContractsContent() {
    const { contracts, isLoading, fetchContracts, createContract, updateContract, deleteContract } = useContracts()
    const { properties } = useProperties()
    const { tenants } = useTenants()
    const searchParams = useSearchParams()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create")
    const [selectedContract, setSelectedContract] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
    const [statusFilter, setStatusFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 5

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [contractToDelete, setContractToDelete] = useState<any>(null)

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    // Helper to format contract for display
    const formatContractData = (c: any) => {
        const propertyName = c.units?.properties?.name || "Propiedad Desconocida"
        const unitName = c.units?.name || "Unidad"
        const tenantName = c.tenants?.name || "Inquilino Desconocido"

        // Calculate duration approx
        let duration = "Indefinido"
        let displayStatus = c.status // Default to raw status

        if (c.end_date) {
            const start = new Date(c.start_date)
            const end = new Date(c.end_date)
            const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
            duration = `${diffMonths} Meses`

            // Check status based on date
            const now = new Date()
            const thirtyDaysFromNow = new Date()
            thirtyDaysFromNow.setDate(now.getDate() + 30)

            const endDate = new Date(c.end_date)

            if (c.status === 'expired' || endDate < now) {
                displayStatus = "Vencido"
            } else if (c.status === 'active' && endDate <= thirtyDaysFromNow) {
                displayStatus = "Por Vencer"
            } else if (c.status !== 'active') {
                displayStatus = c.status
            }
        }

        return {
            id: c.id,
            property: `${propertyName} - ${unitName}`,
            tenant: tenantName,
            startDate: c.start_date,
            endDate: c.end_date || "Indefinido",
            duration: duration,
            status: displayStatus,
            amount: c.rent_amount,
            type: c.type,
            // Raw data for edit
            unit_id: c.unit_id,
            tenant_id: c.tenant_id,
            rent_amount: c.rent_amount,
            start_date: c.start_date,
            end_date: c.end_date,
            displayStartDate: new Date(c.start_date).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            displayEndDate: c.end_date ? new Date(c.end_date).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "Indefinido",
            statusRaw: c.status
        }
    }

    const displayedContracts = contracts.map(formatContractData)

    // Derived Data
    const filteredContracts = displayedContracts.filter(contract => {
        const matchesSearch =
            contract.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contract.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contract.id.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || contract.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const sortedContracts = [...filteredContracts]
    if (sortConfig) {
        sortedContracts.sort((a, b) => {
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

    const totalPages = Math.ceil(sortedContracts.length / ITEMS_PER_PAGE) || 1
    const currentContracts = sortedContracts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // Stats
    const totalContracts = contracts.length
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)

    const expiringContracts = contracts.filter(c => {
        if (c.status !== 'active' || !c.end_date) return false
        const end = new Date(c.end_date)
        return end >= now && end <= thirtyDaysFromNow
    }).length

    const expiredContracts = contracts.filter(c => {
        if (!c.end_date) return c.status === 'expired' // Should generally not happen for indefinite unless manual
        const end = new Date(c.end_date)
        return c.status === 'expired' || end < now
    }).length

    const activeContracts = contracts.filter(c => {
        if (c.status !== 'active') return false
        if (!c.end_date) return true // Indefinite active
        const end = new Date(c.end_date)
        return end > now
    }).length

    const handleDownload = (contract: any) => {
        if (contract.file_url) {
            window.open(contract.file_url, '_blank')
            toast.success("Abriendo archivo del contrato...")
        } else {
            toast.info("Generando PDF del contrato...", { description: "Si el archivo original no existe, se generará una versión digital." })
            generateContractPDF(contract)
        }
    }

    const handleEmail = async (contract: any) => {
        const email = contract.tenants?.email
        const name = contract.tenants?.name

        if (!email) {
            toast.error("El inquilino no tiene un correo electrónico registrado.")
            return
        }

        toast.promise(
            fetch('/api/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: [{ email, name }],
                    subject: `Contrato de Arrendamiento - ${contract.units?.properties?.name || 'Propiedad'}`,
                    message: `
                        <p>Estimado/a ${name},</p>
                        <p>Adjunto encontrará la información relacionada con su contrato de arrendamiento para la unidad <strong>${contract.units?.name}</strong>.</p>
                        <p><strong>Vigencia:</strong> ${new Date(contract.start_date).toLocaleDateString()} - ${contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'Indefinido'}</p>
                        ${contract.file_url ? `<p>Puede descargar el documento original aquí: <a href="${contract.file_url}">Ver Contrato</a></p>` : ''}
                        <p>Atentamente,<br>Administración</p>
                    `
                })
            }).then(async (res) => {
                if (!res.ok) throw new Error("Falló el envío")
                return res.json()
            }),
            {
                loading: 'Enviando correo...',
                success: 'Contrato enviado exitosamente',
                error: 'Error al enviar el correo'
            }
        )
    }

    const handleCreate = () => {
        setDialogMode("create")
        setSelectedContract(null)
        setIsDialogOpen(true)
    }

    const handleViewDetail = (contract: any) => {
        setDialogMode("view")
        setSelectedContract(contract)
        setIsDialogOpen(true)
    }

    const handleEdit = (contract: any) => {
        setDialogMode("edit")
        setSelectedContract(contract)
        setIsDialogOpen(true)
    }

    const handleSaveContract = async (data: any) => {
        try {
            if (dialogMode === "create") {
                await createContract(data)
            } else if (dialogMode === "edit" && selectedContract) {
                await updateContract(selectedContract.id, data)
            }
            setIsDialogOpen(false)
        } catch (error) {
            console.error("Error saving contract:", error)
            // Toast handled in hook
        }
    }

    const confirmDelete = (contract: any) => {
        setContractToDelete(contract)
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (contractToDelete) {
            await deleteContract(contractToDelete.id)
            setIsDeleteDialogOpen(false)
            setContractToDelete(null)
        }
    }

    if (isLoading) {
        return <div className="p-6">Cargando contratos...</div>
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
                    <p className="text-muted-foreground">
                        Gestión de contratos de arrendamiento y documentos legales.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Crear Contrato
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Contratos</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalContracts}</div>
                        <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vigentes</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeContracts}</div>
                        <p className="text-xs text-muted-foreground">Contratos activos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expiringContracts}</div>
                        <p className="text-xs text-muted-foreground">Vencen en &lt; 30 días</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expiredContracts}</div>
                        <p className="text-xs text-muted-foreground">Requieren renovación</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <CardTitle>Listado de Contratos</CardTitle>
                            <CardDescription>Total de {filteredContracts.length} contratos encontrados.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="Activo">Activos</SelectItem>
                                    <SelectItem value="Por Vencer">Por Vencer</SelectItem>
                                    <SelectItem value="Vencido">Vencidos</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por propiedad, inquilino..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('property')} className="hover:bg-transparent px-0 font-bold">
                                        Propiedad
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('tenant')} className="hover:bg-transparent px-0 font-bold">
                                        Inquilino
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('start_date')} className="hover:bg-transparent px-0 font-bold">
                                        Vigencia
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
                            {currentContracts.length > 0 ? (
                                currentContracts.map((contract) => (
                                    <TableRow key={contract.id}>
                                        <TableCell>
                                            <div className="font-medium">{contract.property.split(" - ")[0]}</div>
                                            <div className="text-xs text-muted-foreground">{contract.property.split(" - ")[1]}</div>
                                        </TableCell>
                                        <TableCell>{contract.tenant}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{contract.duration}</div>
                                            <div className="text-xs text-muted-foreground">{contract.displayStartDate} - {contract.displayEndDate}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={contract.status === "Activo" ? "default" : contract.status === "Vencido" ? "destructive" : "secondary"}
                                                className={contract.status === "Activo" ? "bg-green-600 hover:bg-green-700" : contract.status === "Por Vencer" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}
                                            >
                                                {contract.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleViewDetail(contract)}>
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDownload(contract)}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEmail(contract)}>
                                                    <Mail className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(contract)}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No se encontraron contratos.
                                    </TableCell>
                                </TableRow>
                            )}
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
                </CardContent>
            </Card>

            <ContractDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                contract={selectedContract}
                properties={properties}
                tenants={tenants}
                onSubmit={handleSaveContract}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el contrato
                            <strong> {contractToDelete?.id}</strong>.
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

export default function ContractsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ContractsContent />
        </Suspense>
    )
}