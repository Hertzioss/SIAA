"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { Payment } from "@/hooks/use-payments"
import { toast } from "sonner"

interface PaymentEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    payment: Payment | null
    onSave: (id: string, updates: Partial<Payment>) => Promise<void>
}

export function PaymentEditDialog({ open, onOpenChange, payment, onSave }: PaymentEditDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        amount: "",
        currency: "USD",
        date: "",
        reference: "",
        method: "transfer",
        exchange_rate: "",
        notes: ""
    })

    useEffect(() => {
        if (payment) {
            setFormData({
                amount: payment.amount?.toString() || "",
                currency: payment.currency || "USD",
                date: payment.date ? payment.date.split('T')[0] : "",
                reference: payment.reference || payment.reference_number || "",
                method: payment.payment_method || payment.method || "transfer", // Normalize method
                exchange_rate: payment.exchange_rate?.toString() || "",
                notes: payment.notes || ""
            })
        }
    }, [payment])

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!payment) return

        if (!formData.amount || !formData.date) {
            toast.error("Por favor complete los campos obligatorios (Monto, Fecha)")
            return
        }

        try {
            setIsLoading(true)
            
            // Prepare updates object - only include changed or valid fields
            const updates: any = {
                amount: parseFloat(formData.amount),
                date: formData.date,
                currency: formData.currency,
                reference_number: formData.reference, // Map to DB column
                payment_method: formData.method, // Map to DB column
                notes: formData.notes
            }

            if (formData.currency === 'VES' && formData.exchange_rate) {
                updates.exchange_rate = parseFloat(formData.exchange_rate)
            } else if (formData.currency === 'USD' && formData.exchange_rate) {
                 // Allow saving exchange rate for USD payments too (historical reporting)
                 updates.exchange_rate = parseFloat(formData.exchange_rate)
            }

            await onSave(payment.id, updates)
            onOpenChange(false)
        } catch (error) {
            console.error(error)
             // Toast handled by parent usually, but good to have here too just in case
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Pago</DialogTitle>
                    <DialogDescription>
                        Modifique los detalles del pago. Los cambios se reflejarán inmediatamente en la conciliación.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Fecha del Pago *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleChange("date", e.target.value)}
                                required
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="method">Método</Label>
                             <Select 
                                value={formData.method} 
                                onValueChange={(val) => handleChange("method", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transfer">Transferencia</SelectItem>
                                    <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                                    <SelectItem value="zelle">Zelle</SelectItem>
                                    <SelectItem value="cash">Efectivo</SelectItem>
                                    <SelectItem value="deposit">Depósito</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                            <Label htmlFor="amount">Monto *</Label>
                            <div className="flex gap-2">
                                 <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => handleChange("amount", e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="currency">Moneda</Label>
                              <Select 
                                value={formData.currency} 
                                onValueChange={(val) => handleChange("currency", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="USD / VES" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="VES">Bolívares (Bs)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>


                    <div className="space-y-2">
                        <Label htmlFor="rate">Tasa de Cambio {formData.currency === 'USD' ? '(Referencia Bs)' : '(Bs/USD)'}</Label>
                        <div className="flex gap-2">
                            <Input
                                id="rate"
                                type="number"
                                step="0.0001"
                                value={formData.exchange_rate}
                                onChange={(e) => handleChange("exchange_rate", e.target.value)}
                                placeholder="Ej. 36.50"
                            />
                            {/* Calculator Helper */}
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    // Simple prompt or toggle calculator logic
                                    // For simplicity, let's toggle a small popover or just use a prompt
                                    const amount = parseFloat(formData.amount)
                                    if (!amount) {
                                        toast.error("Ingrese primero el monto del pago")
                                        return
                                    }
                                    
                                    const refAmountStr = prompt(formData.currency === 'VES' 
                                        ? "Ingrese el monto equivalente en Dólares ($):" 
                                        : "Ingrese el monto equivalente en Bolívares (Bs):"
                                    )
                                    
                                    if (refAmountStr) {
                                        const refAmount = parseFloat(refAmountStr)
                                        if (refAmount && refAmount > 0) {
                                            let calculatedRate = 0
                                            if (formData.currency === 'VES') {
                                                // Tasa = VES / USD_Ref
                                                calculatedRate = amount / refAmount
                                            } else {
                                                // Tasa = BS_Ref / USD
                                                calculatedRate = refAmount / amount
                                            }
                                            handleChange("exchange_rate", calculatedRate.toFixed(4))
                                            toast.success(`Tasa calculada: ${calculatedRate.toFixed(4)}`)
                                        }
                                    }
                                }}
                                title="Calcular Tasa basada en monto referencial"
                            >
                                <span className="text-lg">🧮</span>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reference">Referencia / Comprobante</Label>
                        <Input
                            id="reference"
                            value={formData.reference}
                            onChange={(e) => handleChange("reference", e.target.value)}
                            placeholder="Número de referencia bancaria"
                        />
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="notes">Notas Internas</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            placeholder="Observaciones sobre el pago..."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
