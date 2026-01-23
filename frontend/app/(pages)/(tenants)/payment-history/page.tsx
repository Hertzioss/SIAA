'use client'

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, Loader2, Calendar, Printer, ChevronLeft, ChevronRight } from "lucide-react"
import { useTenantPayments } from "@/hooks/use-tenant-payments"
import { useContracts } from "@/hooks/use-contracts"
import { format, addMonths } from "date-fns"
import { es } from "date-fns/locale"
import { PrintableReceiptHandler } from "@/components/printable-receipt-handler"
import { PendingBalanceCard } from "@/components/payments/pending-balance-card"
import { parseLocalDate } from "@/lib/utils"

/**
 * Página de historial de pagos del inquilino.
 * Muestra una tabla con todos los pagos realizados, su estado,
 * y permite descargar recibos o ver comprobantes.
 * @returns 
 */
export default function PaymentHistoryPage() {
    const { history, isLoading, fetchPaymentHistory, getMonthlyBalance, getNextPaymentDate } = useTenantPayments()
    const { contracts, isLoading: isLoadingContracts } = useContracts()
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [balanceData, setBalanceData] = useState<any>(null)
    const [nextPaymentDate, setNextPaymentDate] = useState<Date | null>(null)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 5

    // Effect to get tenantId from contracts (active or most recent)
    useEffect(() => {
        if (contracts.length > 0) {
            // Prefer active contract, otherwise take the first one
            const active = contracts.find(c => c.status === 'active') || contracts[0]
            if (active && active.tenant_id) {
                setTenantId(active.tenant_id)
            }
        }
    }, [contracts])

    // Effect to fetch history once we have tenantId
    useEffect(() => {
        if (tenantId) {
            const loadData = async () => {
                const { totalPages: fetchedTotalPages } = await fetchPaymentHistory(tenantId, currentPage, pageSize)
                setTotalPages(fetchedTotalPages)
                getMonthlyBalance(tenantId).then(setBalanceData)
                getNextPaymentDate(tenantId).then(setNextPaymentDate)
            }
            loadData()
        }
    }, [tenantId, currentPage, fetchPaymentHistory, getMonthlyBalance, getNextPaymentDate])

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
        }
    }

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
        }).format(amount)
    }

    // Active Contract for rent amount
    const activeContract = contracts.find(c => c.status === 'active')

    // Receipt Printing
    const [selectedPayment, setSelectedPayment] = useState<any>(null)

    const generateReceipt = (payment: any) => {
        setSelectedPayment(payment)
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Historial de Pagos</h2>
                <p className="text-muted-foreground">
                    Consulte el estado de sus pagos realizados.
                </p>
            </div>

            {/* Pending Balance Card (Partial Payment) */}
            {balanceData && balanceData.isPartial && (
                <PendingBalanceCard data={balanceData} />
            )}

            {/* Next Payment Card - Only show if NO partial payment pending, or below it? */}
            {/* User requirement: "must exist a card with that info". Doesn't say replace. */}
            {/* If partial payment exists, the "next payment" is technically the pending balance of THIS month. */}
            {/* If we show both, it might be confusing. */}
            {/* If there is a pending balance for current month, next payment IS paying that balance. */}

            {activeContract && nextPaymentDate && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-medium">Próximo Pago</CardTitle>
                        <Calendar className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {format(nextPaymentDate, "d 'de' MMMM, yyyy", { locale: es })}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Monto estimado: ${activeContract.rent_amount}
                        </p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Pagos Recientes</CardTitle>
                    <CardDescription>Mostrando los últimos movimientos registrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    {(isLoading || isLoadingContracts) ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay pagos registrados.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="text-center">Estado</TableHead>
                                        <TableHead className="text-right">Comprobante</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{format(parseLocalDate(payment.date), 'dd-MM-yyyy')}</TableCell>
                                            <TableCell>{payment.concept}</TableCell>
                                            <TableCell>{payment.payment_method}</TableCell>
                                            <TableCell>{payment.reference_number || '-'}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(payment.amount, payment.currency)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={
                                                    (payment.status === 'paid' || payment.status === 'approved') ? 'default' :
                                                        payment.status === 'pending' ? 'secondary' : 'destructive'
                                                } className={
                                                    (payment.status === 'paid' || payment.status === 'approved') ? 'bg-green-500 hover:bg-green-600' :
                                                        payment.status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600 text-status-fg' : ''
                                                }>
                                                    {(payment.status === 'paid' || payment.status === 'approved') ? 'Aprobado' :
                                                        payment.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {payment.proof_url && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Ver Comprobante">
                                                            <a href={payment.proof_url} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {(payment.status === 'paid' || payment.status === 'approved') && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generateReceipt(payment)} title="Imprimir Recibo">
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

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
                        </div>
                    )}
                </CardContent>
            </Card>


            {/* Hidden Receipt for Printing - using off-screen instead of hidden for better print support */}
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
