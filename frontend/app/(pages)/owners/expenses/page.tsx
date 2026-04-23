"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { getOwnerProperties, getOwnerExpensesList } from "@/actions/owner-dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Building2, Loader2, Edit, Trash, ChevronLeft, ChevronRight } from "lucide-react"
import { fetchBcvRate } from "@/services/exchange-rate"
import { toast } from "sonner"
import { format } from "date-fns"
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

export default function OwnerExpensesPage() {
    const [loading, setLoading] = useState(true)
    const [expenses, setExpenses] = useState<any[]>([])
    const [properties, setProperties] = useState<any[]>([])
    const [ownerId, setOwnerId] = useState<string>("")

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
    const [selectedExpense, setSelectedExpense] = useState<any>(null)

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [expenseToDelete, setExpenseToDelete] = useState<any>(null)

    // Form state
    const [propertyId, setPropertyId] = useState<string>("none")
    const [category, setCategory] = useState<string>("maintenance")
    const [customCategory, setCustomCategory] = useState("")
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [currency, setCurrency] = useState<"USD" | "VES">("USD")
    const [exchangeRate, setExchangeRate] = useState("")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(5)

    const totalPages = Math.ceil(expenses.length / itemsPerPage)
    const currentExpenses = expenses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const fetchData = async () => {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const userId = session.user.id
        setOwnerId(userId)

        // Fetch properties owned by this user using server action to bypass RLS
        const { data: props, error: propsError } = await getOwnerProperties(session.access_token)
        if (props) {
            setProperties(props)
        }

        // Fetch all expenses (owner specific + general properties) via server action
        const { data: allExpenses, error: expError } = await getOwnerExpensesList(session.access_token)
        if (allExpenses) {
            setExpenses(allExpenses)
        }
        
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const openCreateDialog = async () => {
        setDialogMode("create")
        setSelectedExpense(null)
        setPropertyId("none")
        setCategory("maintenance")
        setCustomCategory("")
        setDescription("")
        setAmount("")
        setCurrency("USD")
        setDate(new Date().toISOString().split('T')[0])
        const rate = await fetchBcvRate()
        if (rate) setExchangeRate(rate.toString())
        setIsDialogOpen(true)
    }

    const openEditDialog = (expense: any) => {
        setDialogMode("edit")
        setSelectedExpense(expense)
        setPropertyId(expense.property_id || "none")
        setCategory(expense.category)
        setDescription(expense.description || "")
        setAmount(expense.amount.toString())
        setCurrency(expense.currency || "USD")
        setExchangeRate(expense.exchange_rate?.toString() || "")
        setDate(expense.date.split('T')[0])
        setIsDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!amount || !exchangeRate) return

        setIsSubmitting(true)
        const payload = {
            owner_id: ownerId,
            property_id: propertyId === "none" ? null : propertyId,
            category: category === 'other' ? customCategory : category,
            description,
            amount: parseFloat(amount),
            currency,
            exchange_rate: exchangeRate ? parseFloat(exchangeRate) : null,
            date,
            status: "pending" // Owners register as pending by default, or maybe paid? Let's make it pending so admin can verify.
        }

        try {
            if (dialogMode === "create") {
                const { error } = await supabase.from('owner_expenses').insert(payload)
                if (error) throw error
                toast.success("Egreso registrado", { description: "El egreso ha sido registrado exitosamente." })
            } else {
                const { error } = await supabase.from('owner_expenses').update(payload).eq('id', selectedExpense.id)
                if (error) throw error
                toast.success("Egreso actualizado", { description: "El egreso ha sido actualizado." })
            }
            setIsDialogOpen(false)
            fetchData()
        } catch (error: any) {
            toast.error("Error", { description: error.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!expenseToDelete) return
        try {
            const { error } = await supabase.from('owner_expenses').delete().eq('id', expenseToDelete.id)
            if (error) throw error
            toast.success("Egreso eliminado", { description: "El egreso ha sido eliminado." })
            setIsDeleteDialogOpen(false)
            fetchData()
        } catch (error: any) {
            toast.error("Error", { description: error.message })
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paid': return 'Aprobado';
            case 'pending': return 'Pendiente';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    }

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'withdrawal': return 'Retiro';
            case 'maintenance': return 'Mantenimiento';
            case 'utilities': return 'Servicios';
            case 'tax': return 'Impuestos';
            case 'fee': return 'Honorarios';
            case 'other': return 'Otros';
            default: return cat;
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mis Egresos</h2>
                    <p className="text-muted-foreground mt-1">Registra y administra tus gastos asociados a tus inmuebles.</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Registrar Egreso
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Egresos Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No has registrado ningún egreso aún.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Inmueble</TableHead>
                                    <TableHead>Concepto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Monto (USD)</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentExpenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>
                                            {(() => {
                                                if (!expense.date) return '-'
                                                const [y, m, d] = expense.date.toString().split('T')[0].split('-')
                                                return `${d}/${m}/${y}`
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {expense.expense_type === 'property' ? (
                                                    <Badge variant="outline" className="mr-2 text-[10px] bg-slate-100">General</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="mr-2 text-[10px] bg-blue-50 text-blue-700 border-blue-200">Directo</Badge>
                                                )}
                                                {expense.property ? (
                                                    <span>{expense.propertyName}</span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">Personal / No asignado</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <div className="font-medium">{getCategoryLabel(expense.category)}</div>
                                            {expense.description && (
                                                <div className="text-xs text-muted-foreground truncate" title={expense.description}>
                                                    {expense.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={expense.status === 'paid' ? 'default' : expense.status === 'pending' ? 'secondary' : 'destructive'}>
                                                {getStatusLabel(expense.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            <div className="flex flex-col items-end">
                                                <div>
                                                    <span className="text-xs text-muted-foreground mr-1">
                                                        {expense.currency === 'VES' ? 'Bs.' : (expense.currency || 'USD')}
                                                    </span>
                                                    {(expense.currency === 'USD' || !expense.currency) && '$'} {Number(expense.prorated_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </div>
                                                {expense.expense_type === 'property' && expense.prorated_percentage < 100 && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        (Tu {expense.prorated_percentage}% de {(expense.currency === 'USD' || !expense.currency) ? '$' : 'Bs.'} {Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8" 
                                                    onClick={() => openEditDialog(expense)} 
                                                    disabled={expense.status === 'paid' || expense.expense_type === 'property'}
                                                    title={expense.expense_type === 'property' ? "No puedes editar un gasto general del inmueble" : "Editar"}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-destructive" 
                                                    onClick={() => { setExpenseToDelete(expense); setIsDeleteDialogOpen(true); }} 
                                                    disabled={expense.status === 'paid' || expense.expense_type === 'property'}
                                                    title={expense.expense_type === 'property' ? "No puedes eliminar un gasto general del inmueble" : "Eliminar"}
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                {totalPages > 1 && (
                    <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm text-muted-foreground mr-2 hidden sm:block">Filas por página:</p>
                            <Select
                                value={itemsPerPage.toString()}
                                onValueChange={(val) => {
                                    setItemsPerPage(Number(val))
                                    setCurrentPage(1)
                                }}
                            >
                                <SelectTrigger className="w-[70px] h-8">
                                    <SelectValue placeholder={itemsPerPage.toString()} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[5, 10, 20, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={pageSize.toString()}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="w-2 sm:w-4"></div> 
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Anterior</span>
                            </Button>
                            <div className="text-sm text-muted-foreground whitespace-nowrap min-w-[4rem] text-center">
                                {currentPage} de {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <span className="hidden sm:inline">Siguiente</span> <ChevronRight className="h-4 w-4 sm:ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{dialogMode === 'create' ? 'Registrar Egreso' : 'Editar Egreso'}</DialogTitle>
                        <DialogDescription>
                            Registra un gasto asociado a uno de tus inmuebles o un gasto personal general.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Fecha</Label>
                            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="property" className="text-right">Inmueble</Label>
                            <Select value={propertyId} onValueChange={setPropertyId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar inmueble" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Personal / No asignado --</SelectItem>
                                    {properties.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Categoría</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                    <SelectItem value="utilities">Servicios</SelectItem>
                                    <SelectItem value="tax">Impuestos</SelectItem>
                                    <SelectItem value="fee">Honorarios</SelectItem>
                                    <SelectItem value="other">Otros (Especificar)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {category === 'other' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="customCat" className="text-right">Especificar</Label>
                                <Input id="customCat" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Especifique..." className="col-span-3" />
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Monto</Label>
                            <div className="col-span-3 flex gap-2">
                                <Input id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="flex-1" />
                                <Select value={currency} onValueChange={(val: any) => setCurrency(val)}>
                                    <SelectTrigger className="w-[100px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="VES">VES</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="exchangeRate" className="text-right">Tasa (Bs/USD)</Label>
                            <Input id="exchangeRate" type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="desc" className="text-right">Detalles</Label>
                            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción del egreso..." className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || !amount || !exchangeRate}>
                            {isSubmitting ? "Guardando..." : "Guardar Egreso"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este egreso?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará el registro de forma permanente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
