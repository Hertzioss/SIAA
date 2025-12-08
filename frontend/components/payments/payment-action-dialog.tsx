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
    onConfirm: (id: string, action: 'approved' | 'rejected', notes: string, sendEmail: boolean) => Promise<void>
}

export function PaymentActionDialog({ open, onOpenChange, action, paymentId, onConfirm }: PaymentActionDialogProps) {
    const [loading, setLoading] = useState(false)
    const [notes, setNotes] = useState("")
    const [sendEmail, setSendEmail] = useState(true)

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
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="sendEmail"
                            checked={sendEmail}
                            onCheckedChange={(c) => setSendEmail(!!c)}
                        />
                        <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                            Enviar correo al inquilino informando el cambio
                        </Label>
                    </div>

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
            </DialogContent>
        </Dialog>
    )
}
