import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useSystemConfig } from "@/hooks/use-system-config"
import { cn, formatCurrency, formatCurrencyLabel, formatDateString } from "@/lib/utils"
import { AlertCircle, Check, ExternalLink, FileText, Loader2, X } from "lucide-react"

interface PaymentMetadata {
    original_total_amount?: number
    original_currency?: string
    split_total_parts?: number
    split_index?: number
}

interface PaymentActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    action: 'approve' | 'reject' | null
    paymentId: string | null
    tenantName?: string
    tenantEmail?: string
    amount?: number
    currency?: string
    paymentDate?: string
    exchangeRate?: number
    registrationDate?: string
    reference?: string
    proofUrl?: string
    concept?: string
    metadata?: PaymentMetadata
    onConfirm: (id: string, action: 'approved' | 'rejected', notes: string, sendEmail: boolean) => Promise<void>
}

/**
 * Diálogo de verificación para aprobar o rechazar un pago.
 * Cuando existe comprobante adjunto, muestra una vista lado a lado (comprobante + datos)
 * para conciliar sin salir de la pantalla.
 */
export function PaymentActionDialog({
    open,
    onOpenChange,
    action,
    paymentId,
    tenantName,
    tenantEmail,
    amount,
    currency,
    paymentDate,
    exchangeRate,
    registrationDate,
    reference,
    proofUrl,
    concept,
    metadata,
    onConfirm
}: PaymentActionDialogProps) {
    const [loading, setLoading] = useState(false)
    const [notes, setNotes] = useState("")
    const [sendEmail, setSendEmail] = useState(false)
    const { config } = useSystemConfig()

    const isEmailDisabled = config?.email_enabled === false
    const canSendEmail = Boolean(tenantEmail) && !isEmailDisabled
    const hasProof = Boolean(proofUrl)
    const isPdf = Boolean(proofUrl && /\.pdf(\?|$)/i.test(proofUrl))

    const handleSubmit = async () => {
        if (!paymentId || !action) return

        try {
            setLoading(true)
            await onConfirm(
                paymentId,
                action === 'approve' ? 'approved' : 'rejected',
                notes || (action === 'approve' ? `Conciliado: ${concept || ''}` : ""),
                sendEmail && canSendEmail
            )
            onOpenChange(false)
            setNotes("")
            setSendEmail(false)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const isApprove = action === 'approve'
    const title = isApprove
        ? `Aprobar pago${tenantName ? ` — ${tenantName}` : ''}`
        : `Rechazar pago${tenantName ? ` — ${tenantName}` : ''}`
    const desc = isApprove
        ? 'Verifique el monto, la referencia y el comprobante antes de conciliar.'
        : 'Indique el motivo del rechazo para dejar registro y notificar al inquilino.'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("p-5 gap-4", hasProof ? "sm:max-w-3xl w-[95vw]" : "sm:max-w-md")}>
                <DialogHeader className="pb-2 border-b space-y-0.5">
                    <DialogTitle className="text-lg">{title}</DialogTitle>
                    <DialogDescription className="text-xs">{desc}</DialogDescription>
                </DialogHeader>

                <div className={cn("grid gap-4", hasProof && "md:grid-cols-12 items-start")}>
                    {/* Left: Proof Preview (only when proof exists) */}
                    {hasProof && proofUrl && (
                        <div className="md:col-span-6 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Comprobante adjunto</span>
                                <a
                                    href={proofUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                    Abrir en pestaña
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            <div className="relative rounded-lg border bg-muted/40 overflow-hidden h-[300px] md:h-[340px] flex items-center justify-center">
                                {isPdf ? (
                                    <iframe
                                        src={proofUrl}
                                        title="Comprobante de pago PDF"
                                        className="w-full h-full border-0"
                                    />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={proofUrl}
                                        alt="Comprobante de pago"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Right: Payment Verification Details & Actions */}
                    <div className={cn("space-y-3", hasProof && "md:col-span-6")}>
                        {/* Details Box */}
                        <div className="rounded-lg border bg-muted/35 p-3 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Monto</span>
                                <span className="text-sm font-bold tabular-nums">
                                    {amount != null ? formatCurrency(Number(amount), currency || 'USD') : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Referencia</span>
                                <span className="font-mono font-medium">{reference || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Fecha de pago</span>
                                <span className="tabular-nums">
                                    {paymentDate ? formatDateString(paymentDate.split('T')[0]) : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Tasa aplicada</span>
                                <span className="tabular-nums">
                                    {exchangeRate ? `${Number(exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/USD` : '—'}
                                </span>
                            </div>
                            {registrationDate && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Registrado</span>
                                    <span className="tabular-nums">{formatDateString(registrationDate.split('T')[0])}</span>
                                </div>
                            )}

                            {metadata?.original_total_amount && Number(metadata.split_total_parts) > 1 && (
                                <div className="pt-2 mt-1 border-t border-border/60 text-amber-700 dark:text-amber-400 font-medium">
                                    Parte {metadata.split_index} de {metadata.split_total_parts} de un pago original por{' '}
                                    {metadata.original_total_amount.toLocaleString(
                                        metadata.original_currency === 'USD' ? 'en-US' : 'es-VE',
                                        { minimumFractionDigits: 2 }
                                    )}{' '}
                                    {formatCurrencyLabel(metadata.original_currency)}
                                </div>
                            )}

                            {concept && (
                                <div className="pt-2 mt-1 border-t border-border/60 flex items-start gap-1.5 text-muted-foreground">
                                    <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <span className="italic">{concept}</span>
                                </div>
                            )}
                        </div>

                        {/* Email Notification Toggle */}
                        <div
                            className={cn(
                                "rounded-lg border p-3 space-y-1.5",
                                !canSendEmail
                                    ? "bg-muted/30 border-border opacity-80"
                                    : "bg-amber-50/60 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
                            )}
                        >
                            <label
                                htmlFor="sendEmail"
                                className={cn("flex items-start gap-2.5 text-xs", canSendEmail ? "cursor-pointer" : "cursor-not-allowed")}
                            >
                                <Checkbox
                                    id="sendEmail"
                                    checked={sendEmail && canSendEmail}
                                    onCheckedChange={(c) => setSendEmail(Boolean(c))}
                                    disabled={!canSendEmail}
                                    className="mt-0.5 h-4 w-4"
                                />
                                <div className="space-y-0.5">
                                    <span className="font-medium block">
                                        Enviar correo al inquilino ({isApprove ? 'aprobación' : 'rechazo'})
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block">
                                        {tenantEmail || 'Sin correo registrado'}
                                    </span>
                                </div>
                            </label>
                            {isEmailDisabled && (
                                <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 pl-6">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    El envío de correos está desactivado en configuración.
                                </p>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <Label htmlFor="notes" className="text-xs text-muted-foreground">
                                Notas / motivo {!isApprove && <span className="text-destructive">*</span>}
                            </Label>
                            <Textarea
                                id="notes"
                                rows={2}
                                className="resize-none text-sm min-h-[64px]"
                                placeholder={
                                    isApprove
                                        ? "Ej. Conciliado en Banesco..."
                                        : "Ej. Referencia no encontrada, monto incompleto..."
                                }
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t gap-2">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        size="sm"
                        variant={isApprove ? 'default' : 'destructive'}
                        className={cn(isApprove && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                        onClick={handleSubmit}
                        disabled={loading || (!isApprove && !notes.trim())}
                    >
                        {loading ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : isApprove ? (
                            <Check className="mr-1.5 h-4 w-4" />
                        ) : (
                            <X className="mr-1.5 h-4 w-4" />
                        )}
                        {isApprove ? 'Confirmar aprobación' : 'Confirmar rechazo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
