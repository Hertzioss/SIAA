"use client"

import { useState } from "react"
import { usePayments } from "@/hooks/use-payments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaymentActionDialog } from "@/components/payments/payment-action-dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Check, X, Search, FileText, Loader2, Edit2, ChevronLeft, ChevronRight } from "lucide-react"
import { parseLocalDate } from "@/lib/utils"

/**
 * Página para la gestión y conciliación de pagos.
 * Muestra historial de pagos, permite aprobar/rechazar pagos y filtrar por estado.
 */
export default function PaymentsPage() {
    const {
        payments, loading, total,
        page, setPage, pageSize,
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

    const totalPages = Math.ceil(total / pageSize)

    const handleActionClick = (id: string, action: 'approve' | 'reject') => {
        setSelectedPaymentId(id)
        setDialogAction(action)
        setDialogOpen(true)
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Conciliación de Pagos</h1>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Historial de Pagos</CardTitle>
                    <div className="flex flex-col sm:flex-row w-full max-w-xl items-center gap-4">
                        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
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
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Inquilino</TableHead>
                                    <TableHead>Propiedad / Unidad</TableHead>
                                    <TableHead>Monto</TableHead>
                                    <TableHead>Método</TableHead>
                                    <TableHead>Referencia</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center h-24">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredPayments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                            No se encontraron pagos registrados
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPayments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>
                                                {format(parseLocalDate(payment.date), "dd-MM-yyyy")}
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
                                            <TableCell>
                                                <span className={payment.status === 'rejected' ? "line-through text-muted-foreground" : ""}>
                                                    ${payment.amount.toFixed(2)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="capitalize">
                                                {payment.method === 'pago_movil' ? 'Pago Móvil' : payment.method}
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
                        <div className="space-x-2">
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
                                Página {page}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={filteredPayments.length < pageSize && (page * pageSize) >= total || loading} // Simplified check
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
                onConfirm={updatePaymentStatus}
            />
        </div>
    )
}
