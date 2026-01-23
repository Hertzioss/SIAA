"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CloudUpload, Loader2, DollarSign, Search, User, Check, Building2, Calendar as CalendarIcon } from "lucide-react"
import { useTenantPayments, PaymentInsert } from "@/hooks/use-tenant-payments"
import { useTenants } from "@/hooks/use-tenants"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useContracts } from "@/hooks/use-contracts"
import { fetchBcvRate } from "@/services/exchange-rate"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tenant } from "@/types/tenant"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PaymentFormProps {
    defaultTenant?: Tenant
    onSuccess?: () => void
    onCancel?: () => void
    className?: string
}

export function PaymentForm({ defaultTenant, onSuccess, onCancel, className }: PaymentFormProps) {
    const { tenants } = useTenants() // Fetch all tenants for search
    const { registerPayment, isLoading: isSubmitting } = useTenantPayments()
    const { contracts, isLoading: isLoadingContracts } = useContracts()

    // Internal state for selected tenant (either prop or search)
    const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>(defaultTenant)
    const [searchOpen, setSearchOpen] = useState(false)

    const [activeContract, setActiveContract] = useState<any>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Confirmation Dialog State
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)

    // Form State
    const [month, setMonth] = useState('enero')
    const [year, setYear] = useState('2023')
    const [date, setDate] = useState('')

    // Initialize date on client side to avoid hydration mismatch and use local time
    useEffect(() => {
        setDate(format(new Date(), 'yyyy-MM-dd'))
    }, [])

    // Split Payment State
    const [paymentParts, setPaymentParts] = useState<{ amount: string, currency: 'USD' | 'VES', reference: string, accountId: string }[]>([
        { amount: '', currency: 'USD', reference: '', accountId: 'na' }
    ])
    const [errors, setErrors] = useState<Record<string, boolean>>({})

    const [exchangeRate, setExchangeRate] = useState('0.00')
    const [notes, setNotes] = useState('')
    const [targetAccounts, setTargetAccounts] = useState<any[]>([])

    // Update internal tenant when prop changes
    useEffect(() => {
        if (defaultTenant) {
            setSelectedTenant(defaultTenant)
        }
    }, [defaultTenant])

    // Find active or latest contract for the selected tenant
    useEffect(() => {
        if (selectedTenant && contracts.length > 0) {
            // Priority: Active -> Expired -> Any
            const candidate = contracts.find(c => c.tenant_id === selectedTenant.id && c.status === 'active') ||
                contracts.find(c => c.tenant_id === selectedTenant.id)

            setActiveContract(candidate || null)
        } else {
            setActiveContract(null)
        }
    }, [selectedTenant, contracts])

    // Fetch Owner Accounts based on Active Contract
    useEffect(() => {
        const fetchAccounts = async () => {
            if (!activeContract?.units?.properties?.id) return

            setTargetAccounts([])
            try {
                // 1. Get Property ID
                const propertyId = activeContract.units.properties.id

                // 2. Get Owners of this Property
                const { data: ownersData, error: ownersError } = await supabase
                    .from('property_owners')
                    .select('owner_id')
                    .eq('property_id', propertyId)

                if (ownersError) throw ownersError
                const ownerIds = ownersData.map(o => o.owner_id)

                if (ownerIds.length > 0) {
                    // 3. Get Bank Accounts of these Owners
                    const { data: accountsData, error: accountsError } = await supabase
                        .from('owner_bank_accounts')
                        .select('id, bank_name, account_number, currency, account_type, owners(name)')
                        .in('owner_id', ownerIds)

                    if (accountsError) throw accountsError
                    setTargetAccounts(accountsData || [])
                }
            } catch (err) {
                console.error("Error fetching accounts:", err)
            }
        }

        fetchAccounts()
    }, [activeContract])

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

    const addPaymentPart = () => {
        setPaymentParts([...paymentParts, { amount: '', currency: 'USD', reference: '', accountId: 'na' }])
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

        // Clear error for this field if it exists
        if (errors[`${field}-${index}`]) {
            const newErrors = { ...errors }
            delete newErrors[`${field}-${index}`]
            setErrors(newErrors)
        }
    }

    const validateForm = () => {
        if (!activeContract) {
            toast.error("Este inquilino no tiene ningún contrato registrado (Activo o Vencido).")
            return false
        }

        const newErrors: Record<string, boolean> = {}
        let hasErrors = false

        if (!date) {
            toast.error("La fecha es requerida")
            return false
        }

        paymentParts.forEach((part, idx) => {
            if (!part.amount) {
                newErrors[`amount-${idx}`] = true
                hasErrors = true
            }
            // Reference is mandatory only for VES
            if (part.currency === 'VES' && !part.reference) {
                newErrors[`reference-${idx}`] = true
                hasErrors = true
            }
        })

        setErrors(newErrors)

        if (hasErrors) {
            toast.error("Por favor complete los campos requeridos marcados en rojo.")
            return false
        }

        return true
    }

    const handlePreSubmit = () => {
        if (validateForm()) {
            setIsConfirmationOpen(true)
        }
    }

    const handleConfirmPayment = async () => {
        if (!activeContract) return

        let successCount = 0
        for (const part of paymentParts) {
            const paymentData: PaymentInsert = {
                contract_id: activeContract.id,
                tenant_id: selectedTenant!.id,
                date: date,
                amount: parseFloat(part.amount),
                currency: part.currency,
                exchange_rate: parseFloat(exchangeRate),
                concept: `Canon ${month} ${year}` + (paymentParts.length > 1 ? ` (Parte)` : ''),
                payment_method: 'Transferencia',
                reference_number: part.reference,
                notes: notes,
                proof_file: selectedFile || undefined,
                owner_bank_account_id: part.accountId !== 'na' ? part.accountId : undefined
            }

            if (await registerPayment(paymentData)) {
                successCount++
            }
        }

        setIsConfirmationOpen(false)

        if (successCount === paymentParts.length) {
            if (onSuccess) onSuccess()
        } else {
            toast.error(`Hubo problemas registrando algunos pagos (${successCount}/${paymentParts.length})`)
        }
    }

    const propertyLabel = activeContract
        ? `${activeContract.units?.properties?.name || 'Propiedad'} - ${activeContract.units?.name || 'Unidad'}`
        : 'Sin contrato activo'

    return (
        <div className={cn("grid gap-6 py-4", className)}>
            {/* Tenant Selection if not provided via props */}
            {!defaultTenant && (
                <div className="space-y-2">
                    <Label>Buscar Inquilino</Label>
                    <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={searchOpen}
                                className="w-full justify-between"
                            >
                                {selectedTenant ? selectedTenant.name : "Seleccionar inquilino..."}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar por nombre o cédula..." />
                                <CommandList>
                                    <CommandEmpty>No se encontraron inquilinos.</CommandEmpty>
                                    <CommandGroup>
                                        {tenants.map((t) => (
                                            <CommandItem
                                                key={t.id}
                                                value={t.name}
                                                onSelect={() => {
                                                    setSelectedTenant(t)
                                                    setSearchOpen(false)
                                                }}
                                            >
                                                <User className="mr-2 h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span>{t.name}</span>
                                                    <span className="text-xs text-muted-foreground">{t.doc_id}</span>
                                                </div>
                                                <Check
                                                    className={cn(
                                                        "ml-auto h-4 w-4",
                                                        selectedTenant?.id === t.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            )}
            {selectedTenant && activeContract === null && !isLoadingContracts && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    <strong>Atención:</strong> Este inquilino no tiene un contrato activo registrado. No se puede procesar el pago.
                </div>
            )}

            {/* Contract Info */}
            <div className="p-4 rounded-lg border bg-muted/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Inmueble Asociado</span>
                    <div className="flex items-center gap-2 font-medium">
                        <Building2 className="h-4 w-4" />
                        {isLoadingContracts ? "Cargando contratos..." : propertyLabel}
                    </div>
                </div>
                <div className="space-y-1 text-right">
                    <span className="text-sm font-medium text-muted-foreground">Canon</span>
                    <div className="font-bold">
                        $ {activeContract?.rent_amount || '0.00'}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Mes del Pago</Label>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione mes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="enero">Enero</SelectItem>
                            <SelectItem value="febrero">Febrero</SelectItem>
                            <SelectItem value="marzo">Marzo</SelectItem>
                            <SelectItem value="abril">Abril</SelectItem>
                            <SelectItem value="mayo">Mayo</SelectItem>
                            <SelectItem value="junio">Junio</SelectItem>
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
                    <Input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="2025"
                        min="2000"
                        max="2100"
                    />
                </div>
            </div>

            <div className="space-y-4">
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
                <div className="space-y-4">
                    {paymentParts.map((part, index) => (
                        <div key={index} className="space-y-4 p-4 border rounded-lg bg-muted/20 relative">
                            <div className="flex justify-between items-center mb-1">
                                <Label className="text-sm font-semibold text-muted-foreground">Pago #{index + 1}</Label>
                                {paymentParts.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePaymentPart(index)}
                                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                    >
                                        ✕
                                    </Button>
                                )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Número de Referencia {part.currency === 'VES' && <span className="text-destructive">*</span>}</Label>
                                    <Input
                                        value={part.reference}
                                        onChange={(e) => updatePaymentPart(index, 'reference', e.target.value)}
                                        placeholder={part.currency === 'VES' ? "Requerido para Bs" : "Opcional para USD"}
                                        className={errors[`reference-${index}`] ? "border-destructive ring-destructive" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Monto y Moneda <span className="text-destructive">*</span></Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={part.amount}
                                            onChange={(e) => updatePaymentPart(index, 'amount', e.target.value)}
                                            placeholder="0.00"
                                            className={`w-[120px] ${errors[`amount-${index}`] ? "border-destructive ring-destructive" : ""}`}
                                        />
                                        <div className="flex rounded-md border bg-muted p-1 flex-1 justify-center">
                                            <Button
                                                variant={part.currency === 'USD' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => updatePaymentPart(index, 'currency', 'USD')}
                                                className="flex-1 text-xs px-2"
                                            >
                                                USD
                                            </Button>
                                            <Button
                                                variant={part.currency === 'VES' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => updatePaymentPart(index, 'currency', 'VES')}
                                                className="flex-1 text-xs px-2"
                                            >
                                                BS
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Owner Bank Account Selection per Part */}
                            <div className="space-y-2">
                                <Label>Cuenta Destino (Propietario)</Label>
                                <Select
                                    value={part.accountId}
                                    onValueChange={(val) => updatePaymentPart(index, 'accountId', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione cuenta destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="na">No Especificada / Efectivo</SelectItem>
                                        {targetAccounts
                                            .filter(acc => acc.currency === part.currency)
                                            .map((acc, idx) => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.bank_name} - {acc.currency} ({acc.owners?.name})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {part.accountId !== 'na' && (
                                    <div className="text-xs text-muted-foreground p-2 border rounded bg-muted/50">
                                        {(() => {
                                            const acc = targetAccounts.find(a => a.id === part.accountId)
                                            if (!acc) return null
                                            return (
                                                <>
                                                    <span className="font-semibold">{acc.bank_name}</span> - {acc.account_number} ({acc.account_type})
                                                </>
                                            )
                                        })()}
                                    </div>
                                )}
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

                {/* VES Calculation Preview Total */}
                <div className="text-xs text-muted-foreground text-right mt-1">
                    Tasa: {exchangeRate} VES/USD | Total Eq: <span className="font-medium text-foreground">
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
                        })()} VES
                    </span>
                </div>

                <div className="space-y-2">
                    <Label>Comprobante (Opcional)</Label>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Input
                                ref={fileInputRef}
                                type="file"
                                className="cursor-pointer"
                                accept="image/png, image/jpeg, application/pdf"
                                onChange={(e) => {
                                    handleFileChange(e)
                                    // Handle Preview
                                    if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0]
                                        if (file.type.startsWith('image/')) {
                                            const url = URL.createObjectURL(file)
                                            setPreviewUrl(url)
                                        } else {
                                            setPreviewUrl(null)
                                        }
                                    } else {
                                        setPreviewUrl(null)
                                    }
                                }}
                            />
                        </div>

                        {selectedFile && (
                            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                                <CloudUpload className="h-4 w-4" />
                                <span>Archivo cargado exitosamente: <strong>{selectedFile.name}</strong></span>
                            </div>
                        )}

                        {previewUrl && (
                            <div className="mt-2 relative w-full h-40 bg-muted rounded-md overflow-hidden border">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
                {onCancel && <Button variant="outline" onClick={onCancel}>Cancelar</Button>}
                <Button
                    onClick={handlePreSubmit}
                    disabled={isSubmitting || !activeContract}
                    className="bg-green-600 hover:bg-green-700"
                >
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : <><DollarSign className="mr-2 h-4 w-4" /> Registrar Pago</>}
                </Button>
            </div>

            <AlertDialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar Registro de Pago?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                Esta a punto de registrar <strong>{paymentParts.length}</strong> pago(s).
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                                    {paymentParts.map((p, i) => (
                                        <li key={i}>
                                            Ref: {p.reference} - <strong>{p.currency} {p.amount}</strong>
                                        </li>
                                    ))}
                                </ul>
                                <br />
                                Verifique que los datos sean correctos antes de continuar, esta acción afectará el estado de cuenta del inquilino.
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => {
                            e.preventDefault()
                            handleConfirmPayment()
                        }} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar y Guardar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
