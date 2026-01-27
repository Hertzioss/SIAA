'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Loader2, Edit, Trash, FileSpreadsheet, TrendingDown } from "lucide-react"
import { useOwnerExpenses } from "@/hooks/use-owner-expenses"
import { useProperties } from "@/hooks/use-properties"
import { ExpenseDialog } from "@/components/expenses/expense-dialog"
import { OwnerExpense } from "@/types/owner-expense"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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

export default function ExpensesPage() {
    const { expenses, owners, loading, createExpense, updateExpense, deleteExpense } = useOwnerExpenses()
    const { properties } = useProperties()

    const [searchTerm, setSearchTerm] = useState("")
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>("all")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
    const [selectedExpense, setSelectedExpense] = useState<OwnerExpense | undefined>(undefined)

    // Delete confirmation
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [expenseToDelete, setExpenseToDelete] = useState<OwnerExpense | null>(null)

    const filteredExpenses = expenses.filter(expense => {
        const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.owner?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.property?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.amount.toString().includes(searchTerm)

        const matchesOwner = selectedOwnerId === "all" || expense.owner_id === selectedOwnerId

        return matchesSearch && matchesOwner
    })

    const handleExport = () => {
        const headers = ["Fecha", "Propietario", "Propiedad", "Categoría", "Descripción", "Estado", "Monto", "Moneda"]
        const csvContent = [
            headers.join(","),
            ...filteredExpenses.map(e => [
                format(new Date(e.date), 'dd/MM/yyyy'),
                `"${e.owner?.name || ''}"`,
                `"${e.property?.name || ''}"`,
                getCategoryLabel(e.category),
                `"${e.description || ''}"`,
                getStatusLabel(e.status),
                e.amount,
                e.currency || 'USD',
                e.exchange_rate || 1
            ].join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `egresos_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleCreate = () => {
        setDialogMode("create")
        setSelectedExpense(undefined)
        setIsDialogOpen(true)
    }

    const handleEdit = (expense: OwnerExpense) => {
        setDialogMode("edit")
        setSelectedExpense(expense)
        setIsDialogOpen(true)
    }

    const handleSubmit = async (data: any) => {
        if (dialogMode === 'create') {
            await createExpense(data)
        } else if (selectedExpense) {
            await updateExpense(selectedExpense.id, data)
        }
    }

    const confirmDelete = (expense: OwnerExpense) => {
        setExpenseToDelete(expense)
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (expenseToDelete) {
            await deleteExpense(expenseToDelete.id)
            setIsDeleteDialogOpen(false)
            setExpenseToDelete(null)
        }
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'paid': return 'default'; // Black/Primary
            case 'pending': return 'secondary'; // Gray
            case 'cancelled': return 'destructive'; // Red
            default: return 'outline';
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paid': return 'Pagado';
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

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Egresos de Propietarios</h1>
                    <p className="text-muted-foreground">
                        Registro de pagos, adelantos y gastos de propietarios.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button color="success" className="bg-green-600 hover:bg-green-700" onClick={handleExport}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Registrar Egreso
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Egresos (Vista Actual)
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">
                            {filteredExpenses.length} registros encontrados
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Historial de Egresos</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar egreso..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filtrar por propietario" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los propietarios</SelectItem>
                                {owners.map(owner => (
                                    <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No se encontraron egresos.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Propietario / Inmueble</TableHead>
                                    <TableHead>Concepto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead className="text-right">Tasa</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredExpenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>
                                            {format(new Date(expense.date), 'dd MMM yyyy', { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{expense.owner?.name}</div>
                                            <div className="text-xs text-muted-foreground">{expense.owner?.doc_id}</div>
                                        </TableCell>
                                        <TableCell>
                                            {expense.property?.name || <span className="text-muted-foreground italic">-</span>}
                                        </TableCell>
                                        <TableCell>{getCategoryLabel(expense.category)}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={expense.description || ""}>
                                            {expense.description || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(expense.status) as any}>
                                                {getStatusLabel(expense.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            <span className="text-xs text-muted-foreground mr-1">{expense.currency || 'USD'}</span>
                                            ${Number(expense.amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {expense.currency === 'USD' ? (expense.exchange_rate || '-') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(expense)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirmDelete(expense)}>
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
            </Card>

            <ExpenseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                expense={selectedExpense}
                properties={properties}
                owners={owners}
                onSubmit={handleSubmit}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del egreso.
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
        </div >
    )
}
