"use client"

import { useState } from "react"
import { usePayments, PaymentStatusFilter, Payment } from "@/hooks/use-payments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaymentActionDialog } from "@/components/payments/payment-action-dialog"
import { PaymentDialog } from "@/components/tenants/payment-dialog"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { PrintableReceiptHandler } from "@/components/printable-receipt-handler"
import {
    Check,
    X,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Printer as PrinterIcon,
    Pencil,
    ArrowLeftRight,
    Trash2,
    MoreVertical,
    Eye,
    Send,
    DollarSign,
    Paperclip,
    CheckCircle2
} from "lucide-react"
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
import { ExportButtons } from "@/components/export-buttons"
import { PaymentEditDialog } from "@/components/payments/payment-edit-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatCurrency, formatCurrencyLabel, parseLocalDate } from "@/lib/utils"

function formatSafeDate(dateStr?: string | null, pattern = "dd/MM/yyyy"): string {
    if (!dateStr) return "—"
    const parsed = parseLocalDate(dateStr)
    return isValid(parsed) ? format(parsed, pattern, { locale: es }) : "—"
}

/**
 * Estación de conciliación y gestión de pagos.
 * Toolbar unificado, tabla compacta de 6 columnas, acciones rápidas inline en pendientes
 * y verificación de comprobante lado a lado.
 */
