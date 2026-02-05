import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

interface PaymentActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    action: 'approve' | 'reject' | null
    paymentId: string | null
    tenantEmail?: string
    // Details for verification
    amount?: number
    currency?: string
    paymentDate?: string
    exchangeRate?: number
    registrationDate?: string
    onConfirm: (id: string, action: 'approved' | 'rejected', notes: string, sendEmail: boolean) => Promise<void>
}

/**
 * Diálogo para aprobar o rechazar un pago.
 * Permite añadir notas y enviar confirmación por correo al inquilino.
 */
export function PaymentActionDialog({
    open, onOpenChange, action, paymentId, tenantEmail,
    amount, currency, paymentDate, exchangeRate, registrationDate,
    onConfirm
}: PaymentActionDialogProps) {
    const [loading, setLoading] = useState(false)
    const [notes, setNotes] = useState("")
    const [sendEmail, setSendEmail] = useState(false)

    const handleSubmit = async () => {
        if (!paymentId || !action) return

        try {
            setLoading(true)
            await onConfirm(paymentId, action === 'approve' ? 'approved' : 'rejected', notes, sendEmail)
            onOpenChange(false)
            setNotes("") // Reset
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const title = action === 'approve' ? 'Aprobar Pago' : 'Rechazar Pago'
    const desc = action === 'approve'
        ? 'Desea conciliar este pago? Verifique que el monto ha ingresado a la cuenta.'
        : 'Confirme el motivo del rechazo del pago.'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{desc}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div>
                        <Label htmlFor="tenantEmail" className="text-sm font-normal cursor-pointer">
                            <span className="font-semibold">Email del inquilino:</span> {tenantEmail}
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                        <Checkbox
                            id="sendEmail"
                            checked={sendEmail}
                            onCheckedChange={(c) => setSendEmail(!!c)}
                            className="h-5 w-5"
                        />
                        <Label htmlFor="sendEmail" className="text-sm font-medium cursor-pointer flex-1">
                            Enviar correo al inquilino informando la Aprobación del pago
                        </Label>
                    </div>

                    {/* Payment Details for Verification */}
                    {action === 'approve' && (
                        <div className="text-sm bg-muted/50 p-3 rounded-md space-y-1">
                            <div className="font-semibold text-muted-foreground mb-2">Detalles del Pago</div>
                            <div className="flex justify-between">
                                <span>Fecha Pago:</span>
                                <span>{paymentDate ? paymentDate.split('T')[0] : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Fecha Registro:</span>
                                <span>{registrationDate ? registrationDate.split('T')[0] : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Monto:</span>
                                <span className="font-medium">{amount?.toLocaleString('en-US')} {currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tasa:</span>
                                <span>{exchangeRate || '-'}</span>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notas / Motivo {action === 'reject' && '*'}</Label>
                        <Textarea
                            id="notes"
                            placeholder={action === 'approve' ? "Ej. Conciliado con banco..." : "Ej. Referencia incorrecta, monto incompleto..."}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant={action === 'approve' ? 'default' : 'destructive'}
                        onClick={handleSubmit}
                        disabled={loading || (action === 'reject' && !notes.trim())} // Require notes for rejection
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {action === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
                    </Button>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    )
}
