"use client"

import { useEffect, useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { parseLocalDate, formatCurrency, formatCurrencyLabel, isBolivares } from "@/lib/utils"
import { format, isValid } from "date-fns"
import { Loader2, Printer, ChevronLeft, ChevronRight, FileDown, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PrintableReceiptHandler } from "@/components/printable-receipt-handler"
import { PendingBalanceCard } from "@/components/payments/pending-balance-card"
import { supabase } from "@/lib/supabase"
import * as XLSX from "xlsx"
import { toast } from "sonner"

interface PaymentHistoryListProps {
    tenantId: string
}

interface ExportablePaymentRow {
    id: string
    date: string
    concept: string | null
    reference_number: string | null
    amount: number
    currency: string
    exchange_rate: number | null
    status: string
}

function getPaymentStatusMeta(status: string) {
    if (status === "paid" || status === "approved") {
        return {
            label: "Pagado",
            className:
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        }
    }
    if (status === "pending") {
        return {
            label: "Pendiente",
            className:
                "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        }
    }
    if (status === "rejected") {
        return {
            label: "Rechazado",
            className:
                "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
        }
    }
    return {
        label: "Vencido",
        className:
            "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    }
}

/**
 * Lista de historial de pagos de un inquilino.
 * Muestra una tabla paginada con los pagos realizados, estado y opciones para imprimir recibos.
 */
export function PaymentHistoryList({ tenantId }: PaymentHistoryListProps) {
    const { history, isLoading, fetchPaymentHistory, fetchPaymentById, getMonthlyBalance } =
        useTenantPayments()
    const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null)
    const [balanceData, setBalanceData] = useState<MonthlyBalance | null>(null)

    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 6

    const generateReceipt = async (payment: PaymentWithDetails) => {
        toast.promise(fetchPaymentById(payment.id), {
            loading: "Preparando recibo...",
            success: (fullPayment) => {
                if (fullPayment) {
                    setSelectedPayment(fullPayment)
                    return "Recibo listo para imprimir"
                }
                throw new Error("No se pudo cargar la información del recibo")
            },
            error: "Error al generar el recibo",
        })
    }

    const [isExporting, setIsExporting] = useState(false)

    const handleExportAll = async () => {
        setIsExporting(true)
        toast.info("Generando reporte de pagos, por favor espere...")
        try {
            let contractIds: string[] = []
            if (tenantId) {
                const { data: contracts } = await supabase
                    .from("contracts")
                    .select("id")
                    .eq("tenant_id", tenantId)
                if (contracts) contractIds = contracts.map((c) => c.id)
            }

            let allPayments: ExportablePaymentRow[] = []

            if (tenantId) {
                const { data: tenantPayments, error: err1 } = await supabase
                    .from("payments")
                    .select("id, date, concept, reference_number, amount, currency, exchange_rate, status")
                    .eq("tenant_id", tenantId)
                    .order("date", { ascending: false })

                if (err1) throw err1
                if (tenantPayments) allPayments = [...(tenantPayments as ExportablePaymentRow[])]
            }

            if (contractIds.length > 0) {
                const { data: contractPayments, error: err2 } = await supabase
                    .from("payments")
                    .select("id, date, concept, reference_number, amount, currency, exchange_rate, status")
                    .in("contract_id", contractIds)
                    .order("date", { ascending: false })

                if (err2) throw err2

                if (contractPayments) {
                    const existingIds = new Set(allPayments.map((p) => p.id))
                    const newPayments = (contractPayments as ExportablePaymentRow[]).filter(
                        (p) => !existingIds.has(p.id)
                    )
                    allPayments = [...allPayments, ...newPayments]
                }
            }

            allPayments.sort(
                (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
            )

            const exportData = allPayments.map((p) => ({
                Fecha: p.date ? format(parseLocalDate(p.date), "dd-MM-yyyy") : "-",
                Concepto: p.concept?.replace(/Renta/gi, "Canon") || "-",
                "Referencia / Banco": p.reference_number || "-",
                Monto: p.amount,
                Moneda: formatCurrencyLabel(p.currency),
                "Monto Bs (Ref)": !isBolivares(p.currency)
                    ? (p.amount * (p.exchange_rate || 1)).toFixed(2)
                    : p.amount.toFixed(2),
                Estado: getPaymentStatusMeta(p.status).label,
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
                const { totalPages: fetchedTotalPages } = await fetchPaymentHistory(
                    tenantId,
                    currentPage,
                    pageSize
                )
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
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-36" />
                </div>
                <div className="rounded-lg border overflow-hidden">
                    <div className="p-3 space-y-2.5">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (history.length === 0 && currentPage === 1) {
        return (
            <div className="space-y-4">
                {balanceData && balanceData.isPartial && (
                    <PendingBalanceCard data={balanceData} />
                )}
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center border rounded-lg border-dashed bg-muted/20">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2.5">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Sin pagos registrados</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Los pagos reportados o conciliados de este inquilino aparecerán aquí.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-4">
                {balanceData && balanceData.isPartial && (
                    <PendingBalanceCard data={balanceData} />
                )}

                <div className="flex justify-between items-center gap-2">
                    <div>
                        <h3 className="text-sm font-medium">Historial de Pagos</h3>
                        <p className="text-xs text-muted-foreground">
                            Mostrando página {currentPage} de {Math.max(1, totalPages)}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleExportAll}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <FileDown className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Exportar Excel
                    </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="text-xs">Fecha</TableHead>
                                <TableHead className="text-xs">Concepto</TableHead>
                                <TableHead className="text-xs">Referencia</TableHead>
                                <TableHead className="text-xs text-right">Monto</TableHead>
                                <TableHead className="text-xs">Estado</TableHead>
                                <TableHead className="text-xs text-right w-[68px]">Recibo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((payment) => {
                                const statusMeta = getPaymentStatusMeta(payment.status)
                                const amountInBs = isBolivares(payment.currency)
                                    ? payment.amount
                                    : payment.amount * (payment.exchange_rate || 0)
                                const conceptLabel =
                                    payment.concept?.replace(/Renta/gi, "Canon") || "-"
                                const formattedDate =
                                    payment.date && isValid(parseLocalDate(payment.date))
                                        ? format(parseLocalDate(payment.date), "dd/MM/yyyy")
                                        : payment.date || "-"

                                return (
                                    <TableRow key={payment.id} className="hover:bg-muted/30">
                                        <TableCell className="text-xs tabular-nums whitespace-nowrap">
                                            {formattedDate}
                                        </TableCell>
                                        <TableCell
                                            className="max-w-[220px] truncate text-sm"
                                            title={conceptLabel}
                                        >
                                            {conceptLabel}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                            {payment.reference_number || "—"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-medium">
                                                    {formatCurrency(amountInBs, "Bs")}
                                                </span>
                                                {!isBolivares(payment.currency) && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Ref. {formatCurrency(payment.amount, "USD")}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`font-medium text-[11px] ${statusMeta.className}`}
                                            >
                                                {statusMeta.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(payment.status === "paid" ||
                                                payment.status === "approved") && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => generateReceipt(payment)}
                                                        >
                                                            <Printer className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Imprimir recibo</TooltipContent>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isLoading}
                        >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            Página {currentPage} de {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || isLoading}
                        >
                            Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                    </div>
                )}

                {selectedPayment && (
                    <PrintableReceiptHandler
                        payment={selectedPayment}
                        onClose={() => setSelectedPayment(null)}
                    />
                )}
            </div>
        </TooltipProvider>
    )
}
