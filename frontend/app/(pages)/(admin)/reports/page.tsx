'use client'
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheet, Printer as PrinterIcon, ArrowLeft, FileText, PieChart, BarChart3, Filter, ChevronsUpDown, Check, Wrench, TrendingUp } from "lucide-react"
import { IncomeExpenseReport } from "@/components/reports/income-expense-report"
import { OperationalReport } from "@/components/reports/operational-report"
import { MaintenanceReport } from "@/components/reports/maintenance-report"
import { PropertyPerformanceReport } from "@/components/reports/property-performance-report"
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useReactToPrint } from "react-to-print"
import { useReports, IncomeExpenseData, OperationalData } from "@/hooks/use-reports"
import { useProperties } from "@/hooks/use-properties"

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
    },
    {
        id: 'maintenance',
        title: 'Reporte de Mantenimiento',
        description: 'Gestión de solicitudes y estado de reparaciones.',
        icon: Wrench,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
    },
    {
        id: 'performance',
        title: 'Rendimiento por Propiedad',
        description: 'Comparativa financiera de ingresos vs egresos.',
        icon: TrendingUp,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
    }
]

const ALL_MONTHS = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
]

/**
 * Generador de reportes del sistema.
 * Permite seleccionar tipo de reporte (Financiero, Ocupación, etc.), aplicar filtros
 * y generar vistas previas o descargas en PDF/Excel.
 */
