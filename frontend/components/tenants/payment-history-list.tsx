"use client"

import { useEffect } from "react"
import { useTenantPayments } from "@/hooks/use-tenant-payments"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { parseLocalDate } from "@/lib/utils"
import { format } from "date-fns"

import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { PrintableReceiptHandler } from "@/components/printable-receipt-handler"
import { PendingBalanceCard } from "@/components/payments/pending-balance-card"
import { useState } from "react"

interface PaymentHistoryListProps {
    tenantId: string
}

/**
 * Lista de historial de pagos de un inquilino.
 * Muestra una tabla paginada con los pagos realizados, estado y opciones para imprimir recibos via modal.
 */
export function PaymentHistoryList({ tenantId }: PaymentHistoryListProps) {
    const { history, isLoading, fetchPaymentHistory, getMonthlyBalance } = useTenantPayments()
    const [selectedPayment, setSelectedPayment] = useState<any>(null)
    const [balanceData, setBalanceData] = useState<any>(null)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 5

    const generateReceipt = (payment: any) => {
        setSelectedPayment(payment)
    }

    useEffect(() => {
        if (tenantId) {
            const loadData = async () => {
                const { totalPages: fetchedTotalPages } = await fetchPaymentHistory(tenantId, currentPage, pageSize)
                setTotalPages(fetchedTotalPages)
                const balance = await getMonthlyBalance(tenantId)
                setBalanceData(balance)
            }
            loadData()
        }
    }, [tenantId, currentPage, fetchPaymentHistory, getMonthlyBalance])

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (history.length === 0 && currentPage === 1) {
        return (
            <div className="space-y-4">
                {balanceData && balanceData.isPartial && (
                    <PendingBalanceCard data={balanceData} />
                )}
                <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
                    No hay pagos registrados para este inquilino.
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {balanceData && balanceData.isPartial && (
                <PendingBalanceCard data={balanceData} />
            )}

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell>{format(parseLocalDate(payment.date), 'dd-MM-yyyy')}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={payment.concept}>
                                    {payment.concept}
                                </TableCell>
                                <TableCell>{payment.reference_number || '-'}</TableCell>
                                <TableCell className="text-right font-medium">
                                    <div className="flex flex-col items-end">
                                        <span>
                                            Bs. {payment.currency === 'USD'
                                                ? (payment.amount * (payment.exchange_rate || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2 })
                                                : payment.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })
                                            }
                                        </span>
                                        {payment.currency === 'USD' && (
                                            <span className="text-xs text-muted-foreground">
                                                (Ref. ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={
                                        (payment.status === 'paid' || payment.status === 'approved') ? 'default' :
                                            payment.status === 'pending' ? 'secondary' : 'destructive'
                                    } className={
                                        (payment.status === 'paid' || payment.status === 'approved') ? 'bg-green-500 hover:bg-green-600' :
                                            payment.status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600 text-status-fg' : ''
                                    }>
                                        {(payment.status === 'paid' || payment.status === 'approved') ? 'Pagado' :
                                            payment.status === 'pending' ? 'Pendiente' : 'Vencido'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {(payment.status === 'paid' || payment.status === 'approved') && (
                                        <Button variant="ghost" size="icon" onClick={() => generateReceipt(payment)} title="Imprimir Recibo">
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoading}
                    >
                        Siguiente <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* Receipt Handler */}
            {selectedPayment && (
                <PrintableReceiptHandler
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}
        </div >
    )
}
