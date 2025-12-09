'use client'

import { useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileText, Download, Mail, Plus, MoreHorizontal, Search, Edit, Trash, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { toast } from "sonner"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useProperties } from "@/hooks/use-properties"
import { useTenants } from "@/hooks/use-tenants"
import { useContracts } from "@/hooks/use-contracts"

import { useRouter, useSearchParams } from "next/navigation"

function ContractsContent() {
    const { contracts, isLoading, fetchContracts, createContract, updateContract } = useContracts()
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

    const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE) || 1
    const currentContracts = filteredContracts.slice(
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

    const handleDownload = (id: string) => {
        toast.success(`Descargando contrato ${id} en PDF...`)
    }

    const handleEmail = (id: string) => {
        toast.success(`Enviando contrato ${id} por correo electrónico...`)
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
                                <TableHead>ID</TableHead>
                                <TableHead>Propiedad</TableHead>
                                <TableHead>Inquilino</TableHead>
                                <TableHead>Vigencia</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentContracts.length > 0 ? (
                                currentContracts.map((contract) => (
                                    <TableRow key={contract.id}>
                                        <TableCell className="font-medium text-xs truncate max-w-[100px]" title={contract.id}>
                                            {contract.id.slice(0, 8)}...
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{contract.property.split(" - ")[0]}</div>
                                            <div className="text-xs text-muted-foreground">{contract.property.split(" - ")[1]}</div>
                                        </TableCell>
                                        <TableCell>{contract.tenant}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{contract.duration}</div>
                                            <div className="text-xs text-muted-foreground">{contract.startDate} - {contract.endDate}</div>
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menú</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleViewDetail(contract)}>
                                                        <FileText className="mr-2 h-4 w-4" /> Ver Detalle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(contract)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contract.id)}>
                                                        Copiar ID
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDownload(contract.id)}>
                                                        <Download className="mr-2 h-4 w-4" /> Descargar PDF
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEmail(contract.id)}>
                                                        <Mail className="mr-2 h-4 w-4" /> Enviar por Correo
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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