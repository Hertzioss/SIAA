'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, Calendar as CalendarIcon, CloudUpload, Loader2 } from "lucide-react"
import { useTenantPayments, PaymentInsert } from "@/hooks/use-tenant-payments"
import { useContracts } from "@/hooks/use-contracts"
import { fetchBcvRate } from "@/services/exchange-rate"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PendingBalanceCard } from "@/components/payments/pending-balance-card"

/**
 * Formulario de registro de pagos para inquilinos.
 * Permite a los inquilinos registrar nuevos pagos, subir comprobantes,
 * y ver el estado de cuenta y montos pendientes.
 */
export default function PaymentForm() {
    const { registerPayment, isLoading: isSubmitting, getMonthlyBalance, getNextPaymentDate, getPaidMonths } = useTenantPayments()
    const { contracts, isLoading: isLoadingContracts } = useContracts()
    const [activeContract, setActiveContract] = useState<any>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [balanceData, setBalanceData] = useState<any>(null)
    const [nextPaymentDate, setNextPaymentDate] = useState<Date | null>(null)
    const [paidMonths, setPaidMonths] = useState<number>(0)

    // Form States
    const [exchangeRate, setExchangeRate] = useState<string>('')
    const [paymentParts, setPaymentParts] = useState<{ amount: string, currency: 'USD' | 'VES', reference: string }[]>([
        { amount: '', currency: 'USD', reference: '' }
    ])
    // const [amount, setAmount] = useState('') // Removed
    // const [currency, setCurrency] = useState<'USD' | 'VES'>('USD') // Removed
    // const [reference, setReference] = useState('') // Removed

    // Validation State
    const [isSubmitted, setIsSubmitted] = useState(false)

    const [notes, setNotes] = useState('')
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

    // Month/Year Selection
    const currentYear = new Date().getFullYear()
    const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString())
    const [year, setYear] = useState<string>(currentYear.toString())


    useEffect(() => {
        // Find the first active contract. 
        // In a real tenant app, we would filter by the logged-in user's tenant_id.
        // Here we just take the first 'active' one for demo purposes if no auth context.
        if (contracts.length > 0) {
            // Pick Active OR just the first one found (Expired) if no active one
            const active = contracts.find(c => c.status === 'active') || contracts[0]
            if (active) {
                setActiveContract(active)
                if (active.tenant_id) {
                    getNextPaymentDate(active.tenant_id).then(setNextPaymentDate)
                    getPaidMonths(active.tenant_id).then(setPaidMonths)
                }
            }
        }
    }, [contracts, getMonthlyBalance, getNextPaymentDate, getPaidMonths])

    useEffect(() => {
        const fetchBalance = async () => {
            if (activeContract) {
                const data = await getMonthlyBalance(activeContract.tenant_id, parseInt(month), parseInt(year))
                setBalanceData(data)
            }
        }
        fetchBalance()
    }, [activeContract, month, year, getMonthlyBalance])

    useEffect(() => {
        const getRate = async () => {
            const rate = await fetchBcvRate()
            if (rate) {
                setExchangeRate(rate.toString())
            }
        }
        getRate()
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setSelectedFile(file)
            toast.success("Archivo seleccionado: " + file.name)

            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file)
                setPreviewUrl(url)
            } else {
                setPreviewUrl(null)
            }
        }
    }

    const addPaymentPart = () => {
        setPaymentParts([...paymentParts, { amount: '', currency: 'USD', reference: '' }])
    }

    const removePaymentPart = (index: number) => {
        if (paymentParts.length > 1) {
            setPaymentParts(paymentParts.filter((_, i) => i !== index))
        }
    }

    const updatePaymentPart = (index: number, field: keyof typeof paymentParts[0], value: string) => {
        const newParts = [...paymentParts]
        newParts[index] = { ...newParts[index], [field]: value }
        setPaymentParts(newParts)
    }

    const handleSubmit = async () => {
        setIsSubmitted(true)

        if (!activeContract) {
            toast.error("No se encontró un contrato activo.")
            return
        }

        // Validate all parts
        const missingFields = []
        if (!date) missingFields.push("Fecha")

        let hasErrors = false
        paymentParts.forEach((part, idx) => {
            if (!part.amount) {
                missingFields.push(`Monto (Opción ${idx + 1})`)
                hasErrors = true
            }
            if (!part.reference) {
                missingFields.push(`Referencia (Opción ${idx + 1})`)
                hasErrors = true
            }
        })

        if (missingFields.length > 0) {
            toast.error(`Por favor complete los campos obligatorios marcados en rojo.`)
            return
        }

        // Validate Overpayment (Sum of parts)
        if (balanceData) {
            let totalUSD = 0
            paymentParts.forEach(part => {
                const amountNum = parseFloat(part.amount) || 0
                const partUSD = part.currency === 'VES' && exchangeRate ? amountNum / parseFloat(exchangeRate) : amountNum
                totalUSD += partUSD
            })

            // Allow a small epsilon for floating point comp
            if (totalUSD > (balanceData.remainingDebt + 0.01)) {
                toast.error(`El monto total excede la deuda restante ($${balanceData.remainingDebt.toFixed(2)})`)
                return
            }
        }

        let successCount = 0
        // Sequential submission
        for (const part of paymentParts) {
            const paymentData: PaymentInsert = {
                contract_id: activeContract.id,
                tenant_id: activeContract.tenant_id!,
                date: date,
                amount: parseFloat(part.amount),
                currency: part.currency,
                exchange_rate: part.currency === 'VES' ? parseFloat(exchangeRate) : undefined,
                concept: `Renta ${month} ${year}` + (paymentParts.length > 1 ? ` (Parte)` : ''),
                payment_method: 'Transferencia',
                reference_number: part.reference,
                notes: notes,
                proof_file: selectedFile || undefined // Attach proof to all? Or just first? Ideally backend handles duplicate file uploads optimization or we upload once. 
                // For MVP: Attach to all, backend uploads new file each time or we reuse URL if we refactor useTenantPayments. 
                // The hook uploads file inside registerPayment. It will produce duplicate files. 
                // Acceptable for now.
            }

            // For subsequent parts, maybe don't re-upload file if we could help it?
            // But hook logic is coupled.
            if (await registerPayment(paymentData)) {
                successCount++
            }
        }

        if (successCount === paymentParts.length) {
            toast.message("Todos los pagos registrados exitosamente", {
                description: "Una vez conciliado, le enviaremos el recibo. Revise SPAM si no lo ve en su bandeja de entrada."
            })
            // Reset form
            setPaymentParts([{ amount: '', currency: 'USD', reference: '' }])
            setNotes('')
            setSelectedFile(null)
            setIsSubmitted(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        } else {
            toast.error(`Se registraron ${successCount} de ${paymentParts.length} pagos. Verifique su historial.`)
        }
    }

    const propertyLabel = activeContract
        ? `${activeContract.units?.properties?.name || 'Propiedad'} - ${activeContract.units?.name || 'Unidad'}`
        : 'Cargando contrato...'

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Formulario de Pagos</h1>
                <p className="text-muted-foreground">Ingrese los detalles para registrar un nuevo pago de su arrendamiento.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles del Pago</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            <div className="space-y-2">
                                <Label>Propiedad / Unidad</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={propertyLabel}
                                        className="pl-9 bg-muted/50"
                                        readOnly />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Año del Pago</Label>
                                    <Select value={year} onValueChange={setYear}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione año" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 5 }, (_, i) => {
                                                const currentYear = new Date().getFullYear()
                                                const y = currentYear - 1 + i // Show last year to future
                                                return (
                                                    <SelectItem key={y} value={y.toString()}>
                                                        {y}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mes del Pago</Label>
                                    <Select value={month} onValueChange={setMonth}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione mes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(() => {
                                                const allMonths = [
                                                    { value: 'enero', label: 'Enero', index: 0 },
                                                    { value: 'febrero', label: 'Febrero', index: 1 },
                                                    { value: 'marzo', label: 'Marzo', index: 2 },
                                                    { value: 'abril', label: 'Abril', index: 3 },
                                                    { value: 'mayo', label: 'Mayo', index: 4 },
                                                    { value: 'junio', label: 'Junio', index: 5 },
                                                    { value: 'julio', label: 'Julio', index: 6 },
                                                    { value: 'agosto', label: 'Agosto', index: 7 },
                                                    { value: 'septiembre', label: 'Septiembre', index: 8 },
                                                    { value: 'octubre', label: 'Octubre', index: 9 },
                                                    { value: 'noviembre', label: 'Noviembre', index: 10 },
                                                    { value: 'diciembre', label: 'Diciembre', index: 11 },
                                                ]

                                                return allMonths.map((m) => (
                                                    <SelectItem key={m.value} value={m.value}>
                                                        {m.label}
                                                    </SelectItem>
                                                ))
                                            })()}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className={isSubmitted && !date ? "text-red-500" : ""}>Fecha del Pago *</Label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className={isSubmitted && !date ? "pl-9 border-red-500" : "pl-9"} />
                                    </div>
                                </div>

                                <Separator />

                                {paymentParts.map((part, index) => (
                                    <div key={index} className="space-y-4 p-4 border rounded-lg bg-muted/20 relative animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <Label className="text-sm font-semibold text-muted-foreground">Opción de Pago #{index + 1}</Label>
                                            {paymentParts.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removePaymentPart(index)}
                                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    ✕
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className={isSubmitted && !part.reference ? "text-red-500" : ""}>Número de Referencia *</Label>
                                                <Input
                                                    value={part.reference}
                                                    onChange={(e) => updatePaymentPart(index, 'reference', e.target.value)}
                                                    placeholder="Ej: 0123456789"
                                                    className={isSubmitted && !part.reference ? "border-red-500" : ""}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className={isSubmitted && !part.amount ? "text-red-500" : ""}>Monto y Moneda *</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        value={part.amount}
                                                        onChange={(e) => updatePaymentPart(index, 'amount', e.target.value)}
                                                        placeholder="0.00"
                                                        className={isSubmitted && !part.amount ? "w-[140px] border-red-500" : "w-[140px]"} />
                                                    <div className="flex rounded-md border bg-muted p-1 flex-1 justify-center">
                                                        <Button
                                                            variant={part.currency === 'USD' ? 'default' : 'ghost'}
                                                            size="sm"
                                                            onClick={() => updatePaymentPart(index, 'currency', 'USD')}
                                                            className="px-4 flex-1"
                                                        >
                                                            USD
                                                        </Button>
                                                        <Button
                                                            variant={part.currency === 'VES' ? 'default' : 'ghost'}
                                                            size="sm"
                                                            onClick={() => updatePaymentPart(index, 'currency', 'VES')}
                                                            className="px-4 flex-1"
                                                        >
                                                            BS
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addPaymentPart}
                                    className="w-full border-dashed"
                                >
                                    + Agregar otra forma de pago
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Comprobante de Pago (Opcional)</Label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <CloudUpload className="h-8 w-8 text-muted-foreground" />
                                        <p className="text-sm font-medium">
                                            {selectedFile ? selectedFile.name : (
                                                <>Haga clic para cargar <span className="text-muted-foreground font-normal">o arrastre y suelte</span></>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG o PDF (MAX. 5MB)</p>
                                    </div>

                                    {previewUrl && (
                                        <div className="mt-4 relative w-full h-48 bg-muted rounded-lg overflow-hidden border flex items-center justify-center pointer-events-none">
                                            <img
                                                src={previewUrl}
                                                alt="Vista previa del comprobante"
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </div>
                                    )}

                                    {selectedFile && !previewUrl && (
                                        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-200">
                                            Archivo listo para subir
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, application/pdf"
                                        onChange={handleFileChange} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notas / Comentarios</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Abono parcial correspondiente a julio."
                                    className="resize-none"
                                    rows={4} />
                            </div>

                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Summary */}
                <div className="space-y-6">
                    {/* Pending Balance Card (Always show for selected month) */}
                    {balanceData && (
                        <PendingBalanceCard data={balanceData} />
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Mi Estado de Cuenta</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Estado Actual:</span>
                                {/* This should be dynamic based on tenant status */}
                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100/80">
                                    {activeContract ? 'Activo' : 'Sin Contrato'}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Canon de Arrendamiento:</span>
                                <span className="font-bold">$ {activeContract?.rent_amount || '0.00'}</span>
                            </div>

                            {/* Next Payment Date Info */}
                            {nextPaymentDate && (
                                <>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Próximo Pago:</span>
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold text-sm">
                                                {format(nextPaymentDate, "d 'de' MMMM", { locale: es })}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Cálculo Contable</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Tasa BCV del Día:</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{exchangeRate} VES</span>
                                    {/* Mock edit for now */}
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                                        const newRate = prompt('Ingrese nueva tasa:', exchangeRate)
                                        if (newRate) setExchangeRate(newRate)
                                    }}>
                                        ✎
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg flex justify-between items-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Total equivalente (VES):</span>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        {(() => {
                                            const totalVES = paymentParts.reduce((acc, part) => {
                                                const amount = parseFloat(part.amount || '0')
                                                const rate = parseFloat(exchangeRate || '0')
                                                if (part.currency === 'USD') {
                                                    return acc + (amount * rate)
                                                } else {
                                                    return acc + amount
                                                }
                                            }, 0)
                                            return totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })
                                        })()}
                                    </div>
                                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">VES</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div><div className="flex justify-end gap-4 mt-8">
                <Button variant="secondary" size="lg" onClick={() => window.history.back()}>Cancelar</Button>
                <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !activeContract}
                >
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : 'Registrar Pago'}
                </Button>
            </div>
        </div >
    )
}