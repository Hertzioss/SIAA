"use client"

import { useState } from "react"
import { usePayments, PaymentStatusFilter, Payment } from "@/hooks/use-payments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaymentActionDialog } from "@/components/payments/payment-action-dialog"
import { PaymentDialog } from "@/components/tenants/payment-dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PrintableReceiptHandler } from "@/components/printable-receipt-handler"
import { Check, X, Search, FileText, Loader2, Edit2, ChevronLeft, ChevronRight, ArrowUpDown, Printer as PrinterIcon } from "lucide-react"
import { parseISO, format as formatFn } from "date-fns"
import { ExportButtons } from "@/components/export-buttons"

/**
 * Página para la gestión y conciliación de pagos.
 * Muestra historial de pagos, permite aprobar/rechazar pagos y filtrar por estado.
 */
export default function PaymentsPage() {
    const {
        payments, loading, total,
        page, setPage, pageSize, setPageSize,
        statusFilter, setStatusFilter,
        updatePaymentStatus
    } = usePayments()

    const [searchTerm, setSearchTerm] = useState("")

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
    const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null)

    // Client-side search filter (as discussed in hook plan)
    const filteredPayments = payments.filter(payment => {
        const search = searchTerm.toLowerCase()
        return (
            payment.tenant?.name.toLowerCase().includes(search) ||
            payment.reference?.toLowerCase().includes(search) ||
            payment.unit?.name.toLowerCase().includes(search)
        )
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

    const sortedPayments = [...filteredPayments]
    if (sortConfig) {
        sortedPayments.sort((a: Payment, b: Payment) => {
            let aValue = a[sortConfig.key as keyof Payment]
            let bValue = b[sortConfig.key as keyof Payment]

            // Handle nested properties manually or flattened
            if (sortConfig.key === 'tenant') {
                aValue = a.tenant?.name || ''
                bValue = b.tenant?.name || ''
            } else if (sortConfig.key === 'unit') {
                aValue = a.unit?.name || ''
                bValue = b.unit?.name || ''
            }

            const valA = aValue ?? ''
            const valB = bValue ?? ''

            if (valA < valB) {
                return sortConfig.direction === 'asc' ? -1 : 1
            }
            if (valA > valB) {
                return sortConfig.direction === 'asc' ? 1 : -1
            }
            return 0
        })
    }

    // const totalPages = Math.ceil(total / pageSize)

    const handleActionClick = (id: string, action: 'approve' | 'reject') => {
        setSelectedPaymentId(id)
        setDialogAction(action)
        setDialogOpen(true)
    }

    // Generic Register Dialog State
    const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)

    // Receipt Component State
    const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null)

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Conciliación de Pagos</h1>
                <div className="flex gap-2">
                     <ExportButtons
                        data={sortedPayments}
                        filename="reporte_pagos"
                        title="Reporte de Pagos"
                        columns={[
                            { header: "Fecha Registro", key: "created_at", transform: (val: string) => val ? format(new Date(val), "dd/MM/yyyy HH:mm") : "-" },
                            { header: "Fecha Pago", key: "date", transform: (val: string) => val ? formatFn(parseISO(val), 'dd/MM/yyyy') : "-" },
                            { header: "Mes Pagado", key: "billing_period", transform: (val: string) => val ? formatFn(parseISO(val), 'MMMM yyyy', { locale: es }) : "-" },
                            { header: "Inquilino", key: "tenant.name" },
                            { header: "Unidad", key: "unit", transform: (u: Payment['unit']) => u ? `${u.name} (${u.property_name || ''})` : '-' },
                            { header: "Monto", key: "amount" },
                            { header: "Moneda", key: "currency" },
                            { header: "Tasa", key: "exchange_rate" },
                            { header: "Referencia", key: "reference" },
                            { header: "Estado", key: "status", transform: (val: string) => val === 'approved' ? 'Conciliado' : val === 'rejected' ? 'Rechazado' : 'Pendiente' }
                        ]}
                    />
                    {/* <Button onClick={() => setIsRegisterDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                        <DollarSign className="mr-2 h-4 w-4" /> Registrar Pago
                    </Button> */}
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Historial de Pagos</CardTitle>
                    <div className="flex flex-col sm:flex-row w-full max-w-xl items-center gap-4">
                        <Select value={statusFilter} onValueChange={(val: PaymentStatusFilter) => setStatusFilter(val)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="pending">Pendientes</SelectItem>
                                <SelectItem value="approved">Conciliados</SelectItem>
                                <SelectItem value="rejected">Rechazados</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex w-full items-center space-x-2">
                            <Input
                                placeholder="Buscar por inquilino, referencia..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                            <Button size="icon" variant="ghost">
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => requestSort('created_at')} className="hover:bg-transparent px-0 font-bold">
                                            Fecha Registro
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => requestSort('date')} className="hover:bg-transparent px-0 font-bold">
                                            Fecha Pago
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => requestSort('billing_period')} className="hover:bg-transparent px-0 font-bold">
                                            Mes pagado
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
                                        <Button variant="ghost" onClick={() => requestSort('unit')} className="hover:bg-transparent px-0 font-bold">
                                            Propiedad / Unidad
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <Button variant="ghost" onClick={() => requestSort('amount')} className="hover:bg-transparent px-0 font-bold w-full justify-end">
                                            Monto
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>Moneda</TableHead>
                                    <TableHead>Tasa</TableHead>
                                    <TableHead>Referencia</TableHead>
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
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : sortedPayments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                            No se encontraron pagos registrados
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedPayments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {payment.created_at ? format(new Date(payment.created_at), "dd/MM/yyyy HH:mm") : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {payment.date ? formatFn(parseISO(payment.date), 'dd/MM/yyyy') : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {/* Billing Period formatted as Month Year */}
                                                <span className="capitalize">
                                                    {payment.billing_period
                                                        ? formatFn(parseISO(payment.billing_period), 'MMMM yyyy', { locale: es })
                                                        : '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {payment.tenant?.name || "Desconocido"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-muted-foreground">{payment.unit?.property_name}</span>
                                                    <span>{payment.unit?.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={payment.status === 'rejected' ? "line-through text-muted-foreground" : ""}>
                                                    {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={payment.currency === 'USD' ? 'text-green-600 border-green-200' : 'text-blue-600 border-blue-200'}>
                                                    {payment.currency === 'VES' ? 'Bs.' : (payment.currency || 'USD')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {payment.exchange_rate ? payment.exchange_rate.toFixed(2) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs">{payment.reference || "-"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    payment.status === 'approved' ? 'default' :
                                                        payment.status === 'rejected' ? 'destructive' : 'secondary'
                                                }>
                                                    {payment.status === 'approved' ? 'Conciliado' :
                                                        payment.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {/* Show actions if pending or allow editing */}
                                                    {payment.status === 'pending' ? (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => handleActionClick(payment.id, 'approve')}
                                                                title="Aprobar / Conciliar"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleActionClick(payment.id, 'reject')}
                                                                title="Rechazar"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        // "Edit" button for non-pending to allow re-evaluation
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleActionClick(payment.id, payment.status === 'approved' ? 'reject' : 'approve')}
                                                            title="Cambiar Estado"
                                                        >
                                                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    )}
                                                    {payment.proof_url && (
                                                        <Button size="sm" variant="ghost" asChild>
                                                            <a href={payment.proof_url} target="_blank" rel="noreferrer">
                                                                <FileText className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}

                                                    {(payment.status === 'approved' || payment.status === 'paid') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => setSelectedPaymentForReceipt(payment)}
                                                            title="Imprimir Recibo"
                                                        >
                                                            <PrinterIcon className="h-4 w-4 mr-1" />
                                                        </Button>
                                                    )}

                                                    
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <div className="flex-1 text-sm text-muted-foreground">
                            Mostrando {filteredPayments.length} registros (Total: {total})
                        </div>
                        <div className="space-x-2 flex items-center">
                            <p className="text-sm text-muted-foreground mr-2">Filas por página:</p>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(val) => {
                                    setPageSize(Number(val))
                                    setPage(1)
                                }}
                            >
                                <SelectTrigger className="w-[70px] h-8 inline-flex">
                                    <SelectValue placeholder={pageSize.toString()} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[5, 10, 20, 50].map((size) => (
                                        <SelectItem key={size} value={size.toString()}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="w-4"></div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                            </Button>
                            <span className="text-sm font-medium mx-2">
                                Página {page} de {Math.ceil(total / pageSize) || 1}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={filteredPayments.length < pageSize && (page * pageSize) >= total || loading}
                            >
                                Siguiente
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <PaymentActionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                action={dialogAction}
                paymentId={selectedPaymentId}
                tenantEmail={payments.find(p => p.id === selectedPaymentId)?.tenant?.email}
                // Pass details
                amount={payments.find(p => p.id === selectedPaymentId)?.amount}
                currency={payments.find(p => p.id === selectedPaymentId)?.currency || undefined}
                paymentDate={payments.find(p => p.id === selectedPaymentId)?.date || undefined}
                exchangeRate={payments.find(p => p.id === selectedPaymentId)?.exchange_rate || undefined}
                registrationDate={payments.find(p => p.id === selectedPaymentId)?.created_at || undefined}

                onConfirm={updatePaymentStatus}
            />

            <PaymentDialog
                open={isRegisterDialogOpen}
                onOpenChange={setIsRegisterDialogOpen}
                tenant={undefined}
                isAdmin={true}
            />

            {selectedPaymentForReceipt && (
                <PrintableReceiptHandler
                    payment={selectedPaymentForReceipt}
                    onClose={() => setSelectedPaymentForReceipt(null)}
                />
            )}
        </div>
    )
}
