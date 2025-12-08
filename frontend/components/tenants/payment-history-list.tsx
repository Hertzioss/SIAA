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
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

interface PaymentHistoryListProps {
    tenantId: string
}

export function PaymentHistoryList({ tenantId }: PaymentHistoryListProps) {
    const { history, isLoading, fetchPaymentHistory } = useTenantPayments()

    useEffect(() => {
        if (tenantId) {
            fetchPaymentHistory(tenantId)
        }
    }, [tenantId, fetchPaymentHistory])

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No hay pagos registrados para este inquilino.
            </div>
        )
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell>{format(new Date(payment.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={payment.concept}>
                                {payment.concept}
                            </TableCell>
                            <TableCell>{payment.reference_number || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                                {payment.currency} {payment.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                                <Badge variant={
                                    payment.status === 'paid' ? 'default' :
                                        payment.status === 'pending' ? 'secondary' : 'destructive'
                                } className={
                                    payment.status === 'paid' ? 'bg-green-500 hover:bg-green-600' :
                                        payment.status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''
                                }>
                                    {payment.status === 'paid' ? 'Pagado' :
                                        payment.status === 'pending' ? 'Pendiente' : 'Vencido'}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
