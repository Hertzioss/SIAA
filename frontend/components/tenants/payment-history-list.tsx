"use client"

import { useEffect } from "react"
import { useTenantPayments } from "@/hooks/use-tenant-payments"
import { PaymentWithDetails, MonthlyBalance } from "@/types/payment"
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
import { format, isValid } from "date-fns"

import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { PrintableReceiptHandler } from "@/components/printable-receipt-handler"
import { PendingBalanceCard } from "@/components/payments/pending-balance-card"
import { useState } from "react"
import { FileDown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import * as XLSX from "xlsx"
import { toast } from "sonner"

interface PaymentHistoryListProps {
    tenantId: string
}

/**
 * Lista de historial de pagos de un inquilino.
 * Muestra una tabla paginada con los pagos realizados, estado y opciones para imprimir recibos via modal.
 */
export function PaymentHistoryList({ tenantId }: PaymentHistoryListProps) {
    const { history, isLoading, fetchPaymentHistory, getMonthlyBalance } = useTenantPayments()
    const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null)
    const [balanceData, setBalanceData] = useState<MonthlyBalance | null>(null)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 5

    const generateReceipt = (payment: PaymentWithDetails) => {
        setSelectedPayment(payment)
    }

    const [isExporting, setIsExporting] = useState(false)

    const handleExportAll = async () => {
        setIsExporting(true)
        toast.info("Generando reporte de pagos, por favor espere...")
        try {
            let contractIds: string[] = []
            if (tenantId) {
                const { data: contracts } = await supabase.from('contracts').select('id').eq('tenant_id', tenantId)
                if (contracts) contractIds = contracts.map(c => c.id)
            }

            let allPayments: any[] = []

            if (tenantId) {
                const { data: tenantPayments, error: err1 } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('date', { ascending: false })
                
                if (err1) throw err1;
                if (tenantPayments) allPayments = [...tenantPayments]
            }

            if (contractIds.length > 0) {
                const { data: contractPayments, error: err2 } = await supabase
                    .from('payments')
                    .select('*')
                    .in('contract_id', contractIds)
                    .order('date', { ascending: false })
                
                if (err2) throw err2;

                if (contractPayments) {
                    const existingIds = new Set(allPayments.map(p => p.id))
                    const newPayments = contractPayments.filter(p => !existingIds.has(p.id))
                    allPayments = [...allPayments, ...newPayments]
                }
            }
            
            // Sort
            allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

            const exportData = allPayments.map((p: any) => ({
                "Fecha": p.date ? format(parseLocalDate(p.date), 'dd-MM-yyyy') : '-',
                "Concepto": p.concept,
                "Referencia / Banco": p.reference_number || '-',
                "Monto": p.amount,
                "Moneda": p.currency,
                "Monto Bs (Ref)": p.currency === 'USD' ? (p.amount * (p.exchange_rate || 1)).toFixed(2) : p.amount.toFixed(2),
                "Estado": p.status === 'paid' || p.status === 'approved' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : 'Vencido'
            }))
            
            const worksheet = XLSX.utils.json_to_sheet(exportData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Historial de Pagos")
            XLSX.writeFile(workbook, `Pagos_Inquilino_${tenantId.slice(0, 5)}.xlsx`)
            
            toast.success("Historial de pagos exportado a Excel.")
        } catch (error) {
            console.error("Error exporting payments:", error)
            toast.error("Error al exportar los pagos.")
        } finally {
            setIsExporting(false)
        }
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

            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Últimos Pagos</h3>
                <Button variant="outline" size="sm" onClick={handleExportAll} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    Exportar Historial
                </Button>
            </div>

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
                                <TableCell>{payment.date && isValid(parseLocalDate(payment.date)) ? format(parseLocalDate(payment.date), 'dd-MM-yyyy') : payment.date || '-'}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={payment.concept || undefined}>
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