export default function ReportsPage() {
    const { fetchIncomeExpense, fetchOccupancy, fetchDelinquency, fetchMaintenance, fetchPropertyPerformance, isLoading } = useReports()
    const { properties, loading: isLoadingProperties } = useProperties()

    // State for Report Data
    const [incomeExpenseData, setIncomeExpenseData] = useState<IncomeExpenseData | null>(null)
    const [operationalData, setOperationalData] = useState<any[] | null>(null)
    const [maintenanceData, setMaintenanceData] = useState<any[] | null>(null)
    const [performanceData, setPerformanceData] = useState<any[] | null>(null)

    const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
    const [isGenerated, setIsGenerated] = useState(false)
    const [filters, setFilters] = useState({
        months: ['MARZO'] as string[],
        year: '2024',
        properties: [] as string[]
    })
    const [openPropertySelect, setOpenPropertySelect] = useState(false)
    const [openMonthSelect, setOpenMonthSelect] = useState(false)

    const componentRef = useRef<HTMLDivElement>(null)

    const handlePrintReport = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Reporte_${selectedReportId}_${filters.year}`,
    })

    const handleSelectReport = (id: string) => {
        setSelectedReportId(id)
        setIsGenerated(false)
        setIncomeExpenseData(null)
        setOperationalData(null)
        setMaintenanceData(null)
        setPerformanceData(null)
        // Default to current month if needed or keep default
    }

    const handleGenerate = async () => {
        setIsGenerated(true)
        if (selectedReportId === 'income-expense') {
            const data = await fetchIncomeExpense(filters.months, filters.year, filters.properties)
            setIncomeExpenseData(data)
        } else if (selectedReportId === 'occupancy') {
            const data = await fetchOccupancy(filters.properties)
            setOperationalData(data)
        } else if (selectedReportId === 'delinquency') {
            const data = await fetchDelinquency(filters.properties)
            setOperationalData(data)
        } else if (selectedReportId === 'maintenance') {
            const data = await fetchMaintenance(filters.properties)
            setMaintenanceData(data)
        } else if (selectedReportId === 'performance') {
            const data = await fetchPropertyPerformance(filters.properties)
            setPerformanceData(data)
        }
    }

    const handleBackToSelection = () => {
        setSelectedReportId(null)
        setIsGenerated(false)
        setIncomeExpenseData(null)
        setOperationalData(null)
        setMaintenanceData(null)
        setPerformanceData(null)
    }

    const handleBackToFilters = () => {
        setIsGenerated(false)
        setIncomeExpenseData(null)
        setOperationalData(null)
        setMaintenanceData(null)
        setPerformanceData(null)
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
            if (prev.properties.length === properties.length) {
                return { ...prev, properties: [] }
            } else {
                return { ...prev, properties: properties.map(p => p.id) }
            }
        })
    }

    const toggleMonth = (value: string) => {
        setFilters(prev => {
            const current = prev.months
            if (current.includes(value)) {
                // Prevent deselecting all? Let's verify logic in hook handles empty array gracefully or alert
                return { ...prev, months: current.filter(m => m !== value) }
            } else {
                return { ...prev, months: [...current, value] }
            }
        })
    }

    const toggleAllMonths = () => {
        setFilters(prev => {
            if (prev.months.length === ALL_MONTHS.length) {
                return { ...prev, months: [] }
            } else {
                return { ...prev, months: [...ALL_MONTHS] }
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
                                    <Label>Meses</Label>
                                    <Popover open={openMonthSelect} onOpenChange={setOpenMonthSelect}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openMonthSelect}
                                                className="w-full justify-between"
                                            >
                                                {filters.months.length === 0
                                                    ? "Seleccionar mes(es)..."
                                                    : filters.months.length === ALL_MONTHS.length
                                                        ? "Todo el Año"
                                                        : `${filters.months.length} mes(es)`}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar mes..." />
                                                <CommandList>
                                                    <CommandEmpty>No encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            onSelect={toggleAllMonths}
                                                            className="font-medium"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    filters.months.length === ALL_MONTHS.length
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            Todo el Año
                                                        </CommandItem>
                                                        {ALL_MONTHS.map((month) => (
                                                            <CommandItem
                                                                key={month}
                                                                value={month}
                                                                onSelect={() => toggleMonth(month)}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        filters.months.includes(month)
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                {month}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
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
                                                : filters.properties.length === properties.length
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
                                                                filters.properties.length === properties.length
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        Todas las Propiedades
                                                    </CommandItem>
                                                    {properties.map((property) => (
                                                        <CommandItem
                                                            key={property.id}
                                                            value={property.id}
                                                            onSelect={() => toggleProperty(property.id)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    filters.properties.includes(property.id)
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {property.name}
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
                                        <li>Periodo: <strong>
                                            {filters.months.length === ALL_MONTHS.length
                                                ? "Todo el Año"
                                                : filters.months.join(", ")}
                                            {` ${filters.year}`}
                                        </strong></li>
                                        <li>Alcance: <strong>
                                            {filters.properties.length === 0
                                                ? "Ninguna seleccionada"
                                                : filters.properties.length === properties.length
                                                    ? "Todas las Propiedades"
                                                    : `${filters.properties.length} propiedades seleccionadas`}
                                        </strong></li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={handleBackToSelection}>Cancelar</Button>
                            <Button onClick={handleGenerate} className="w-1/3" disabled={isLoading}>
                                {isLoading ? "Generando..." : <><FileText className="mr-2 h-4 w-4" /> Generar Reporte</>}
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
                                <span className="text-muted-foreground">Periodo:</span> <strong>{filters.months.join(", ")} {filters.year}</strong>
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
                            {selectedReportId === 'income-expense' && incomeExpenseData && (
                                <IncomeExpenseReport
                                    ref={componentRef}
                                    month={filters.months.join("-")} // Prop rename? Or update component to handle string?
                                    // Component expects string, join is fine for now for title mostly
                                    year={filters.year}
                                    dataUsd={incomeExpenseData.dataUsd}
                                    dataBs={incomeExpenseData.dataBs}
                                    dataExpenses={incomeExpenseData.dataExpenses}
                                    dataDistribution={incomeExpenseData.dataDistribution}
                                />
                            )}
                            {selectedReportId === 'occupancy' && operationalData && (
                                <OperationalReport
                                    ref={componentRef}
                                    type="occupancy"
                                    data={operationalData}
                                // We might want to pass context (filters)?
                                />
                            )}
                            {selectedReportId === 'delinquency' && operationalData && (
                                <OperationalReport
                                    ref={componentRef}
                                    type="delinquency"
                                    data={operationalData}
                                />
                            )}
                            {selectedReportId === 'maintenance' && maintenanceData && (
                                <MaintenanceReport
                                    ref={componentRef}
                                    data={maintenanceData}
                                />
                            )}
                            {selectedReportId === 'performance' && performanceData && (
                                <PropertyPerformanceReport
                                    ref={componentRef}
                                    data={performanceData}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
