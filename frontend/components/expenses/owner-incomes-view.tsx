"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Loader2, Edit, Trash, FileSpreadsheet, Building2, TrendingUp } from "lucide-react"
import { useOwnerIncomes } from "@/hooks/use-owner-incomes"
import { useProperties } from "@/hooks/use-properties"
import { IncomeDialog } from "./income-dialog"
import { OwnerIncome } from "@/types/owner-income"
import { format } from "date-fns"
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

export function OwnerIncomesView() {
    const { incomes, owners, loading, createIncome, updateIncome, deleteIncome } = useOwnerIncomes()
    const { properties } = useProperties()

    const [searchTerm, setSearchTerm] = useState("")
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>("all")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
    const [selectedIncome, setSelectedIncome] = useState<OwnerIncome | undefined>(undefined)

    // Delete confirmation
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [incomeToDelete, setIncomeToDelete] = useState<OwnerIncome | null>(null)

    const filteredIncomes = incomes.filter(income => {
        const matchesSearch = income.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            income.owner?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            income.property?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            income.amount.toString().includes(searchTerm)

        const matchesOwner = selectedOwnerId === "all" || income.owner_id === selectedOwnerId

        return matchesSearch && matchesOwner
    })

    const handleExport = () => {
        const headers = ["Fecha", "Propietario", "Propiedad", "Categoría", "Descripción", "Monto", "Moneda", "Tasa"]
        const csvContent = [
            headers.join(","),
            ...filteredIncomes.map(i => [
                format(new Date(i.date), 'dd/MM/yyyy'),
                `"${i.owner?.name || ''}"`,
                `"${i.property?.name || ''}"`,
                i.category,
                `"${i.description || ''}"`,
                i.amount,
                i.currency || 'USD',
                i.exchange_rate || 1
            ].join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `ingresos_propietarios_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleCreate = () => {
        setDialogMode("create")
        setSelectedIncome(undefined)
        setIsDialogOpen(true)
    }

    const handleEdit = (income: OwnerIncome) => {
        setDialogMode("edit")
        setSelectedIncome(income)
        setIsDialogOpen(true)
    }

    const handleSubmit = async (data: any) => {
        if (dialogMode === 'create') {
            await createIncome(data)
        } else if (selectedIncome) {
            await updateIncome(selectedIncome.id, data)
        }
    }

    const confirmDelete = (income: OwnerIncome) => {
        setIncomeToDelete(income)
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (incomeToDelete) {
            await deleteIncome(incomeToDelete.id)
            setIsDeleteDialogOpen(false)
            setIncomeToDelete(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <div /> {/* Spacer to push buttons to the right */}
                <div className="flex gap-2">
                    <Button color="success" className="bg-green-600 hover:bg-green-700" onClick={handleExport}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar
                    </Button>
                    <Button onClick={handleCreate}>
                        <TrendingUp className="mr-2 h-4 w-4" /> Registrar Ingreso
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium">Historial de Ingresos</CardTitle>
                        <div className="flex gap-2">
                             <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar ingreso..."
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
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredIncomes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No se encontraron ingresos registrados.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Propietario / Inmueble</TableHead>
                                    <TableHead>Concepto</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead className="text-right">Tasa</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredIncomes.map((income) => (
                                    <TableRow key={income.id}>
                                        <TableCell>
                                            {(() => {
                                                if (!income.date) return '-'
                                                const [y, m, d] = income.date.toString().split('T')[0].split('-')
                                                return `${d}/${m}/${y}`
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{income.owner?.name}</div>
                                            {income.property && (
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" />
                                                    {income.property.name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <div className="font-medium">
                                                {income.category}
                                            </div>
                                            {income.description && (
                                                <div className="text-xs text-muted-foreground truncate" title={income.description}>
                                                    {income.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">
                                            <span className="text-xs text-muted-foreground mr-1">
                                                {income.currency === 'VES' ? 'Bs.' : (income.currency || 'USD')}
                                            </span>
                                            {(income.currency === 'USD' || !income.currency) && '$'} {Number(income.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {income.currency === 'USD' ? (income.exchange_rate || '-') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(income)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirmDelete(income)}>
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

            <IncomeDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                income={selectedIncome}
                properties={properties}
                owners={owners}
                onSubmit={handleSubmit}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del ingreso.
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
