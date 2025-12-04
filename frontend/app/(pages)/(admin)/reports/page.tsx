'use client'
import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheet, Printer as PrinterIcon, ArrowLeft, FileText, PieChart, BarChart3, Filter, ChevronsUpDown, Check } from "lucide-react"
import { IncomeExpenseReport } from "@/components/reports/income-expense-report"
import { OperationalReport } from "@/components/reports/operational-report"
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useReactToPrint } from "react-to-print"

// Mock Data
const MOCK_DATA_USD = [
    { date: "07/03/2024", concept: "ANA DEL CARMEN 22 MARCO AURELIO", credit: 40.00, debit: 0, balance: 40.00 },
    { date: "08/03/2024", concept: "DOMINGO COLETTA DI GIACOMO", credit: 20.00, debit: 0, balance: 60.00 },
    { date: "08/03/2024", concept: "MARINA ESTHER MELENDEZ 12 ITALIA", credit: 20.00, debit: 0, balance: 80.00 },
    { date: "11/03/2024", concept: "JEANNETTE MARIA HURTADO 2 ROMANO", credit: 200.00, debit: 0, balance: 280.00 },
    { date: "11/03/2024", concept: "MALEK JOUBAS PB TIBERIO", credit: 500.00, debit: 0, balance: 780.00 },
]

const MOCK_DATA_BS = [
    { date: "01/03/2024", concept: "LUZ MARGOT SALAS 19 DANTE 53328339", credit: 362.00, debit: 0, balance: 362.00, rate: 36.20, incomeUsd: 10.00, balanceUsd: 10.00 },
    { date: "01/03/2024", concept: "53342664 INGRESO NO REPORTADO", credit: 903.75, debit: 0, balance: 1265.75, rate: 36.15, incomeUsd: 25.00, balanceUsd: 35.00 },
    { date: "01/03/2024", concept: "FERNANDO FERNANDEZ 18 MARCO AURELIO 42105629", credit: 723.00, debit: 0, balance: 1988.75, rate: 36.15, incomeUsd: 20.00, balanceUsd: 55.00 },
]

const MOCK_EXPENSES_DATA = [
    { date: "05/03/2024", category: "Mantenimiento", description: "Reparación Ascensor Torre A", amount: 450.00, status: "Pagado" },
    { date: "10/03/2024", category: "Servicios", description: "Pago Electricidad Áreas Comunes", amount: 120.00, status: "Pagado" },
    { date: "15/03/2024", category: "Limpieza", description: "Insumos de Limpieza General", amount: 85.00, status: "Pagado" },
]

const MOCK_OCCUPANCY_DATA = [
    { property: "Res. El Valle", unit: "Apto 101", status: "Ocupado" },
    { property: "Res. El Valle", unit: "Apto 102", status: "Vacante" },
    { property: "Res. El Valle", unit: "Apto 103", status: "Ocupado" },
    { property: "Torre Empresarial", unit: "Oficina 500", status: "Ocupado" },
    { property: "Torre Empresarial", unit: "Oficina 501", status: "Vacante" },
]

const MOCK_DELINQUENCY_DATA = [
    { tenant: "Pedro Sanchez", unit: "REV-204", months: 2, debt: 800.00 },
    { tenant: "Comercializadora Norte", unit: "TE-201", months: 1, debt: 1200.00 },
    { tenant: "Juan Perez", unit: "REV-101", months: 3, debt: 1500.00 },
]

const MOCK_DISTRIBUTION_DATA = [
    { owner: "Juan Pérez", percentage: 60, amount: 1200.00 },
    { owner: "Maria Rodriguez", percentage: 40, amount: 800.00 },
]

