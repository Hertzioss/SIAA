"use client"

import { useState } from "react"
import { useOwnerReport, OwnerReportItem } from "@/hooks/use-owner-report"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Download, Loader2, Filter, Eye } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import * as XLSX from 'xlsx'
import { toast } from "sonner"
// import { DateRange } from "react-day-picker" // Assuming standard shadcn usage
// Re-implementing simplified date picker logic as standard DayPicker might need component

export default function OwnerReportPage() {
    const { reportData, loading, ownersList, filters, setFilters, generateReport } = useOwnerReport()
    const [selectedOwner, setSelectedOwner] = useState<OwnerReportItem | null>(null)

    // Helper for formatting currency
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount)
    }

    const totalIncome = reportData.reduce((acc, curr) => acc + curr.totalIncome, 0)
    const totalExpenses = reportData.reduce((acc, curr) => acc + curr.totalExpenses, 0)
    const netTotal = totalIncome - totalExpenses

    const handleExport = () => {
        try {
            if (reportData.length === 0) {
                toast.error("No hay datos para exportar")
                return
            }

            // Transform data for Excel
            const exportData = reportData.map(item => ({
                "Propietario": item.ownerName,
                "Documento": item.ownerDocId,
                "Propiedades": item.propertyCount,
                "Ingresos (USD)": item.totalIncome,
                "Egresos (USD)": item.totalExpenses,
                "Balance Neto (USD)": item.netBalance
            }))

            const detailData = reportData.flatMap(owner =>
                owner.payments.map(p => ({
                    "Propietario": owner.ownerName,
                    "Fecha": p.date,
                    "Inquilino": p.tenantName,
                    "Unidad": p.unitName,
                    "Método": p.method,
                    "Monto (Cuota)": p.amount
                }))
            )

            // Create Worksheet
            const wsSummary = XLSX.utils.json_to_sheet(exportData)
            const wsDetail = XLSX.utils.json_to_sheet(detailData)

            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen")
            XLSX.utils.book_append_sheet(wb, wsDetail, "Detalles")

            // Generate File Name
            const fileName = `Reporte_Propietarios_${format(filters.startDate, "yyyy-MM-dd")}_${format(filters.endDate, "yyyy-MM-dd")}.xlsx`

            // Download
            XLSX.writeFile(wb, fileName)
            toast.success("Reporte exportado exitosamente")
        } catch (error) {
            console.error("Export error:", error)
            toast.error("Error al exportar reporte")
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reporte Financiero por Propietario</h1>
                    <p className="text-muted-foreground">Resumen de ingresos y egresos distribuidos por propiedad.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => generateReport()}>
                        <Filter className="mr-2 h-4 w-4" /> Actualizar
                    </Button>
                    <Button variant="default" onClick={handleExport} disabled={loading || reportData.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Exportar
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">Desde</label>
                        <Input
                            type="date"
                            value={format(filters.startDate, "yyyy-MM-dd")}
                            onChange={(e) => e.target.value && setFilters(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                        />
                    </div>
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">Hasta</label>
                        <Input
                            type="date"
                            value={format(filters.endDate, "yyyy-MM-dd")}
                            onChange={(e) => e.target.value && setFilters(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                        />
                    </div>
                    <div className="space-y-2 flex-1 min-w-[200px]">
                        <label className="text-sm font-medium">Propietario</label>
                        <Select
                            value={filters.ownerIds[0] || "all"}
                            onValueChange={(val) => setFilters(prev => ({ ...prev, ownerIds: val === "all" ? [] : [val] }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todos los propietarios" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {ownersList.map(owner => (
                                    <SelectItem key={owner.id} value={owner.id}>
                                        {owner.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatMoney(totalIncome)}</div>
                        <p className="text-xs text-muted-foreground">En el periodo seleccionado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Egresos Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatMoney(totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground">Gastos de propiedades asociadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", netTotal >= 0 ? "text-blue-600" : "text-yellow-600")}>
                            {formatMoney(netTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground">Utilidad estimada</p>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Tabs defaultValue="summary" className="w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Detalle por Propietario</h2>
                    <TabsList>
                        <TabsTrigger value="summary">Resumen</TabsTrigger>
                        <TabsTrigger value="detail">Detalle Completo</TabsTrigger>
                    </TabsList>
                </div>

                {/* SUMMARY VIEW */}
                <TabsContent value="summary">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resumen por Propietario</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Propietario</TableHead>
                                        <TableHead>Documento</TableHead>
                                        <TableHead className="text-center">Propiedades</TableHead>
                                        <TableHead className="text-right">Ingresos</TableHead>
                                        <TableHead className="text-right">Egresos</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="text-center">Detalle</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : reportData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                No se encontraron registros en este periodo.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        reportData.map((item) => (
                                            <TableRow key={item.ownerId}>
                                                <TableCell className="font-medium">{item.ownerName}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{item.ownerDocId}</TableCell>
                                                <TableCell className="text-center">{item.propertyCount}</TableCell>
                                                <TableCell className="text-right text-green-600 font-medium">
                                                    {formatMoney(item.totalIncome)}
                                                </TableCell>
                                                <TableCell className="text-right text-red-600 font-medium">
                                                    {formatMoney(item.totalExpenses)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {formatMoney(item.netBalance)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedOwner(item)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DETAIL VIEW */}
                <TabsContent value="detail">
                    <Card>
                        <CardHeader>
                            <CardTitle>Listado Detallado de Pagos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Propietario</TableHead>
                                        <TableHead>Inquilino</TableHead>
                                        <TableHead>Unidad</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead className="text-right">Monto (Cuota)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : reportData.flatMap(o => o.payments).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                No se encontraron pagos en este periodo.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        reportData.flatMap(owner =>
                                            owner.payments.map((payment, idx) => ({ ...payment, ownerName: owner.ownerName, uniqueKey: `${owner.ownerId}-${idx}` }))
                                        ).map((item) => (
                                            <TableRow key={item.uniqueKey}>
                                                <TableCell>{item.date}</TableCell>
                                                <TableCell className="font-medium">{item.ownerName}</TableCell>
                                                <TableCell>{item.tenantName}</TableCell>
                                                <TableCell>{item.unitName}</TableCell>
                                                <TableCell className="capitalize">{item.method.replace('_', ' ')}</TableCell>
                                                <TableCell className="text-right font-medium">{formatMoney(item.amount)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedOwner} onOpenChange={(open) => !open && setSelectedOwner(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalle de Ingresos - {selectedOwner?.ownerName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Inquilino</TableHead>
                                    <TableHead>Unidad</TableHead>
                                    <TableHead>Método</TableHead>
                                    <TableHead className="text-right">Monto (Cuota)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedOwner?.payments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">No hay pagos registrados.</TableCell>
                                    </TableRow>
                                ) : (
                                    selectedOwner?.payments.map((p, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{p.date}</TableCell>
                                            <TableCell>{p.tenantName}</TableCell>
                                            <TableCell>{p.unitName}</TableCell>
                                            <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                                            <TableCell className="text-right font-medium">{formatMoney(p.amount)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
