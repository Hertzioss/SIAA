'use client'

import { useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileText, Download, Mail, Plus, Search, Edit, Trash, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock, ArrowUpDown, RefreshCw, Ban } from "lucide-react"
import { toast } from "sonner"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { parseLocalDate } from "@/lib/utils"
import { authFetch } from "@/lib/auth-fetch"

import { useProperties } from "@/hooks/use-properties"
import { useTenants } from "@/hooks/use-tenants"
import { useContracts, Contract, ContractInsert, ContractUpdate } from "@/hooks/use-contracts"
import { useReactToPrint } from "react-to-print"
import { ContractDetailReport } from "@/components/reports/contract-detail-report"
import { useRef } from "react"

import { useSearchParams } from "next/navigation"
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

// Define local type for table display
type ContractRow = Omit<Contract, 'status'> & {
    status: string // Display status (e.g., "Vencido", "Por Vencer")
    property: string
    tenant: string
    duration: string
    displayStartDate: string
    displayEndDate: string
    statusRaw: Contract['status'] // Original status
    startDate: string
    endDate: string
    amount: number
}

/**
 * Componente de contenido para la gestión de contratos.
 * Lista contratos con filtrado por estado y búsqueda.
 */
function ContractsContent() {
    const { contracts, isLoading, createContract, updateContract, renewContract, deleteContract } = useContracts()
    const { properties, fetchProperties } = useProperties()
    const { tenants } = useTenants()
    const searchParams = useSearchParams()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit" | "renew">("create")
    const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null)
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
    const [statusFilter, setStatusFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(5)

    const [contractToPrint, setContractToPrint] = useState<ContractRow | null>(null)
    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Contrato_${contractToPrint?.tenants?.name || contractToPrint?.tenant || 'Inquilino'}`,
        onAfterPrint: () => setContractToPrint(null)
    })

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [contractToDelete, setContractToDelete] = useState<ContractRow | null>(null)

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    // Helper to format contract for display
    const formatContractData = (c: Contract): ContractRow => {
        const propertyName = c.units?.properties?.name || "Propiedad Desconocida"
        const unitName = c.units?.name || "Unidad"
        const tenantName = c.tenants?.name || "Inquilino Desconocido"
        const rawStatus = (c.status || '').toLowerCase().trim()

        // Calculate duration approx
        let duration = "Indefinido"
        let calculatedStatus =
            rawStatus === 'active'
                ? 'Activo'
                : rawStatus === 'terminated'
                    ? 'Finalizado'
                    : rawStatus === 'cancelled'
                        ? 'Cancelado'
                        : rawStatus === 'expired'
                            ? 'Vencido'
                            : String(c.status)

        const start = parseLocalDate(c.start_date)
        const end = c.end_date ? parseLocalDate(c.end_date) : null

        if (end && !Number.isNaN(end.getTime())) {
            const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
            duration = `${diffMonths} Meses`

            if (rawStatus !== 'terminated' && rawStatus !== 'cancelled') {
                if (rawStatus === 'expired' || end < today) {
                    calculatedStatus = "Vencido"
                } else if (rawStatus === 'active' && end <= thirtyDaysFromNow) {
                    calculatedStatus = "Por Vencer"
                }
            }
        }

        return {
            ...c, // Spread original contract to include file_url, etc.
            status: calculatedStatus,
            property: `${propertyName} - ${unitName}`,
            tenant: tenantName,
            startDate: c.start_date,
            endDate: c.end_date || "Indefinido",
            duration: duration,
            amount: c.rent_amount,
            type: c.type,
            displayStartDate: start.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            displayEndDate: end && !Number.isNaN(end.getTime()) ? end.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "Indefinido",
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
            // @ts-expect-error sort key access

            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1
            }
            // @ts-expect-error sort key access
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1
            }
            return 0
        })
    }

    const totalPages = Math.ceil(sortedContracts.length / itemsPerPage) || 1
    const currentContracts = sortedContracts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Stats — computed from displayedContracts so KPI cards always match the filter 1-to-1
    const totalContracts = displayedContracts.length
    const activeContracts = displayedContracts.filter(c => c.status === "Activo").length
    const expiringContracts = displayedContracts.filter(c => c.status === "Por Vencer").length
    const expiredContracts = displayedContracts.filter(c => c.status === "Vencido").length

    const handleDownload = (contract: ContractRow) => {
        if (contract.file_url) {
            window.open(contract.file_url, '_blank')
            toast.success("Abriendo archivo del contrato...")
        } else {
            toast.info("Preparando PDF del contrato...", { description: "Se enviará a imprimir/guardar la versión digital." })
            setContractToPrint(contract)
            setTimeout(() => {
                handlePrint()
            }, 100)
        }
    }

    const handleEmail = async (contract: ContractRow) => {
        const email = contract.tenants?.email
        const name = contract.tenants?.name

        if (!email) {
            toast.error("El inquilino no tiene un correo electrónico registrado.")
            return
        }

        toast.promise(
            authFetch('/api/emails/send', {
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

    const handleViewDetail = (contract: ContractRow) => {
        setDialogMode("view")
        setSelectedContract(contract)
        setIsDialogOpen(true)
    }

    const handleEdit = (contract: ContractRow) => {
        setDialogMode("edit")
        setSelectedContract(contract)
        setIsDialogOpen(true)
    }

    const handleRenew = (contract: ContractRow) => {
        setDialogMode("renew")
        setSelectedContract(contract)
        setIsDialogOpen(true)
    }

    const handleSaveContract = async (data: ContractInsert & { file?: File | null }) => {
        try {
            if (dialogMode === "create") {
                await createContract(data)
                await fetchProperties()
            } else if (dialogMode === "renew" && selectedContract) {
                await renewContract(selectedContract.id, data)
                await fetchProperties()
            } else if (dialogMode === "edit" && selectedContract) {
                const updateData: ContractUpdate & { file?: File } = {
                    ...data,
                    file: data.file || undefined // convert null to undefined
                }
                
                await updateContract(selectedContract.id, updateData)
                await fetchProperties()
            }
            setIsDialogOpen(false)
        } catch (error) {
            console.error("Error saving contract:", error)
            // Toast handled in hook
        }
    }

    const [contractToTerminate, setContractToTerminate] = useState<ContractRow | null>(null)

    const confirmDelete = (contract: ContractRow) => {
        setContractToDelete(contract)
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (contractToDelete) {
            await deleteContract(contractToDelete.id)
            await fetchProperties()
            setIsDeleteDialogOpen(false)
            setContractToDelete(null)
        }
    }

    const handleTerminate = async () => {
        if (!contractToTerminate) return
        try {
            await updateContract(contractToTerminate.id, {
                status: 'terminated',
                end_date: new Date().toLocaleDateString('en-CA'),
            })
            await fetchProperties()
            toast.success('Contrato finalizado', {
                description: 'El historial del inquilino se conservó y la unidad quedó disponible.'
            })
        } catch (error) {
            console.error("Error terminating contract:", error)
        } finally {
            setContractToTerminate(null)
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
                <Card
                    className={`cursor-pointer transition-colors hover:border-primary/50 ${statusFilter === 'all' ? 'ring-2 ring-primary/30' : ''}`}
                    onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Contratos</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalContracts}</div>
                        <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer transition-colors hover:border-green-500/50 ${statusFilter === 'Activo' ? 'ring-2 ring-green-500/40' : ''}`}
                    onClick={() => { setStatusFilter('Activo'); setCurrentPage(1); }}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vigentes</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeContracts}</div>
                        <p className="text-xs text-muted-foreground">Contratos activos</p>
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer transition-colors hover:border-yellow-500/50 ${statusFilter === 'Por Vencer' ? 'ring-2 ring-yellow-500/40' : ''}`}
                    onClick={() => { setStatusFilter('Por Vencer'); setCurrentPage(1); }}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expiringContracts}</div>
                        <p className="text-xs text-muted-foreground">Vencen en &lt; 30 días</p>
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer transition-colors hover:border-red-500/50 ${statusFilter === 'Vencido' ? 'ring-2 ring-red-500/40' : ''}`}
                    onClick={() => { setStatusFilter('Vencido'); setCurrentPage(1); }}
                >
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
                                    <SelectItem value="Finalizado">Finalizados</SelectItem>
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
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)} title="Editar contrato">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {(contract.statusRaw === 'active' || contract.statusRaw === 'expired') && (
                                                    <>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRenew(contract)} title="Renovar contrato">
                                                            <RefreshCw className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setContractToTerminate(contract)}
                                                            title="Finalizar contrato (liberar unidad conservando historial)"
                                                        >
                                                            <Ban className="h-4 w-4 text-amber-600" />
                                                        </Button>
                                                    </>
                                                )}
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
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mr-4">
                            <span>
                                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredContracts.length)} de {filteredContracts.length} contratos
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

            {/* Componente Oculto para impresión de PDF individual */}
            <div style={{ display: "none" }}>
                <ContractDetailReport ref={printRef} contract={contractToPrint} />
            </div>

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
                        <AlertDialogTitle>¿Eliminar contrato?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Solo se pueden eliminar contratos sin pagos registrados. Si este contrato ya tiene historial de pagos, utiliza <strong>Finalizar contrato</strong> para liberar la unidad sin perder datos.
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

            <AlertDialog
                open={Boolean(contractToTerminate)}
                onOpenChange={(open) => {
                    if (!open) setContractToTerminate(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Finalizar contrato?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El contrato de <strong>{contractToTerminate?.tenant}</strong> en{" "}
                            <strong>{contractToTerminate?.property}</strong> pasará a estado{" "}
                            <strong>Finalizado</strong>. Todos los pagos y datos históricos del inquilino se conservarán intactos y la unidad quedará vacante disponible para asignar un nuevo inquilino.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTerminate}>
                            Finalizar contrato
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