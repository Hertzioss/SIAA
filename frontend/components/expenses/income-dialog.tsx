import { useState, useEffect } from "react"
import { fetchBcvRate } from "@/services/exchange-rate"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Property } from "@/types/property"
import { OwnerIncome, OwnerIncomeCategory } from "@/types/owner-income"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface IncomeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "create" | "edit"
    income?: OwnerIncome
    properties: Property[]
    owners: any[]
    onSubmit: (data: any) => Promise<void>
}

export function IncomeDialog({ open, onOpenChange, mode, income, properties, owners, onSubmit }: IncomeDialogProps) {
    const [ownerId, setOwnerId] = useState("")
    const [propertyId, setPropertyId] = useState<string | null>(null)
    const [category, setCategory] = useState<OwnerIncomeCategory>("Alquiler")
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [currency, setCurrency] = useState<"USD" | "Bs" | "VES">("USD")
    const [exchangeRate, setExchangeRate] = useState("")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    // const [status, setStatus] = useState<OwnerIncomeStatus>("received") // For now assuming received or just log
    const [loading, setLoading] = useState(false)
    const [openOwnerSelect, setOpenOwnerSelect] = useState(false)
    
    // Reset or Populate form
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && income) {
                setOwnerId(income.owner_id)
                setPropertyId(income.property_id || null)
                setCategory(income.category)
                setDescription(income.description || "")
                setAmount(income.amount.toString())
                setCurrency(income.currency || "USD")
                setExchangeRate(income.exchange_rate?.toString() || "")
                setDate(income.date.split('T')[0])
                // setStatus(income.status)
            } else {
                setOwnerId("")
                setPropertyId(null)
                setCategory("Alquiler")
                setDescription("")
                setAmount("")
                setCurrency("USD")
                // Fetch current rate for new entries
                fetchBcvRate().then(rate => {
                    if (rate) setExchangeRate(rate.toString())
                })
                setDate(new Date().toISOString().split('T')[0])
                // setStatus("received")
            }
        }
    }, [open, mode, income])

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const payload = {
                owner_id: ownerId,
                property_id: propertyId,
                category,
                description,
                amount: parseFloat(amount),
                currency,
                exchange_rate: exchangeRate ? parseFloat(exchangeRate) : null,
                date,
                // status
            }
            await onSubmit(payload)
            onOpenChange(false)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Registrar Ingreso de Propietario' : 'Editar Ingreso'}</DialogTitle>
                    <DialogDescription>
                        Registre entradas de dinero adicionales para un propietario.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Fecha</Label>
                        <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="col-span-3" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="owner" className="text-right">Propietario</Label>
                        <Popover open={openOwnerSelect} onOpenChange={setOpenOwnerSelect}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openOwnerSelect}
                                    className="col-span-3 justify-between font-normal"
                                >
                                    {ownerId
                                        ? owners.find((owner) => owner.id === ownerId)?.name
                                        : "Seleccionar propietario..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar propietario..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontraron propietarios.</CommandEmpty>
                                        <CommandGroup>
                                            {owners.map((owner) => (
                                                <CommandItem
                                                    key={owner.id}
                                                    value={owner.name}
                                                    onSelect={() => {
                                                        setOwnerId(owner.id)
                                                        setOpenOwnerSelect(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            ownerId === owner.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {owner.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="property" className="text-right">Propiedad (Opcional)</Label>
                        <Select value={propertyId || "none"} onValueChange={(val) => setPropertyId(val === "none" ? null : val)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Sin propiedad específica" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- Ninguna --</SelectItem>
                                <SelectItem value="generic">-- Genérico / Varios --</SelectItem> 
                                {properties.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Monto</Label>
                        <Input id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="col-span-1" />
                        <Select value={currency} onValueChange={(val: any) => setCurrency(val)}>
                            <SelectTrigger className="col-span-2">
                                <SelectValue placeholder="Moneda" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="Bs">Bolívares (Bs)</SelectItem>
                                <SelectItem value="VES">Bolívares (VES)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {currency === 'USD' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="exchangeRate" className="text-right">Tasa (Bs/USD)</Label>
                            <Input
                                id="exchangeRate"
                                type="number"
                                step="0.01"
                                value={exchangeRate}
                                onChange={e => setExchangeRate(e.target.value)}
                                placeholder="Ej: 36.50"
                                className="col-span-3"
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Categoría</Label>
                        <Label htmlFor="category" className="text-right">Categoría</Label>
                        <div className="col-span-3 flex gap-2">
                            <Select 
                                value={['Alquiler', 'Otros', 'Depósito', 'Reintegro'].includes(category) ? category : 'custom'} 
                                onValueChange={(val) => {
                                    if (val !== 'custom') {
                                        setCategory(val)
                                    } else {
                                        setCategory('') // Clear for custom input
                                    }
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Alquiler">Alquiler</SelectItem>
                                    <SelectItem value="Depósito">Depósito</SelectItem>
                                    <SelectItem value="Reintegro">Reintegro</SelectItem>
                                    <SelectItem value="Otros">Otros</SelectItem>
                                    <SelectItem value="custom">Escribir manual...</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input 
                                placeholder="Especifique categoría..." 
                                value={category} 
                                onChange={e => setCategory(e.target.value)}
                                className={cn(
                                    "flex-1",
                                    ['Alquiler', 'Otros', 'Depósito', 'Reintegro'].includes(category) && "hidden"
                                )}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Descripción</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalle del ingreso..." className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading || !ownerId || !amount || (currency === 'USD' && !exchangeRate)}>
                        {loading ? "Guardando..." : (mode === 'create' ? "Guardar" : "Actualizar")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
