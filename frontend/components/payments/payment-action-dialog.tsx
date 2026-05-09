import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useSystemConfig } from "@/hooks/use-system-config"
import { AlertCircle, Loader2 } from "lucide-react"

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
    concept?: string
    onConfirm: (id: string, action: 'approved' | 'rejected', notes: string, sendEmail: boolean) => Promise<void>
}

/**
 * Diálogo para aprobar o rechazar un pago.
 * Permite añadir notas y enviar confirmación por correo al inquilino.
 */
export function PaymentActionDialog({
    open, onOpenChange, action, paymentId, tenantEmail,
    amount, currency, paymentDate, exchangeRate, registrationDate, concept,
    onConfirm
}: PaymentActionDialogProps) {
    const [loading, setLoading] = useState(false)
    const [notes, setNotes] = useState("")
    const [sendEmail, setSendEmail] = useState(false)
    const { config } = useSystemConfig()

    const isEmailDisabled = config?.email_enabled === false
    const canSendEmail = !!tenantEmail && !isEmailDisabled

    const handleSubmit = async () => {
        if (!paymentId || !action) return

        try {
            setLoading(true)
            await onConfirm(paymentId, action === 'approve' ? 'approved' : 'rejected', notes || (action === 'approve' ? `Conciliado: ${concept || ''}` : ""), sendEmail && canSendEmail)
            onOpenChange(false)
            setNotes("") // Reset
            setSendEmail(false) // Reset
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
                            <span className="font-semibold">Email del inquilino:</span> {tenantEmail || <span className="text-red-500 italic">No registrado</span>}
                        </Label>
                    </div>
                    <div className={`flex items-center space-x-2 p-4 rounded-md border ${
                        !canSendEmail 
                            ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80" 
                            : "bg-yellow-50 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800"
                    }`}>
                        <Checkbox
                            id="sendEmail"
                            checked={sendEmail && canSendEmail}
                            onCheckedChange={(c) => setSendEmail(!!c)}
                            disabled={!canSendEmail}
                            className="h-5 w-5"
                        />
                        <div className="flex-1">
                            <Label htmlFor="sendEmail" className={`text-sm font-medium cursor-pointer ${!canSendEmail ? 'text-muted-foreground' : ''}`}>
                                Enviar correo al inquilino informando la {action === 'approve' ? 'Aprobación' : 'Notificación'} del pago
                            </Label>
                            {isEmailDisabled && (
                                <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> El envío de correos está desactivado en la configuración.
                                </p>
                            )}
                            {!tenantEmail && (
                                <p className="text-[10px] text-orange-500 font-semibold mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> El inquilino no tiene correo registrado.
                                </p>
                            )}
                        </div>
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
                            {concept && (
                                <div className="pt-2 mt-2 border-t border-muted">
                                    <div className="text-xs font-semibold text-muted-foreground">Concepto:</div>
                                    <div className="text-xs italic">"{concept}"</div>
                                </div>
                            )}
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
