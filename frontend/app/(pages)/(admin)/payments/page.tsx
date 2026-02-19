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
import { Check, X, Search, FileText, Loader2, Edit2, ChevronLeft, ChevronRight, ArrowUpDown, Printer as PrinterIcon, Pencil, ArrowLeftRight, Trash2, MoreVertical, Eye } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { parseISO, format as formatFn } from "date-fns"
import { ExportButtons } from "@/components/export-buttons"
import { PaymentEditDialog } from "@/components/payments/payment-edit-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Página para la gestión y conciliación de pagos.
 * Muestra historial de pagos, permite aprobar/rechazar pagos y filtrar por estado.
 */
export default function PaymentsPage() {
    const {
        payments, loading, total,
        page, setPage, pageSize, setPageSize,
        statusFilter, setStatusFilter,
        searchTerm, setSearchTerm,
        updatePaymentStatus, updatePayment, fetchFullPayment, deletePayment
    } = usePayments()

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setPage(1) // Reset to first page on search
    }

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
    const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null)

    const handleActionClick = (id: string, action: 'approve' | 'reject') => {
        setSelectedPaymentId(id)
        setDialogAction(action)
        setDialogOpen(true)
    }

    // Generic Register Dialog State
    const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)

    // Edit Dialog State
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

    // Receipt Component State
    const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null)

    // Delete Confirmation State
    const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null)

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Conciliación de Pagos</h1>
                <div className="flex gap-2">
                     <ExportButtons
                        data={payments}
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
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm mb-6">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por referencia o nota..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="pl-9"
                    />
                </div>
                {/* Posible lugar para filtros adicionales en el futuro */}
            </div>

            <Tabs value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value as PaymentStatusFilter)
                setPage(1)
            }} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger 
                            value="pending" 
                            className="data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all"
                        >
                            Pendientes
                            <Badge className="ml-2 bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
                                {statusFilter === 'pending' ? total : '...'}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="approved"
                            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all"
                        >
                            Histórico (Conciliados)
                        </TabsTrigger>
                        <TabsTrigger 
                            value="rejected"
                            className="data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all"
                        >
                            Rechazados
                        </TabsTrigger>
                        <TabsTrigger 
                            value="all"
                            className="data-[state=active]:bg-slate-800 data-[state=active]:text-white transition-all"
                        >
                            Todos
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={statusFilter} className="mt-0">
                    <Card>
                        <CardHeader className="pb-0">
                            <CardTitle className="text-lg font-medium">
                                {statusFilter === 'pending' && "Pagos Pendientes por Conciliar"}
                                {statusFilter === 'approved' && "Historial de Pagos Conciliados"}
                                {statusFilter === 'rejected' && "Pagos Rechazados"}
                                {statusFilter === 'all' && "Listado Completo de Pagos"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha Registro</TableHead>
                                            <TableHead>Fecha Pago</TableHead>
                                            <TableHead>Mes pagado</TableHead>
                                            <TableHead>Inquilino</TableHead>
                                            <TableHead>Propiedad / Unidad</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                            <TableHead>Moneda</TableHead>
                                            <TableHead>Tasa</TableHead>
                                            <TableHead>Referencia</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={11} className="text-center h-24">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                                </TableCell>
                                            </TableRow>
                                        ) : payments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={11} className="text-center h-24 text-muted-foreground">
                                                    No se encontraron pagos registrados
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            payments.map((payment) => (
                                                <TableRow key={payment.id}>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {payment.created_at ? format(new Date(payment.created_at), "dd/MM/yyyy HH:mm") : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {payment.date ? formatFn(parseISO(payment.date), 'dd/MM/yyyy') : "-"}
                                                    </TableCell>
                                                    <TableCell>
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
                                                        <div className="flex justify-end">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                        <span className="sr-only">Abrir menú de acciones</span>
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    
                                                                    {payment.status === 'pending' ? (
                                                                        <>
                                                                            <DropdownMenuItem onClick={() => handleActionClick(payment.id, 'approve')} className="text-green-600 focus:text-green-700">
                                                                                <Check className="mr-2 h-4 w-4" />
                                                                                Aprobar / Conciliar
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleActionClick(payment.id, 'reject')} className="text-red-600 focus:text-red-700">
                                                                                <X className="mr-2 h-4 w-4" />
                                                                                Rechazar
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    ) : (
                                                                        <DropdownMenuItem onClick={() => handleActionClick(payment.id, payment.status === 'approved' ? 'reject' : 'approve')}>
                                                                            <ArrowLeftRight className="mr-2 h-4 w-4 text-orange-500" />
                                                                            Cambiar Estado
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    <DropdownMenuSeparator />
                                                                    
                                                                    <DropdownMenuItem onClick={() => setEditingPayment(payment)}>
                                                                        <Pencil className="mr-2 h-4 w-4 text-primary" />
                                                                        Editar Datos
                                                                    </DropdownMenuItem>

                                                                    {(payment.status === 'approved' || payment.status === 'paid') && (
                                                                        <DropdownMenuItem 
                                                                            onClick={async () => {
                                                                                const fullPayment = await fetchFullPayment(payment.id);
                                                                                if (fullPayment) setSelectedPaymentForReceipt(fullPayment)
                                                                            }}
                                                                        >
                                                                            <PrinterIcon className="mr-2 h-4 w-4 text-blue-600" />
                                                                            Imprimir Recibo
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    {payment.proof_url && (
                                                                        <DropdownMenuItem asChild>
                                                                            <a href={payment.proof_url} target="_blank" rel="noreferrer">
                                                                                <Eye className="mr-2 h-4 w-4" />
                                                                                Ver Comprobante
                                                                            </a>
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    <DropdownMenuSeparator />
                                                                    
                                                                    <DropdownMenuItem 
                                                                        onClick={() => setPaymentToDelete(payment.id)}
                                                                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Eliminar Pago
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
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
                                    Mostrando {payments.length} registros (Total: {total})
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
                                        disabled={payments.length < pageSize && (page * pageSize) >= total || loading}
                                    >
                                        Siguiente
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

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
                concept={payments.find(p => p.id === selectedPaymentId)?.concept || undefined}

                onConfirm={updatePaymentStatus}
            />

            <PaymentDialog
                open={isRegisterDialogOpen}
                onOpenChange={setIsRegisterDialogOpen}
                tenant={undefined}
                isAdmin={true}
            />

            <PaymentEditDialog
                open={!!editingPayment}
                onOpenChange={(open) => !open && setEditingPayment(null)}
                payment={editingPayment}
                onSave={updatePayment}
            />

            {selectedPaymentForReceipt && (
                <PrintableReceiptHandler
                    payment={selectedPaymentForReceipt}
                    onClose={() => setSelectedPaymentForReceipt(null)}
                />
            )}

            <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el registro del pago
                            del sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (paymentToDelete) {
                                    await deletePayment(paymentToDelete)
                                    setPaymentToDelete(null)
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Eliminar Pago
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