export default function PaymentsPage() {
    const {
        payments, loading, total, pendingCount,
        page, setPage, pageSize, setPageSize,
        statusFilter, setStatusFilter,
        searchTerm, setSearchTerm,
        sortColumn, setSortColumn,
        sortDirection, setSortDirection,
        fetchPayments,
        updatePaymentStatus, updatePayment, fetchFullPayment, deletePayment, resendReceipt
    } = usePayments()

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setPage(1)
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

    const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
    const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null)
    const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null)
    const [paymentToResend, setPaymentToResend] = useState<Payment | null>(null)

    const activeActionPayment = payments.find((p) => p.id === selectedPaymentId)
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return (
        <div className="container mx-auto px-4 md:px-6 py-2 space-y-4">
            {/* Compact Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Conciliación de Pagos</h1>
                    <p className="text-xs text-muted-foreground">
                        Verifica comprobantes, aprueba pagos reportados y emite recibos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButtons
                        data={payments}
                        filename="reporte_pagos"
                        title="Reporte de Pagos"
                        columns={[
                            {
                                header: "Fecha Registro",
                                key: "created_at",
                                transform: (val: unknown) => {
                                    const str = typeof val === 'string' ? val : ''
                                    return str && isValid(new Date(str)) ? format(new Date(str), "dd/MM/yyyy HH:mm") : "-"
                                }
                            },
                            {
                                header: "Fecha Pago",
                                key: "date",
                                transform: (val: unknown) => formatSafeDate(typeof val === 'string' ? val : null)
                            },
                            {
                                header: "Mes Pagado",
                                key: "billing_period",
                                transform: (val: unknown) => formatSafeDate(typeof val === 'string' ? val : null, 'MMMM yyyy')
                            },
                            { header: "Inquilino", key: "tenant.name" },
                            {
                                header: "Unidad",
                                key: "unit",
                                transform: (u: unknown) => {
                                    const unit = u as Payment['unit']
                                    return unit ? `${unit.name} (${unit.property_name || ''})` : '-'
                                }
                            },
                            {
                                header: "Monto",
                                key: "amount",
                                transform: (val: unknown, row: unknown) => {
                                    const p = row as Payment
                                    const meta = p.metadata
                                    if (meta?.original_total_amount && Number(meta.split_total_parts) > 1) {
                                        return `${val} (Parte ${meta.split_index} de ${meta.split_total_parts} - Orig: ${meta.original_total_amount} ${formatCurrencyLabel(meta.original_currency)})`
                                    }
                                    return val
                                }
                            },
                            {
                                header: "Moneda",
                                key: "currency",
                                transform: (val: unknown) => formatCurrencyLabel(typeof val === 'string' ? val : null)
                            },
                            { header: "Tasa", key: "exchange_rate" },
                            { header: "Referencia", key: "reference" },
                            {
                                header: "Origen",
                                key: "registration_source",
                                transform: (val: unknown) => val === 'admin' ? 'Administrador' : 'Inquilino'
                            },
                            {
                                header: "Estado",
                                key: "status",
                                transform: (val: unknown) => val === 'approved' ? 'Conciliado' : val === 'rejected' ? 'Rechazado' : 'Pendiente'
                            }
                        ]}
                    />
                    <Button
                        size="sm"
                        className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setIsRegisterDialogOpen(true)}
                    >
                        <DollarSign className="mr-1.5 h-4 w-4" />
                        Registrar Pago
                    </Button>
                </div>
            </div>

            {/* Unified Toolbar: Status Tabs + Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <Tabs
                    value={statusFilter}
                    onValueChange={(value) => {
                        setStatusFilter(value as PaymentStatusFilter)
                        setPage(1)
                    }}
                >
                    <TabsList className="h-9 bg-muted/60 p-1">
                        <TabsTrigger value="pending" className="text-xs px-3 gap-1.5">
                            Pendientes
                            <span
                                className={cn(
                                    "inline-flex items-center justify-center rounded-full px-1.5 min-w-5 h-4 text-[11px] font-semibold tabular-nums",
                                    pendingCount > 0
                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                {pendingCount}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="text-xs px-3">
                            Conciliados
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="text-xs px-3">
                            Rechazados
                        </TabsTrigger>
                        <TabsTrigger value="all" className="text-xs px-3">
                            Todos
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar inquilino, referencia o nota..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="h-9 pl-8 pr-8 text-sm"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(''); setPage(1) }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Compact 6-Column Ledger Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead
                                        className="cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                                        onClick={() => handleSort('date')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Período / Fecha <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead>Inquilino / Inmueble</TableHead>
                                    <TableHead
                                        className="text-right cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                                        onClick={() => handleSort('amount')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Monto / Tasa <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                                        onClick={() => handleSort('reference_number')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Referencia <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                                        onClick={() => handleSort('status')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Estado <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell><div className="h-4 w-28 rounded bg-muted" /><div className="h-3 w-20 rounded bg-muted mt-1.5" /></TableCell>
                                            <TableCell><div className="h-4 w-36 rounded bg-muted" /><div className="h-3 w-28 rounded bg-muted mt-1.5" /></TableCell>
                                            <TableCell className="text-right"><div className="h-4 w-24 rounded bg-muted ml-auto" /><div className="h-3 w-16 rounded bg-muted ml-auto mt-1.5" /></TableCell>
                                            <TableCell><div className="h-4 w-24 rounded bg-muted" /></TableCell>
                                            <TableCell><div className="h-5 w-20 rounded-full bg-muted" /></TableCell>
                                            <TableCell className="text-right"><div className="h-7 w-20 rounded bg-muted ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : payments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                                                {statusFilter === 'pending' && !searchTerm ? (
                                                    <>
                                                        <CheckCircle2 className="h-7 w-7 text-emerald-500/80 mb-1" />
                                                        <p className="text-sm font-medium text-foreground">No hay pagos pendientes por conciliar</p>
                                                        <p className="text-xs">Todos los pagos reportados han sido procesados.</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-sm font-medium text-foreground">No se encontraron pagos</p>
                                                        <p className="text-xs">Prueba ajustar la búsqueda o cambiar de pestaña.</p>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    payments.map((payment) => {
                                        const isSplit = Boolean(
                                            payment.metadata?.original_total_amount &&
                                            Number(payment.metadata.split_total_parts) > 1
                                        )

                                        return (
                                            <TableRow key={payment.id} className="group">
                                                {/* 1. Period & Dates */}
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="font-medium text-sm capitalize">
                                                        {formatSafeDate(payment.billing_period, 'MMMM yyyy')}
                                                    </div>
                                                    <div
                                                        className="text-[11px] text-muted-foreground tabular-nums"
                                                        title={
                                                            payment.created_at && isValid(new Date(payment.created_at))
                                                                ? `Registrado: ${format(new Date(payment.created_at), "dd/MM/yyyy HH:mm")}`
                                                                : undefined
                                                        }
                                                    >
                                                        Pago: {formatSafeDate(payment.date)}
                                                    </div>
                                                </TableCell>

                                                {/* 2. Tenant & Unit */}
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-sm truncate max-w-[200px]">
                                                            {payment.tenant?.name || "Desconocido"}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0.25 rounded-full font-medium shrink-0",
                                                                payment.registration_source === 'admin'
                                                                    ? "bg-muted text-muted-foreground"
                                                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                                            )}
                                                        >
                                                            {payment.registration_source === 'admin' ? 'Admin' : 'Inquilino'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                                                        {payment.unit?.property_name || 'Sin inmueble'}
                                                        {payment.unit?.name ? ` · ${payment.unit.name}` : ''}
                                                    </div>
                                                </TableCell>

                                                {/* 3. Amount, Currency & Rate */}
                                                <TableCell className="text-right whitespace-nowrap tabular-nums">
                                                    <div
                                                        className={cn(
                                                            "font-semibold text-sm",
                                                            payment.status === 'rejected' && "line-through text-muted-foreground"
                                                        )}
                                                    >
                                                        {formatCurrency(Number(payment.amount), payment.currency || 'USD')}
                                                    </div>
                                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                        {payment.exchange_rate ? (
                                                            <span className="text-[11px] text-muted-foreground">
                                                                Tasa {Number(payment.exchange_rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        ) : null}
                                                        {isSplit && payment.metadata && (
                                                            <span
                                                                className="text-[10px] bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 px-1.5 rounded border border-amber-200 dark:border-amber-800"
                                                                title={`Parte ${payment.metadata.split_index} de ${payment.metadata.split_total_parts} de un pago de ${payment.metadata.original_total_amount} ${formatCurrencyLabel(payment.metadata.original_currency)}`}
                                                            >
                                                                {payment.metadata.split_index}/{payment.metadata.split_total_parts}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* 4. Reference & Proof */}
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="font-mono text-xs">{payment.reference || "—"}</div>
                                                    {payment.proof_url && (
                                                        <a
                                                            href={payment.proof_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                                                        >
                                                            <Paperclip className="h-3 w-3" />
                                                            Comprobante
                                                        </a>
                                                    )}
                                                </TableCell>

                                                {/* 5. Status */}
                                                <TableCell className="whitespace-nowrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[11px] font-medium",
                                                            payment.status === 'approved'
                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                                : payment.status === 'rejected'
                                                                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                                                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                                                        )}
                                                    >
                                                        {payment.status === 'approved'
                                                            ? 'Conciliado'
                                                            : payment.status === 'rejected'
                                                                ? 'Rechazado'
                                                                : 'Pendiente'}
                                                    </Badge>
                                                </TableCell>

                                                {/* 6. Quick Actions + Overflow Menu */}
                                                <TableCell className="text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {payment.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                                                    onClick={() => handleActionClick(payment.id, 'approve')}
                                                                    title="Aprobar / Conciliar pago"
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                                                    onClick={() => handleActionClick(payment.id, 'reject')}
                                                                    title="Rechazar pago"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}

                                                        {(payment.status === 'approved' || payment.status === 'paid') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={async () => {
                                                                    const fullPayment = await fetchFullPayment(payment.id)
                                                                    if (fullPayment) setSelectedPaymentForReceipt(fullPayment)
                                                                }}
                                                                title="Imprimir recibo"
                                                            >
                                                                <PrinterIcon className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <span className="sr-only">Más acciones</span>
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />

                                                                {payment.status === 'pending' ? (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleActionClick(payment.id, 'approve')}
                                                                            className="text-emerald-600 focus:text-emerald-700"
                                                                        >
                                                                            <Check className="mr-2 h-4 w-4" />
                                                                            Aprobar / Conciliar
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleActionClick(payment.id, 'reject')}
                                                                            className="text-rose-600 focus:text-rose-700"
                                                                        >
                                                                            <X className="mr-2 h-4 w-4" />
                                                                            Rechazar
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                ) : (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleActionClick(
                                                                                payment.id,
                                                                                payment.status === 'approved' ? 'reject' : 'approve'
                                                                            )
                                                                        }
                                                                    >
                                                                        <ArrowLeftRight className="mr-2 h-4 w-4 text-amber-600" />
                                                                        Cambiar estado
                                                                    </DropdownMenuItem>
                                                                )}

                                                                <DropdownMenuSeparator />

                                                                <DropdownMenuItem onClick={() => setEditingPayment(payment)}>
                                                                    <Pencil className="mr-2 h-4 w-4 text-primary" />
                                                                    Editar datos
                                                                </DropdownMenuItem>

                                                                {(payment.status === 'approved' || payment.status === 'paid') && (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            onClick={async () => {
                                                                                const fullPayment = await fetchFullPayment(payment.id)
                                                                                if (fullPayment) setSelectedPaymentForReceipt(fullPayment)
                                                                            }}
                                                                        >
                                                                            <PrinterIcon className="mr-2 h-4 w-4 text-blue-600" />
                                                                            Imprimir recibo
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={() => setPaymentToResend(payment)}
                                                                            disabled={!payment.tenant?.email}
                                                                        >
                                                                            <Send className={cn("mr-2 h-4 w-4", payment.tenant?.email ? "text-emerald-600" : "text-muted-foreground")} />
                                                                            Reenviar recibo
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}

                                                                {payment.proof_url && (
                                                                    <DropdownMenuItem asChild>
                                                                        <a href={payment.proof_url} target="_blank" rel="noreferrer">
                                                                            <Eye className="mr-2 h-4 w-4" />
                                                                            Ver comprobante
                                                                        </a>
                                                                    </DropdownMenuItem>
                                                                )}

                                                                <DropdownMenuSeparator />

                                                                <DropdownMenuItem
                                                                    onClick={() => setPaymentToDelete(payment.id)}
                                                                    className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Eliminar pago
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer Pagination Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t text-xs text-muted-foreground">
                        <div className="tabular-nums">
                            Mostrando <span className="font-medium text-foreground">{payments.length}</span> de{' '}
                            <span className="font-medium text-foreground">{total}</span> registros
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Filas:</span>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(val) => {
                                    setPageSize(Number(val))
                                    setPage(1)
                                }}
                            >
                                <SelectTrigger className="w-[68px] h-8 text-xs">
                                    <SelectValue placeholder={pageSize.toString()} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 50].map((size) => (
                                        <SelectItem key={size} value={size.toString()}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-medium text-foreground tabular-nums px-1">
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={(page >= totalPages) || loading}
                            >
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
                tenantName={activeActionPayment?.tenant?.name}
                tenantEmail={activeActionPayment?.tenant?.email}
                amount={activeActionPayment?.amount}
                currency={activeActionPayment?.currency || undefined}
                paymentDate={activeActionPayment?.date || undefined}
                exchangeRate={activeActionPayment?.exchange_rate || undefined}
                registrationDate={activeActionPayment?.created_at || undefined}
                reference={activeActionPayment?.reference || undefined}
                proofUrl={activeActionPayment?.proof_url || undefined}
                concept={activeActionPayment?.concept || undefined}
                metadata={activeActionPayment?.metadata || undefined}
                onConfirm={updatePaymentStatus}
            />

            <PaymentDialog
                open={isRegisterDialogOpen}
                onOpenChange={(open) => {
                    setIsRegisterDialogOpen(open)
                    if (!open) fetchPayments()
                }}
                tenant={undefined}
                isAdmin={true}
            />

            <PaymentEditDialog
                open={Boolean(editingPayment)}
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

            <AlertDialog open={Boolean(paymentToDelete)} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el registro del pago del sistema.
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
                            className="bg-rose-600 hover:bg-rose-700"
                        >
                            Eliminar pago
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={Boolean(paymentToResend)} onOpenChange={(open) => !open && setPaymentToResend(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reenviar recibo</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Desea reenviar el recibo de pago al correo <strong>{paymentToResend?.tenant?.email || 'desconocido'}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (paymentToResend) {
                                    await resendReceipt(paymentToResend.id)
                                    setPaymentToResend(null)
                                }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            Reenviar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
