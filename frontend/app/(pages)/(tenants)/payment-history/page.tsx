'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, Loader2 } from "lucide-react"
import { useTenantPayments } from "@/hooks/use-tenant-payments"
import { useContracts } from "@/hooks/use-contracts"
import { format } from "date-fns"

export default function PaymentHistoryPage() {
    const { history, isLoading, fetchPaymentHistory } = useTenantPayments()
    const { contracts, isLoading: isLoadingContracts } = useContracts()
    const [tenantId, setTenantId] = useState<string | null>(null)

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
            fetchPaymentHistory(tenantId)
        }
    }, [tenantId, fetchPaymentHistory])

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
        }).format(amount)
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Historial de Pagos</h2>
                <p className="text-muted-foreground">
                    Consulte el estado de sus pagos realizados.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pagos Recientes</CardTitle>
                    <CardDescription>Mostrando los últimos movimientos registrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    {(isLoading || isLoadingContracts) && history.length === 0 ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay pagos registrados.
                        </div>
                    ) : (
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
                                        <TableCell>{format(new Date(payment.date), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{payment.concept}</TableCell>
                                        <TableCell>{payment.payment_method}</TableCell>
                                        <TableCell>{payment.reference_number || '-'}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(payment.amount, payment.currency)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={
                                                payment.status === 'paid' ? 'default' :
                                                    payment.status === 'pending' ? 'secondary' : 'destructive'
                                            } className={
                                                payment.status === 'paid' ? 'bg-green-500 hover:bg-green-600' :
                                                    payment.status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''
                                            }>
                                                {payment.status === 'paid' ? 'Aprobado' :
                                                    payment.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {payment.proof_url ? (
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                                    <a href={payment.proof_url} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
