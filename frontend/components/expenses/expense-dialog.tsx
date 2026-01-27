import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Property } from "@/types/property"
import { OwnerExpense, OwnerExpenseCategory, OwnerExpenseStatus } from "@/types/owner-expense"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ExpenseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "create" | "edit"
    expense?: OwnerExpense
    properties: Property[]
    owners: any[]
    onSubmit: (data: any) => Promise<void>
}

export function ExpenseDialog({ open, onOpenChange, mode, expense, properties, owners, onSubmit }: ExpenseDialogProps) {
    const [ownerId, setOwnerId] = useState("")
    const [propertyId, setPropertyId] = useState<string | null>(null)
    const [category, setCategory] = useState<OwnerExpenseCategory>("other")
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [currency, setCurrency] = useState<"USD" | "Bs">("USD")
    const [exchangeRate, setExchangeRate] = useState("")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [status, setStatus] = useState<OwnerExpenseStatus>("paid")
    const [receiptUrl, setReceiptUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [openOwnerSelect, setOpenOwnerSelect] = useState(false)
    const [customCategory, setCustomCategory] = useState("")

    // Reset or Populate form
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && expense) {
                setOwnerId(expense.owner_id)
                setPropertyId(expense.property_id || null)
                setCategory(expense.category)
                setCustomCategory("") // Reset
                setDescription(expense.description || "")
                setAmount(expense.amount.toString())
                setCurrency(expense.currency || "USD")
                setExchangeRate(expense.exchange_rate?.toString() || "")
                setDate(expense.date.split('T')[0])
                setStatus(expense.status)
                setReceiptUrl(expense.receipt_url || "")
            } else {
                setOwnerId("")
                setPropertyId(null)
                setCategory("other")
                setCustomCategory("")
                setDescription("")
                setAmount("")
                setCurrency("USD")
                setExchangeRate("")
                setDate(new Date().toISOString().split('T')[0])
                setStatus("paid")
                setReceiptUrl("")
            }
        }
    }, [open, mode, expense])

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const payload = {
                owner_id: ownerId,
                property_id: propertyId,
                category: category === 'other' ? customCategory : category,
                description,
                amount: parseFloat(amount),
                currency,
                exchange_rate: exchangeRate ? parseFloat(exchangeRate) : null,
                date,
                status,
                receipt_url: receiptUrl || null
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
                    <DialogTitle>{mode === 'create' ? 'Registrar Egreso de Propietario' : 'Editar Egreso'}</DialogTitle>
                    <DialogDescription>
                        Registre salidas de dinero asociadas a un propietario.
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
                        <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="withdrawal">Retiro / Adelanto</SelectItem>
                                <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                <SelectItem value="tax">Impuestos</SelectItem>
                                <SelectItem value="fee">Honorarios</SelectItem>
                                <SelectItem value="other">Otros (Especificar)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {category === 'other' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="manual-category" className="text-right">Especificar</Label>
                            <Input
                                id="manual-category"
                                placeholder="Especifique la categoría"
                                className="col-span-3"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Descripción</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalle del egreso..." className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Estado</Label>
                        <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="paid">Pagado</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
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