const REPORT_TYPES = [
    {
        id: 'income-expense',
        title: 'Ingresos y Egresos',
        description: 'Control detallado de movimientos financieros en USD y BS.',
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
    },
    {
        id: 'occupancy',
        title: 'Reporte de Ocupación',
        description: 'Estado actual de inmuebles (Ocupados vs Vacantes).',
        icon: PieChart,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
    },
    {
        id: 'delinquency',
        title: 'Reporte de Morosidad',
        description: 'Análisis de deuda por inquilino y antigüedad.',
        icon: BarChart3,
        color: 'text-red-600',
        bgColor: 'bg-red-100'
    }
]

const PROPERTIES = [
    { value: "res_el_valle", label: "Residencias El Valle" },
    { value: "torre_emp", label: "Torre Empresarial" },
]

export default function ReportsPage() {
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
    const [isGenerated, setIsGenerated] = useState(false)
    const [filters, setFilters] = useState({
        month: 'MARZO',
        year: '2024',
        properties: [] as string[]
    })
    const [openPropertySelect, setOpenPropertySelect] = useState(false)

    const componentRef = useRef<HTMLDivElement>(null)

    const handlePrintReport = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Reporte_${selectedReportId}_${filters.month}_${filters.year}`,
    })

    const handleSelectReport = (id: string) => {
        setSelectedReportId(id)
        setIsGenerated(false)
    }

    const handleGenerate = () => {
        setIsGenerated(true)
    }

    const handleBackToSelection = () => {
        setSelectedReportId(null)
        setIsGenerated(false)
    }

    const handleBackToFilters = () => {
        setIsGenerated(false)
    }

    const handleDownloadExcel = () => {
        toast.success("Descarga iniciada (Simulación)")
    }

    const toggleProperty = (value: string) => {
        setFilters(prev => {
            const current = prev.properties
            if (current.includes(value)) {
                return { ...prev, properties: current.filter(p => p !== value) }
            } else {
                return { ...prev, properties: [...current, value] }
            }
        })
    }

    const toggleAllProperties = () => {
        setFilters(prev => {
            if (prev.properties.length === PROPERTIES.length) {
                return { ...prev, properties: [] }
            } else {
                return { ...prev, properties: PROPERTIES.map(p => p.value) }
            }
        })
    }

    const selectedReport = REPORT_TYPES.find(r => r.id === selectedReportId)

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Generador de Reportes</h1>
                    <p className="text-muted-foreground">
                        Seleccione un tipo de reporte y aplique filtros para generar la información.
                    </p>
                </div>
                {selectedReportId && (
                    <Button variant="outline" onClick={handleBackToSelection}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Catálogo
                    </Button>
                )}
            </div>

            {/* STEP 1: REPORT SELECTION */}
            {!selectedReportId && (
                <div className="grid gap-6 md:grid-cols-3">
                    {REPORT_TYPES.map((report) => (
                        <Card
                            key={report.id}
                            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
                            onClick={() => handleSelectReport(report.id)}
                        >
                            <CardHeader>
                                <div className={`w-12 h-12 rounded-lg ${report.bgColor} flex items-center justify-center mb-4`}>
                                    <report.icon className={`h-6 w-6 ${report.color}`} />
                                </div>
                                <CardTitle>{report.title}</CardTitle>
                                <CardDescription>{report.description}</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button variant="ghost" className="w-full justify-start p-0 text-primary">
                                    Seleccionar Reporte &rarr;
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* STEP 2: FILTERS & CONFIGURATION */}
            {selectedReportId && !isGenerated && (
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-md ${selectedReport?.bgColor}`}>
                                    {selectedReport && <selectedReport.icon className={`h-5 w-5 ${selectedReport.color}`} />}
                                </div>
                                <div>
                                    <CardTitle>Configurar: {selectedReport?.title}</CardTitle>
                                    <CardDescription>Defina los parámetros para generar el reporte.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mes</Label>
                                    <Select value={filters.month} onValueChange={(v) => setFilters({ ...filters, month: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione mes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ENERO">Enero</SelectItem>
                                            <SelectItem value="FEBRERO">Febrero</SelectItem>
                                            <SelectItem value="MARZO">Marzo</SelectItem>
                                            <SelectItem value="ABRIL">Abril</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Año</Label>
                                    <Select value={filters.year} onValueChange={(v) => setFilters({ ...filters, year: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione año" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2023">2023</SelectItem>
                                            <SelectItem value="2024">2024</SelectItem>
                                            <SelectItem value="2025">2025</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Propiedad / Edificio</Label>
                                <Popover open={openPropertySelect} onOpenChange={setOpenPropertySelect}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openPropertySelect}
                                            className="w-full justify-between"
                                        >
                                            {filters.properties.length === 0
                                                ? "Seleccionar propiedades..."
                                                : filters.properties.length === PROPERTIES.length
                                                    ? "Todas las Propiedades"
                                                    : `${filters.properties.length} seleccionada(s)`}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar propiedad..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontraron propiedades.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={toggleAllProperties}
                                                        className="font-medium"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                filters.properties.length === PROPERTIES.length
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        Todas las Propiedades
                                                    </CommandItem>
                                                    {PROPERTIES.map((property) => (
                                                        <CommandItem
                                                            key={property.value}
                                                            value={property.value}
                                                            onSelect={() => toggleProperty(property.value)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    filters.properties.includes(property.value)
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {property.label}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="bg-muted/50 p-4 rounded-md flex items-start gap-3">
                                <Filter className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="text-sm text-muted-foreground">
                                    <p>Se generará el reporte con los siguientes criterios:</p>
                                    <ul className="list-disc list-inside mt-1">
                                        <li>Periodo: <strong>{filters.month} {filters.year}</strong></li>
                                        <li>Alcance: <strong>
                                            {filters.properties.length === 0
                                                ? "Ninguna seleccionada"
                                                : filters.properties.length === PROPERTIES.length
                                                    ? "Todas las Propiedades"
                                                    : filters.properties.map(p => PROPERTIES.find(prop => prop.value === p)?.label).join(", ")}
                                        </strong></li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={handleBackToSelection}>Cancelar</Button>
                            <Button onClick={handleGenerate} className="w-1/3" disabled={filters.properties.length === 0}>
                                <FileText className="mr-2 h-4 w-4" /> Generar Reporte
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* STEP 3: REPORT VIEW */}
            {selectedReportId && isGenerated && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={handleBackToFilters}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Configuración
                            </Button>
                            <div className="h-4 w-px bg-border" />
                            <div className="text-sm">
                                <span className="text-muted-foreground">Reporte:</span> <strong>{selectedReport?.title}</strong>
                                <span className="mx-2 text-muted-foreground">|</span>
                                <span className="text-muted-foreground">Periodo:</span> <strong>{filters.month} {filters.year}</strong>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                            </Button>
                            <Button size="sm" onClick={() => handlePrintReport()}>
                                <PrinterIcon className="mr-2 h-4 w-4" /> Imprimir / PDF
                            </Button>
                        </div>
                    </div>

                    <div className="border rounded-md overflow-auto bg-white shadow-sm min-h-[600px]">
                        <div className="min-w-[800px]">
                            {selectedReportId === 'income-expense' && (
                                <IncomeExpenseReport
                                    ref={componentRef}
                                    month={filters.month}
                                    year={filters.year}
                                    dataUsd={MOCK_DATA_USD}
                                    dataBs={MOCK_DATA_BS}
                                    dataExpenses={MOCK_EXPENSES_DATA}
                                    dataDistribution={MOCK_DISTRIBUTION_DATA}
                                />
                            )}
                            {selectedReportId === 'occupancy' && (
                                <OperationalReport
                                    ref={componentRef}
                                    type="occupancy"
                                    data={MOCK_OCCUPANCY_DATA}
                                />
                            )}
                            {selectedReportId === 'delinquency' && (
                                <OperationalReport
                                    ref={componentRef}
                                    type="delinquency"
                                    data={MOCK_DELINQUENCY_DATA}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
