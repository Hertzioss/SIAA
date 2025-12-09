"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, Calendar as CalendarIcon, CloudUpload, Loader2, DollarSign, Wallet } from "lucide-react"
import { useTenantPayments, PaymentInsert } from "@/hooks/use-tenant-payments"
import { useContracts } from "@/hooks/use-contracts"
import { fetchBcvRate } from "@/services/exchange-rate"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tenant } from "@/types/tenant"

interface PaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    tenant: Tenant | undefined
}

export function PaymentDialog({ open, onOpenChange, tenant }: PaymentDialogProps) {
    const { registerPayment, isLoading: isSubmitting } = useTenantPayments()
    const { contracts, isLoading: isLoadingContracts } = useContracts()
    const [activeContract, setActiveContract] = useState<any>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Confirmation Dialog State
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)

    // Form State
    const [month, setMonth] = useState('julio')
    const [year, setYear] = useState('2024')
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [reference, setReference] = useState('')
    const [amount, setAmount] = useState('')
    const [currency, setCurrency] = useState<'USD' | 'VES'>('USD')
    const [exchangeRate, setExchangeRate] = useState('36.45')
    const [notes, setNotes] = useState('')
    const [targetAccounts, setTargetAccounts] = useState<any[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string>('na')

    // Reset form when dialog opens/closes or tenant changes
    useEffect(() => {
        if (open) {
            setReference('')
            setAmount('')
            setNotes('')
            setSelectedFile(null)
            setDate(format(new Date(), 'yyyy-MM-dd'))
            setIsConfirmationOpen(false)
            setIsConfirmationOpen(false)
            setSelectedAccountId('na')
            setTargetAccounts([])
            // Reset others if needed
        }
    }, [open, tenant])

    // Find active contract for the selected tenant
    useEffect(() => {
        if (tenant && contracts.length > 0) {
            // Filter contracts for this tenant and picking the active one
            // Note: Contract type has tenant_id string | null
            const active = contracts.find(c => c.tenant_id === tenant.id && c.status === 'active')
            setActiveContract(active || null)
        } else {
            setActiveContract(null)
        }
    }, [tenant, contracts])

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

    const validateForm = () => {
        if (!activeContract) {
            toast.error("Este inquilino no tiene un contrato activo.")
            return false
        }

        const missingFields = []
        if (!amount) missingFields.push("Monto")
        if (!reference) missingFields.push("Número de Referencia")
        if (!date) missingFields.push("Fecha")

        if (missingFields.length > 0) {
            toast.error(`Por favor complete los campos obligatorios: ${missingFields.join(", ")}`)
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

        const paymentData: PaymentInsert = {
            contract_id: activeContract.id,
            tenant_id: tenant!.id, // We know tenant exists if we are here
            date: date,
            amount: parseFloat(amount),
            currency: currency,
            exchange_rate: parseFloat(exchangeRate),
            concept: `Renta ${month} ${year}`,
            payment_method: 'Transferencia',
            reference_number: reference,
            notes: notes,
            proof_file: selectedFile || undefined,
            owner_bank_account_id: selectedAccountId !== 'na' ? selectedAccountId : undefined
        }

        const success = await registerPayment(paymentData)

        setIsConfirmationOpen(false) // Close confirmation

        if (success) {
            // Toast is handled in the hook, but we modify flow to close dialog
            onOpenChange(false)
        }
    }

    const propertyLabel = activeContract
        ? `${activeContract.units?.properties?.name || 'Propiedad'} - ${activeContract.units?.name || 'Unidad'}`
        : 'Sin contrato activo'

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Registrar Pago - {tenant?.name}</DialogTitle>
                        <DialogDescription>
                            Ingrese los detalles del pago recibido.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {activeContract === null && !isLoadingContracts && (
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
                                        {Array.from({ length: 5 }, (_, i) => {
                                            const currentYear = new Date().getFullYear()
                                            const y = currentYear - 2 + i
                                            return (
                                                <SelectItem key={y} value={y.toString()}>
                                                    {y}
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
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
                            {/* VES Calculation Preview */}
                            <div className="text-xs text-muted-foreground text-right mt-1">
                                Tasa: {exchangeRate} VES/USD | Total: <span className="font-medium text-foreground">{(parseFloat(amount || '0') * (currency === 'USD' ? parseFloat(exchangeRate) : 1)).toLocaleString('es-VE', { minimumFractionDigits: 2 })} VES</span>
                            </div>
                        </div>

                        {/* Owner Bank Account Selection */}
                        <div className="space-y-2">
                            <Label>Cuenta Destino (Propietario)</Label>
                            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione cuenta destino" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="na">No Especificada / Efectivo</SelectItem>
                                    {targetAccounts
                                        .filter(acc => acc.currency === currency)
                                        .map((acc, idx) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                {acc.bank_name} - {acc.currency} ({acc.owners?.name})
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {selectedAccountId !== 'na' && (
                                <div className="text-xs text-muted-foreground p-2 border rounded bg-muted/50">
                                    {(() => {
                                        const acc = targetAccounts.find(a => a.id === selectedAccountId)
                                        if (!acc) return null
                                        return (
                                            <>
                                                <p><span className="font-semibold">Banco:</span> {acc.bank_name}</p>
                                                <p><span className="font-semibold">Nro:</span> {acc.account_number}</p>
                                                <p><span className="font-semibold">Tipo:</span> {acc.account_type}</p>
                                            </>
                                        )
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Comprobante (Opcional)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    className="cursor-pointer"
                                    accept="image/png, image/jpeg, application/pdf"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button
                            onClick={handlePreSubmit}
                            disabled={isSubmitting || !activeContract}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : <><DollarSign className="mr-2 h-4 w-4" /> Registrar Pago</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            <AlertDialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar Registro de Pago?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta a punto de registrar un pago por un monto de <strong>{currency} {amount}</strong> con referencia <strong>{reference}</strong>.
                            <br /><br />
                            Verifique que los datos sean correctos antes de continuar, esta acción afectará el estado de cuenta del inquilino.
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
        </>
    )
}
