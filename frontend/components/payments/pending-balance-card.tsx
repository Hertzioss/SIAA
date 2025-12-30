import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface PendingBalanceCardProps {
    data: {
        rentAmount: number
        paidAmount: number
        pendingAmount?: number // From old interface
        pendingPayments?: number // New hook return
        remainingDebt?: number // New hook return
        totalCovered?: number // New hook return
        isPartial: boolean
    }
}

/**
 * Tarjeta informativa que muestra el estado de pago del mes actual.
 * Indica el canon total, lo abonado y lo pendiente, con indicador visual de completado.
 */
export function PendingBalanceCard({ data }: PendingBalanceCardProps) {
    // Normalize pending amount
    // Hook returns pendingPayments, interface might have old pendingAmount or new pendingPayments
    const pendingVal = data.pendingPayments ?? data.pendingAmount ?? 0
    const remainingVal = data.remainingDebt ?? 0

    // We want to show the remaining debt if it exists and is greater than pending?
    // Or do we always show "Pendiente" as remaining debt?
    // The previous logic seemed to prefer pendingAmount if partial?
    // Actually, "Pendiente" usually means "Remaining to pay".
    // If pending is just "payments in review", that's different.
    // The card seems to want to show how much IS LEFT to pay.
    const displayPending = remainingVal

    // If fully paid, maybe show success?
    const isFullyPaid = remainingVal <= 0.01

    const progress = Math.min((data.paidAmount / data.rentAmount) * 100, 100)

    return (
        <Card className={`border-${isFullyPaid ? 'green' : 'orange'}-200 bg-${isFullyPaid ? 'green' : 'orange'}-50/50`}>
            <CardHeader className="pb-2">
                <CardTitle className={`text-lg font-medium flex items-center gap-2 text-${isFullyPaid ? 'green' : 'orange'}-800`}>
                    {isFullyPaid ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {isFullyPaid ? "Mes Completado" : "Estado del Mes"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progreso del pago:</span>
                        <span className={`font-medium text-${isFullyPaid ? 'green' : 'orange'}-700`}>{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className={`h-2 bg-${isFullyPaid ? 'green' : 'orange'}-200`} indicatorClassName={`bg-${isFullyPaid ? 'green' : 'orange'}-500`} />

                    <div className={`grid grid-cols-3 gap-4 border-t border-${isFullyPaid ? 'green' : 'orange'}-200 pt-4 mt-4`}>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Canon Total</p>
                            <p className="font-bold text-lg text-slate-700">
                                ${data.rentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Abonado</p>
                            <p className="font-bold text-lg text-green-600">
                                ${data.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase">Pendiente</p>
                            <p className="font-bold text-lg text-red-600">
                                ${displayPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
