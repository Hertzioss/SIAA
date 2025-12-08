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

export default function PaymentForm() {
    const { registerPayment, isLoading: isSubmitting } = useTenantPayments()
    const { contracts, isLoading: isLoadingContracts } = useContracts()
    const [activeContract, setActiveContract] = useState<any>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form State
    const [month, setMonth] = useState('julio')
    const [year, setYear] = useState('2024')
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [reference, setReference] = useState('')
    const [amount, setAmount] = useState('')
    const [currency, setCurrency] = useState<'USD' | 'VES'>('USD')
    const [exchangeRate, setExchangeRate] = useState('36.45') // Mock default or fetch
    const [notes, setNotes] = useState('')

    useEffect(() => {
        // Find the first active contract. 
        // In a real tenant app, we would filter by the logged-in user's tenant_id.
        // Here we just take the first 'active' one for demo purposes if no auth context.
        if (contracts.length > 0) {
            const active = contracts.find(c => c.status === 'active')
            if (active) {
                setActiveContract(active)
            }
        }
    }, [contracts])

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
            setSelectedFile(e.target.files[0])
            toast.success("Archivo seleccionado: " + e.target.files[0].name)
        }
    }

    const handleSubmit = async () => {
        if (!activeContract) {
            toast.error("No se encontró un contrato activo.")
            return
        }

        if (!amount || !reference || !date) {
            toast.error("Por favor complete los campos obligatorios.")
            return
        }

        const paymentData: PaymentInsert = {
            contract_id: activeContract.id,
            tenant_id: activeContract.tenant_id!,
            date: date,
            amount: parseFloat(amount),
            currency: currency,
            exchange_rate: currency === 'VES' ? parseFloat(exchangeRate) : undefined,
            concept: `Renta ${month} ${year}`, // Simple auto-generated concept
            payment_method: 'Transferencia', // Should be a select? defaults for now
            reference_number: reference,
            notes: notes,
            proof_file: selectedFile || undefined
        }

        const success = await registerPayment(paymentData)
        if (success) {
            // Reset form
            setReference('')
            setAmount('')
            setNotes('')
            setSelectedFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
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
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mes del Pago</Label>
                                    <Select value={month} onValueChange={setMonth}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione mes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="julio">Julio</SelectItem>
                                            <SelectItem value="agosto">Agosto</SelectItem>
                                            <SelectItem value="septiembre">Septiembre</SelectItem>
                                            <SelectItem value="octubre">Octubre</SelectItem>
                                            <SelectItem value="noviembre">Noviembre</SelectItem>
                                            <SelectItem value="diciembre">Diciembre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Año del Pago</Label>
                                    <Select value={year} onValueChange={setYear}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione año" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2024">2024</SelectItem>
                                            <SelectItem value="2025">2025</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fecha del Pago</Label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Número de Referencia</Label>
                                    <Input
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="Ej: 0123456789"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Monto y Moneda</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="flex-1"
                                    />
                                    <div className="flex rounded-md border bg-muted p-1">
                                        <Button
                                            variant={currency === 'USD' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setCurrency('USD')}
                                            className="h-7 px-3"
                                        >
                                            USD
                                        </Button>
                                        <Button
                                            variant={currency === 'VES' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setCurrency('VES')}
                                            className="h-7 px-3"
                                        >
                                            VES
                                        </Button>
                                    </div>
                                </div>
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
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, application/pdf"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notas / Comentarios</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Abono parcial correspondiente a julio."
                                    className="resize-none"
                                    rows={4}
                                />
                            </div>

                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Summary */}
                <div className="space-y-6">
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
                                        {(parseFloat(amount || '0') * parseFloat(exchangeRate)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">VES</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
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
        </div>
    )
}