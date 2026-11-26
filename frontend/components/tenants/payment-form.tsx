"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CloudUpload, Loader2, DollarSign, Search, User, Check, Building2, FileText, Calculator, Plus, X, ExternalLink } from "lucide-react"
import { useTenantPayments, PaymentInsert } from "@/hooks/use-tenant-payments"
import { useTenants } from "@/hooks/use-tenants"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, formatCurrency, formatCurrencyLabel } from "@/lib/utils"
import { useContracts, Contract } from "@/hooks/use-contracts"
import { Checkbox } from "@/components/ui/checkbox"
import { fetchBcvRate } from "@/services/exchange-rate"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tenant } from "@/types/tenant"
import { PrintableReceiptHandler } from "@/components/printable-receipt-handler"
import { PaymentWithDetails } from "@/types/payment"
import { v4 as uuidv4 } from "uuid"
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
    isAdmin?: boolean
}

interface DistributionPreviewItem {
    month: number
    year: number
    amount: number
    isFull: boolean
    currency: 'USD' | 'VES'
    partIndex: number
    reference: string
    originalAmount: string
}

interface TargetAccount {
    id: string
    bank_name: string
    account_number: string
    currency: string
    account_type: string
    owners: { name: string } | { name: string }[] | null
}

export function PaymentForm({ defaultTenant, onSuccess, onCancel, className, isAdmin = false }: PaymentFormProps) {
    const { tenants } = useTenants() // Fetch all tenants for search
    const { registerPayment, isLoading: isSubmitting, calculatePaymentDistribution, fetchPaymentById } = useTenantPayments()
    const { contracts, isLoading: isLoadingContracts } = useContracts()

    // Internal state for selected tenant (either prop or search)
    const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>(defaultTenant)
    const [searchOpen, setSearchOpen] = useState(false)

    const [activeContract, setActiveContract] = useState<Contract | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Confirmation Dialog State
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
    const [distributionPreview, setDistributionPreview] = useState<DistributionPreviewItem[]>([])
    const [isPreviewMode, setIsPreviewMode] = useState(false)


    // Form State
    const [month, setMonth] = useState(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][new Date().getMonth()])
    const [year, setYear] = useState(new Date().getFullYear().toString())
    const [date, setDate] = useState('')

    // Admin features
    const [referenceAmountUSD, setReferenceAmountUSD] = useState('')
    const [rateCalcOpen, setRateCalcOpen] = useState(false)
    const [autoConciliate, setAutoConciliate] = useState(false)
    const [sendEmail, setSendEmail] = useState(false)
    const [printReceipt, setPrintReceipt] = useState(false)
    const [receiptPrintMode, setReceiptPrintMode] = useState<'single' | 'multiple'>('multiple')
    const [paymentsToPrint, setPaymentsToPrint] = useState<PaymentWithDetails[]>([])

    // Initialize date on client side
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
    const [targetAccounts, setTargetAccounts] = useState<TargetAccount[]>([])

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
                const propertyId = activeContract.units?.properties?.id
                if (!propertyId) return

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

    const monthMap: Record<string, number> = {
        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
    }

    // ...

    const handlePreSubmit = () => {
        if (validateForm() && activeContract) {
            // Calculate Distribution Preview
            const rent = activeContract.rent_amount || 0
            const startMonth = monthMap[month.toLowerCase()] || 1
            const startYear = parseInt(year) || new Date().getFullYear()
            const rate = parseFloat(exchangeRate) || 1

            const allSplits: DistributionPreviewItem[] = []

            paymentParts.forEach((part, partIndex) => {
                const amount = parseFloat(part.amount)
                let partSplits: { month: number, year: number, amount: number, isFull: boolean }[] = []
                
                if (part.currency === 'USD') {
                    partSplits = calculatePaymentDistribution(amount, startMonth, startYear, rent)
                } else {
                    // Calculate Equivalent Rent in VES
                    // We distribute the VES amount based on the VES equivalent of the rent
                    const rentInVes = rent * rate
                    partSplits = calculatePaymentDistribution(amount, startMonth, startYear, rentInVes)
                }

                partSplits.forEach(split => {
                    allSplits.push({
                        ...split,
                        currency: part.currency,
                        partIndex: partIndex,
                        reference: part.reference,
                        originalAmount: part.amount
                    })
                })
            })
            
            setDistributionPreview(allSplits)
            setIsConfirmationOpen(true)
        }
    }

    const handleConfirmPayment = async () => {
        if (!activeContract) return

        const inserts: PaymentInsert[] = []

        // Generate a transaction group ID for each payment part
        const partGroupIds = paymentParts.map(() => uuidv4())

        // Calculate total splits per part to store in metadata
        const splitCounts: Record<number, number> = {}
        const splitCurrent: Record<number, number> = {}
        
        distributionPreview.forEach(item => {
            const idx = item.partIndex || 0;
            splitCounts[idx] = (splitCounts[idx] || 0) + 1;
            splitCurrent[idx] = 1;
        });

        // We need to map `distributionPreview` to `PaymentInsert`
        for (const item of distributionPreview) {
             const pIndex = item.partIndex || 0;
             // Find original part info for bank accounts etc
             const originalPart = paymentParts[pIndex]

             // Format YYYY-MM-01
             const billingPeriod = `${item.year}-${String(item.month).padStart(2, '0')}-01`
             
             // Concept
             const monthName = Object.keys(monthMap).find(key => monthMap[key] === item.month)
             const concept = `Canon ${monthName?.charAt(0).toUpperCase()}${monthName?.slice(1)} ${item.year} (${item.isFull ? 'Completo' : 'Parcial'})`

             const paymentData: PaymentInsert = {
                contract_id: activeContract.id,
                tenant_id: selectedTenant!.id,
                date: date,
                amount: item.amount,
                currency: item.currency,
                exchange_rate: parseFloat(exchangeRate),
                concept: concept,
                payment_method: 'Transferencia', // Should be dynamic? The form has 'reference' implies transfer/pago movil. 
                reference_number: item.reference,
                notes: notes,
                proof_file: selectedFile || undefined,
                owner_bank_account_id: originalPart.accountId !== 'na' ? originalPart.accountId : undefined,
                status: (isAdmin && autoConciliate) ? 'approved' : 'pending',
                billing_period: billingPeriod,
                sendEmail: (isAdmin && autoConciliate && sendEmail),
                registration_source: isAdmin ? 'admin' : 'tenant',
                metadata: {
                    tenant_name: selectedTenant!.name,
                    tenant_doc_id: selectedTenant!.doc_id,
                    transaction_group_id: partGroupIds[pIndex],
                    original_total_amount: parseFloat(originalPart.amount),
                    original_currency: originalPart.currency,
                    split_total_parts: splitCounts[pIndex],
                    split_index: splitCurrent[pIndex]++
                }
            }
            inserts.push(paymentData)
        }

        const result = await registerPayment(inserts) // registerPayment handles arrays now

        setIsConfirmationOpen(false)

        if (result && Array.isArray(result) && result.length > 0) {
            if (isAdmin && autoConciliate && printReceipt) {
                const fullPayments = await Promise.all(
                    result.map(async (id: string) => await fetchPaymentById(id))
                )
                const validPayments = fullPayments.filter(Boolean) as PaymentWithDetails[]
                if (validPayments.length > 0) {
                    setPaymentsToPrint(receiptPrintMode === 'single' ? [validPayments[0]] : validPayments)
                    return // Delay onSuccess until print dialog closes
                }
            }
            if (onSuccess) onSuccess()
        } else if (result) {
            if (onSuccess) onSuccess()
        }
    }

    const propertyLabel = activeContract
        ? `${activeContract.units?.properties?.name || 'Inmueble'} · ${activeContract.units?.name || 'Unidad'}`
        : 'Sin contrato activo'

    // Live summary calculations
    const parsedRate = parseFloat(exchangeRate) || 0
    const paymentSummary = paymentParts.reduce(
        (acc, part) => {
            const amt = parseFloat(part.amount || '0')
            if (!amt || Number.isNaN(amt)) return acc
            if (part.currency === 'USD') {
                acc.rawUsd += amt
                acc.totalUsd += amt
                acc.totalBs += parsedRate > 0 ? amt * parsedRate : 0
            } else {
                acc.rawBs += amt
                acc.totalBs += amt
                acc.totalUsd += parsedRate > 0 ? amt / parsedRate : 0
            }
            return acc
        },
        { rawUsd: 0, rawBs: 0, totalUsd: 0, totalBs: 0 }
    )

    const rentAmount = Number(activeContract?.rent_amount || 0)
    const coverageStatus = (() => {
        if (!rentAmount || paymentSummary.totalUsd <= 0) return null
        const ratio = paymentSummary.totalUsd / rentAmount
        if (Math.abs(ratio - 1) < 0.01) {
            return { label: "Cubre 1 mes exacto", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900" }
        }
        if (ratio < 1) {
            return { label: `Abono parcial (${Math.round(ratio * 100)}%)`, className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900" }
        }
        const monthsCovered = Math.floor(ratio)
        const hasRemainder = ratio - monthsCovered > 0.01
        return {
            label: hasRemainder ? `${monthsCovered} mes(es) + abono` : `Cubre ${monthsCovered} meses`,
            className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
        }
    })()

    const handleClearFile = () => {
        setSelectedFile(null)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleCalculateRate = () => {
        const primaryPart = paymentParts.find(p => parseFloat(p.amount) > 0) || paymentParts[0]
        const currentAmount = parseFloat(primaryPart?.amount || '0')
        const refAmount = parseFloat(referenceAmountUSD)

        if (currentAmount > 0 && refAmount > 0) {
            const calculatedRate = primaryPart.currency === 'VES'
                ? (currentAmount / refAmount).toFixed(4)
                : (refAmount / currentAmount).toFixed(4)
            setExchangeRate(calculatedRate)
            setRateCalcOpen(false)
            toast.success(`Tasa aplicada: ${calculatedRate} Bs/USD`)
        } else {
            const unit = primaryPart?.currency === 'VES' ? 'Bs' : 'USD'
            const refUnit = primaryPart?.currency === 'VES' ? 'USD' : 'Bs'
            toast.error(`Ingrese primero un monto en ${unit} y una referencia válida en ${refUnit}`)
        }
    }

    return (
        <div className={cn("flex flex-col gap-3.5", className)}>
            {/* Top Context Strip: Tenant Selector + Property + Canon */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg border bg-muted/40">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 min-w-0 flex-1">
                    {!defaultTenant && (
                        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={searchOpen}
                                    className="h-9 w-full sm:w-[250px] justify-between bg-background font-medium"
                                >
                                    <span className="truncate flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        {selectedTenant ? selectedTenant.name : "Seleccionar inquilino..."}
                                    </span>
                                    <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[340px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar por nombre o cédula..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontraron inquilinos.</CommandEmpty>
                                        <CommandGroup>
                                            {tenants.map((t) => (
                                                <CommandItem
                                                    key={t.id}
                                                    value={`${t.name} ${t.doc_id}`}
                                                    onSelect={() => {
                                                        setSelectedTenant(t)
                                                        setSearchOpen(false)
                                                    }}
                                                >
                                                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
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
                    )}

                    <div className="flex items-center gap-2 text-sm min-w-0">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">
                            {isLoadingContracts ? "Cargando contrato..." : propertyLabel}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 sm:border-l sm:pl-3.5">
                    <span className="text-xs text-muted-foreground">Canon mensual</span>
                    <span className="text-base font-bold tabular-nums">
                        {formatCurrency(rentAmount, 'USD')}
                    </span>
                </div>
            </div>

            {selectedTenant && activeContract === null && !isLoadingContracts && (
                <div className="px-3.5 py-2 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                    <strong>Sin contrato activo:</strong> Este inquilino no tiene un contrato registrado. Registre un contrato antes de procesar el pago.
                </div>
            )}

            {/* Main 2-Column Asymmetric Desk */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Column (~60%): Period, Rate & Payment Parts */}
                <div className="lg:col-span-7 space-y-3">
                    {/* Single 4-column Period + Date + Rate Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Mes</Label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Mes" />
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

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Año</Label>
                            <Input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                placeholder="2026"
                                min="2000"
                                max="2100"
                                className="h-9 tabular-nums"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Fecha del pago</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    const newDate = e.target.value
                                    setDate(newDate)
                                    const today = new Date().toLocaleDateString('en-CA')
                                    if (newDate < today && isAdmin) {
                                        toast.warning("Fecha histórica. Verifique la tasa.")
                                    }
                                }}
                                className="h-9 tabular-nums"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Tasa (Bs/USD)</Label>
                            <div className="flex gap-1">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={exchangeRate}
                                    onChange={(e) => setExchangeRate(e.target.value)}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    placeholder="0.00"
                                    className="h-9 tabular-nums"
                                />
                                {isAdmin && (
                                    <Popover open={rateCalcOpen} onOpenChange={setRateCalcOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 shrink-0"
                                                title="Calcular tasa desde monto referencial"
                                            >
                                                <Calculator className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-3 space-y-2.5" align="end">
                                            <div className="text-xs font-semibold">Calculadora de tasa</div>
                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                Ingrese el equivalente en {paymentParts[0]?.currency === 'VES' ? 'USD ($)' : 'Bolívares (Bs)'} para calcular la tasa a partir del monto ingresado.
                                            </p>
                                            <div className="space-y-1">
                                                <Label htmlFor="ref-rate-amount" className="text-xs">
                                                    {paymentParts[0]?.currency === 'VES' ? 'Monto referencial ($)' : 'Monto referencial (Bs)'}
                                                </Label>
                                                <Input
                                                    id="ref-rate-amount"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder={paymentParts[0]?.currency === 'VES' ? "Ej. 100" : "Ej. 4500"}
                                                    className="h-8 text-sm tabular-nums"
                                                    value={referenceAmountUSD}
                                                    onChange={(e) => setReferenceAmountUSD(e.target.value)}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="w-full h-8"
                                                onClick={handleCalculateRate}
                                            >
                                                Aplicar tasa
                                            </Button>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Payment Parts Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">
                                Medios de pago {paymentParts.length > 1 ? `(${paymentParts.length})` : ''}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={addPaymentPart}
                                className="h-7 px-2 text-xs text-primary hover:text-primary"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" /> Agregar otro medio
                            </Button>
                        </div>

                        <div className={cn("space-y-2.5", paymentParts.length > 1 && "max-h-[275px] overflow-y-auto pr-1")}>
                            {paymentParts.map((part, index) => {
                                const selectedAcc = part.accountId !== 'na'
                                    ? targetAccounts.find(a => a.id === part.accountId)
                                    : null

                                return (
                                    <div key={index} className="p-3 border rounded-lg bg-card space-y-2.5">
                                        {paymentParts.length > 1 && (
                                            <div className="flex items-center justify-between -mt-0.5">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Pago #{index + 1}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removePaymentPart(index)}
                                                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                    title="Quitar medio de pago"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* Row 1: Amount + Currency + Reference */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                            <div className="sm:col-span-6 space-y-1">
                                                <Label className="text-xs text-muted-foreground">
                                                    Monto y moneda <span className="text-destructive">*</span>
                                                </Label>
                                                <div className="flex gap-1.5">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={part.amount}
                                                        onChange={(e) => updatePaymentPart(index, 'amount', e.target.value)}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        placeholder="0.00"
                                                        className={cn(
                                                            "h-9 flex-1 tabular-nums",
                                                            errors[`amount-${index}`] && "border-destructive ring-destructive"
                                                        )}
                                                    />
                                                    <div className="flex rounded-md border bg-muted p-0.5 shrink-0">
                                                        <Button
                                                            type="button"
                                                            variant={part.currency === 'USD' ? 'default' : 'ghost'}
                                                            size="sm"
                                                            onClick={() => updatePaymentPart(index, 'currency', 'USD')}
                                                            className="h-7 px-2.5 text-xs"
                                                        >
                                                            USD
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={part.currency === 'VES' ? 'default' : 'ghost'}
                                                            size="sm"
                                                            onClick={() => updatePaymentPart(index, 'currency', 'VES')}
                                                            className="h-7 px-2.5 text-xs"
                                                        >
                                                            Bs
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="sm:col-span-6 space-y-1">
                                                <Label className="text-xs text-muted-foreground">
                                                    Referencia {part.currency === 'VES' && <span className="text-destructive">*</span>}
                                                </Label>
                                                <Input
                                                    value={part.reference}
                                                    onChange={(e) => updatePaymentPart(index, 'reference', e.target.value)}
                                                    placeholder={part.currency === 'VES' ? "Requerida para Bs" : "Opcional para USD"}
                                                    className={cn(
                                                        "h-9",
                                                        errors[`reference-${index}`] && "border-destructive ring-destructive"
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2: Destination Bank Account */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Cuenta destino (propietario)</Label>
                                            <Select
                                                value={part.accountId}
                                                onValueChange={(val) => updatePaymentPart(index, 'accountId', val)}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Seleccione cuenta destino" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="na">No especificada / Efectivo</SelectItem>
                                                    {targetAccounts
                                                        .filter(acc => acc.currency === part.currency)
                                                        .map((acc) => (
                                                            <SelectItem key={acc.id} value={acc.id}>
                                                                {acc.bank_name} - {formatCurrencyLabel(acc.currency)} ({Array.isArray(acc.owners) ? acc.owners[0]?.name : acc.owners?.name})
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                            {selectedAcc && (
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {selectedAcc.account_number} ({selectedAcc.account_type})
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column (~40%): Live Summary, Attachment & Notes */}
                <div className="lg:col-span-5 space-y-3">
                    {/* Live Summary Panel */}
                    <div className="p-3.5 rounded-lg border bg-muted/35 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold">Resumen del cobro</span>
                            {coverageStatus && (
                                <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", coverageStatus.className)}>
                                    {coverageStatus.label}
                                </span>
                            )}
                        </div>

                        <div className="space-y-1.5 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Total ingresado</span>
                                <span className="font-semibold tabular-nums text-right">
                                    {(() => {
                                        const parts: string[] = []
                                        if (paymentSummary.rawUsd > 0) parts.push(formatCurrency(paymentSummary.rawUsd, 'USD'))
                                        if (paymentSummary.rawBs > 0) parts.push(formatCurrency(paymentSummary.rawBs, 'VES'))
                                        if (parts.length === 0) {
                                            return paymentParts[0]?.currency === 'USD' ? '$0.00' : 'Bs. 0,00'
                                        }
                                        return parts.join(' + ')
                                    })()}
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
                                <span className="text-xs text-muted-foreground">Equivalente en USD</span>
                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                    {formatCurrency(paymentSummary.totalUsd, 'USD')}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Equivalente en Bs</span>
                                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                    {formatCurrency(paymentSummary.totalBs, 'VES')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Compact Attachment Bar */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Comprobante (opcional)</Label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, application/pdf"
                            onChange={(e) => {
                                handleFileChange(e)
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

                        {!selectedFile ? (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-11 px-3 rounded-lg border border-dashed border-input hover:bg-muted/50 transition-colors flex items-center justify-between text-xs text-muted-foreground"
                            >
                                <span className="flex items-center gap-2">
                                    <CloudUpload className="h-4 w-4 shrink-0" />
                                    <span>Adjuntar capture o PDF</span>
                                </span>
                                <span className="text-[11px] opacity-75">PNG, JPG, PDF</span>
                            </button>
                        ) : (
                            <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-900/60">
                                <div className="flex items-center gap-2 min-w-0">
                                    {previewUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => window.open(previewUrl, '_blank')}
                                            className="relative h-9 w-9 rounded overflow-hidden border bg-background shrink-0 group"
                                            title="Ver comprobante en tamaño completo"
                                        >
                                            <Image
                                                src={previewUrl}
                                                alt="Vista previa del comprobante"
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </button>
                                    ) : (
                                        <div className="h-9 w-9 rounded border bg-background flex items-center justify-center shrink-0">
                                            <FileText className="h-4 w-4 text-emerald-700" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 truncate">
                                            {selectedFile.name}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-[11px] text-muted-foreground hover:underline"
                                        >
                                            Cambiar archivo
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {previewUrl && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => window.open(previewUrl, '_blank')}
                                            title="Abrir vista previa"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                        onClick={handleClearFile}
                                        title="Quitar archivo"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Compact Notes */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Notas adicionales (opcional)</Label>
                        <Textarea
                            placeholder="Observaciones sobre el pago..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none text-sm min-h-[64px]"
                            rows={2}
                        />
                    </div>
                </div>
            </div>

            {/* Pinned Footer Bar: Conciliation Toggle + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                <div>
                    {isAdmin && (
                        <label
                            htmlFor="auto-conciliate"
                            className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors select-none",
                                autoConciliate
                                    ? "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200"
                                    : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Checkbox
                                id="auto-conciliate"
                                checked={autoConciliate}
                                onCheckedChange={(checked) => setAutoConciliate(checked === true)}
                                className="h-4 w-4"
                            />
                            <span>Conciliar inmediatamente (aprobar)</span>
                        </label>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2">
                    {onCancel && (
                        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-9">
                            Cancelar
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            setIsPreviewMode(true)
                            handlePreSubmit()
                        }}
                        disabled={isSubmitting || !activeContract}
                        className="h-9"
                    >
                        <FileText className="mr-1.5 h-4 w-4" /> Previsualizar
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                            setIsPreviewMode(false)
                            handlePreSubmit()
                        }}
                        disabled={isSubmitting || !activeContract}
                        className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isSubmitting
                            ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Procesando...</>
                            : <><DollarSign className="mr-1.5 h-4 w-4" /> Registrar Pago</>}
                    </Button>
                </div>
            </div>

            <AlertDialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isPreviewMode ? 'Previsualización de Distribución' : '¿Confirmar Registro de Pago?'}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                {selectedTenant && (
                                    <div className="mb-2 text-sm text-foreground">
                                        Inquilino: <span className="font-bold">{selectedTenant.name}</span>
                                    </div>
                                )}
                                Se registrarán <strong>{distributionPreview.length}</strong> pago(s) individuales:
                                <div className="max-h-[300px] overflow-y-auto mt-4 border rounded-md p-2 bg-muted/20">
                                    <ul className="space-y-2 text-sm">
                                        {distributionPreview.map((item, i) => {
                                             const monthName = Object.keys(monthMap).find(key => monthMap[key] === item.month)
                                             return (
                                                <li key={i} className="flex justify-between items-center border-b pb-1 last:border-0 last:pb-0">
                                                    <div>
                                                        <span className="font-semibold capitalize">{monthName} {item.year}</span>
                                                        <span className="text-xs text-muted-foreground ml-2">({item.isFull ? 'Completo' : 'Parcial'})</span>
                                                        {item.reference && <div className="text-xs text-muted-foreground">Ref: {item.reference}</div>}
                                                    </div>
                                                    <div className="font-mono font-medium">
                                                        {formatCurrencyLabel(item.currency)} {item.amount.toLocaleString()}
                                                    </div>
                                                </li>
                                             )
                                        })}
                                    </ul>
                                </div>
                                {!isPreviewMode && (
                                    <div className="mt-4 text-xs text-muted-foreground text-center">
                                        Verifique la distribución antes de continuar.
                                    </div>
                                )}
                                {isAdmin && autoConciliate && !isPreviewMode && (
                                    <div className="flex flex-col gap-2 mt-4">
                                        <div className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/50 p-4 rounded-md">
                                            <Checkbox
                                                id="confirm-send-email"
                                                checked={sendEmail}
                                                onCheckedChange={(checked) => setSendEmail(checked === true)}
                                                className="h-5 w-5"
                                            />
                                            <Label
                                                htmlFor="confirm-send-email"
                                                className="cursor-pointer font-medium flex-1 dark:text-yellow-200"
                                            >
                                                Enviar confirmación por correo al inquilino
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50 p-4 rounded-md">
                                            <Checkbox
                                                id="confirm-print-receipt"
                                                checked={printReceipt}
                                                onCheckedChange={(checked) => setPrintReceipt(checked === true)}
                                                className="h-5 w-5"
                                            />
                                            <Label
                                                htmlFor="confirm-print-receipt"
                                                className="cursor-pointer font-medium flex-1 dark:text-blue-200"
                                            >
                                                Imprimir recibo tras guardar
                                            </Label>
                                        </div>
                                        {printReceipt && distributionPreview.length > 1 && (
                                            <div className="flex items-center gap-4 bg-blue-50/50 border border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-900/30 p-3 rounded-md ml-7">
                                                <Label className="text-xs font-medium dark:text-blue-300">Formato de impresión:</Label>
                                                <div className="flex gap-3">
                                                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="receiptPrintMode"
                                                            value="single"
                                                            checked={receiptPrintMode === 'single'}
                                                            onChange={() => setReceiptPrintMode('single')}
                                                            className="accent-blue-600"
                                                        />
                                                        Un solo recibo
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="receiptPrintMode"
                                                            value="multiple"
                                                            checked={receiptPrintMode === 'multiple'}
                                                            onChange={() => setReceiptPrintMode('multiple')}
                                                            className="accent-blue-600"
                                                        />
                                                        Un recibo por mes
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>{isPreviewMode ? 'Cerrar' : 'Cancelar'}</AlertDialogCancel>
                        {!isPreviewMode && (
                            <AlertDialogAction onClick={(e) => {
                                e.preventDefault()
                                handleConfirmPayment()
                            }} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar y Guardar"}
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {paymentsToPrint.length > 0 && (
                <PrintableReceiptHandler
                    payments={paymentsToPrint}
                    onClose={() => {
                        setPaymentsToPrint([])
                        if (onSuccess) onSuccess()
                    }}
                />
            )}
        </div >
    )
}
