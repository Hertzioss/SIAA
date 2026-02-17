'use client'
import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheet, Printer as PrinterIcon, ArrowLeft, FileText, PieChart, BarChart3, Filter, ChevronsUpDown, Check, Wrench, TrendingUp, Users, UserCheck } from "lucide-react"
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
import { useOwners } from "@/hooks/use-owners"

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
    },
    {
        id: 'owners',
        title: 'Estado de Cuenta Propietarios',
        description: 'Ingresos, egresos y balance neto por propietario.',
        icon: Users,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100'
    },
    {
        id: 'tenant-statement',
        title: 'Estado de Cuenta Inquilinos',
        description: 'Estado de cuenta individual con cargos, pagos y saldo por inquilino.',
        icon: UserCheck,
        color: 'text-teal-600',
        bgColor: 'bg-teal-100'
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
const formatPeriod = (months: string[], year: string) => {
    if (months.length === 0) return `${year}`
    if (months.length === ALL_MONTHS.length) return `${year} : Año Completo`

    // Sort months based on ALL_MONTHS order
    const sorted = [...months].sort((a, b) => ALL_MONTHS.indexOf(a) - ALL_MONTHS.indexOf(b))

    // Check for continuity
    let isContiguous = true
    if (sorted.length > 1) {
        for (let i = 0; i < sorted.length - 1; i++) {
            if (ALL_MONTHS.indexOf(sorted[i + 1]) !== ALL_MONTHS.indexOf(sorted[i]) + 1) {
                isContiguous = false
                break
            }
        }
    }

    if (isContiguous && sorted.length > 1) {
        return `${year} : Desde ${sorted[0]} Hasta: ${sorted[sorted.length - 1]}`
    }

    // Single month or non-contiguous
    return `${year} : ${sorted.join(", ")}`
}

export default function ReportsPage() {
    const { fetchIncomeExpense, fetchOccupancy, fetchDelinquency, fetchMaintenance, fetchPropertyPerformance, isLoading } = useReports()
    const { properties, loading: isLoadingProperties } = useProperties()
    const { owners, loading: isLoadingOwners } = useOwners()

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
        properties: [] as string[],
        owners: [] as string[]
    })
    const [openPropertySelect, setOpenPropertySelect] = useState(false)
    const [openOwnerSelect, setOpenOwnerSelect] = useState(false)
    const [openMonthSelect, setOpenMonthSelect] = useState(false)

    const componentRef = useRef<HTMLDivElement>(null)

    const handlePrintReport = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Reporte_${selectedReportId}_${filters.year}`,
    })

    // Derived state for properties based on selected owners
    const selectableProperties = useMemo(() => {
        if (filters.owners.length === 0) return properties

        const selectedOwnersData = owners.filter(o => filters.owners.includes(o.id))
        const ownerPropertyIds = new Set<string>()

        selectedOwnersData.forEach(o => {
            o.properties?.forEach(p => ownerPropertyIds.add(p.id))
        })

        return properties.filter(p => ownerPropertyIds.has(p.id))
    }, [filters.owners, owners, properties])

    const router = useRouter()

    const handleSelectReport = (id: string) => {
        if (id === 'owners') {
            router.push('/reports/owners')
            return
        }
        if (id === 'tenant-statement') {
            router.push('/reports/tenants')
            return
        }
        setSelectedReportId(id)
        setIsGenerated(false)
        setIncomeExpenseData(null)
        setOperationalData(null)
        setMaintenanceData(null)
        setPerformanceData(null)
        // Default to current month if needed or keep default
    }

    const handleGenerate = async () => {
        // Calculate impactful properties based on filters
        let propertiesToFetch = filters.properties

        // If owners are selected, we must filter properties to ONLY those belonging to selected owners
        if (filters.owners.length > 0) {
            // 1. Get all properties from selected owners
            const selectedOwnersData = owners.filter(o => filters.owners.includes(o.id))
            const ownerPropertyIds = new Set<string>()
            
            selectedOwnersData.forEach(o => {
                o.properties?.forEach(p => ownerPropertyIds.add(p.id))
            })

            // 2. Logic:
            // - If NO specific properties selected, use ALL properties from these owners.
            // - If specific properties SELECTED, use INTERSECTION (selected properties that belong to these owners).
            
            if (propertiesToFetch.length === 0) {
                propertiesToFetch = Array.from(ownerPropertyIds)
            } else {
                propertiesToFetch = propertiesToFetch.filter(pid => ownerPropertyIds.has(pid))
            }
        }

        if (selectedReportId === 'income-expense') {
            const data = await fetchIncomeExpense(filters.months, filters.year, propertiesToFetch)
            setIncomeExpenseData(data)
        } else if (selectedReportId === 'occupancy') {
            const data = await fetchOccupancy(propertiesToFetch)
            setOperationalData(data)
        } else if (selectedReportId === 'delinquency') {
            const data = await fetchDelinquency(propertiesToFetch)
            setOperationalData(data)
        } else if (selectedReportId === 'maintenance') {
            const data = await fetchMaintenance(propertiesToFetch)
            setMaintenanceData(data)
        } else if (selectedReportId === 'performance') {
            const data = await fetchPropertyPerformance(propertiesToFetch)
            setPerformanceData(data)
        }

        setIsGenerated(true)
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
            // Check if all *selectable* properties are already selected
            const allSelectableIds = selectableProperties.map(p => p.id)
            const areAllSelected = allSelectableIds.every(id => prev.properties.includes(id)) && allSelectableIds.length > 0
            
            if (areAllSelected) {
                // Deselect all selectable properties
                return { ...prev, properties: prev.properties.filter(id => !allSelectableIds.includes(id)) }
            } else {
                // Select all selectable properties (avoid duplicates)
                const newSelection = Array.from(new Set([...prev.properties, ...allSelectableIds]))
                return { ...prev, properties: newSelection }
            }
        })
    }

    const toggleOwner = (value: string) => {
        setFilters(prev => {
            const current = prev.owners
            if (current.includes(value)) {
                return { ...prev, owners: current.filter(o => o !== value) }
            } else {
                return { ...prev, owners: [...current, value] }
            }
        })
    }

    const toggleAllOwners = () => {
        setFilters(prev => {
            if (prev.owners.length === owners.length) {
                return { ...prev, owners: [] }
            } else {
                return { ...prev, owners: owners.map(o => o.id) }
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
                                            <SelectItem value="2022">2022</SelectItem>
                                            <SelectItem value="2023">2023</SelectItem>
                                            <SelectItem value="2024">2024</SelectItem>
                                            <SelectItem value="2025">2025</SelectItem>
                                            <SelectItem value="2026">2026</SelectItem>
                                            <SelectItem value="2027">2027</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            {/* OWNER SELECTOR */}
                            <div className="space-y-2">
                                <Label>Propietario(s) (Opcional)</Label>
                                <Popover open={openOwnerSelect} onOpenChange={setOpenOwnerSelect}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openOwnerSelect}
                                            className="w-full justify-between"
                                        >
                                            {filters.owners.length === 0
                                                ? "Todos (Sin filtro)"
                                                : filters.owners.length === owners.length
                                                    ? "Todos los Propietarios"
                                                    : `${filters.owners.length} seleccionado(s)`}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar propietario..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontraron propietarios.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={toggleAllOwners}
                                                        className="font-medium"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                filters.owners.length === owners.length
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        Todos los Propietarios
                                                    </CommandItem>
                                                    {owners.map((owner) => (
                                                        <CommandItem
                                                            key={owner.id}
                                                            value={owner.id}
                                                            onSelect={() => toggleOwner(owner.id)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    filters.owners.includes(owner.id)
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
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
                                                : filters.properties.length === selectableProperties.length
                                                    ? "Todas las Propiedades (Filtradas)"
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
                                                                filters.properties.length === selectableProperties.length && selectableProperties.length > 0
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        Todas las Propiedades
                                                    </CommandItem>
                                                    {selectableProperties.map((property) => (
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
                                            {formatPeriod(filters.months, filters.year)}
                                        </strong></li>
                                        <li>Alcance: <strong>
                                            {filters.properties.length === 0
                                                ? "Ninguna seleccionada (Todas las disponibles)"
                                                : filters.properties.length === properties.length
                                                    ? "Todas las Propiedades"
                                                    : `${filters.properties.length} propiedades seleccionadas`}
                                        </strong></li>
                                        {filters.owners.length > 0 && (
                                            <li>Filtro Propietarios: <strong>
                                                {filters.owners.length === owners.length
                                                    ? "Todos"
                                                    : `${filters.owners.length} seleccionados`}
                                            </strong></li>
                                        )}
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
                                <span className="text-muted-foreground">Periodo:</span> <strong>{formatPeriod(filters.months, filters.year)}</strong>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                            </Button>
                            <Button size="sm" onClick={() => handlePrintReport()} disabled={isLoading}>
                                <PrinterIcon className="mr-2 h-4 w-4" /> Imprimir / PDF
                            </Button>
                        </div>
                    </div>

                    <div className="border rounded-md overflow-auto bg-white shadow-sm min-h-[600px]">
                        <div className="min-w-[800px]">
                            {selectedReportId === 'income-expense' && incomeExpenseData && (
                                <IncomeExpenseReport
                                    ref={componentRef}
                                    month={formatPeriod(filters.months, filters.year)}
                                    year=""
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
                                    period={formatPeriod(filters.months, filters.year)}
                                />
                            )}
                            {selectedReportId === 'delinquency' && operationalData && (
                                <OperationalReport
                                    ref={componentRef}
                                    type="delinquency"
                                    data={operationalData}
                                    period={formatPeriod(filters.months, filters.year)}
                                />
                            )}
                            {selectedReportId === 'maintenance' && maintenanceData && (
                                <MaintenanceReport
                                    ref={componentRef}
                                    data={maintenanceData}
                                    period={formatPeriod(filters.months, filters.year)}
                                />
                            )}
                            {selectedReportId === 'performance' && performanceData && (
                                <PropertyPerformanceReport
                                    ref={componentRef}
                                    data={performanceData}
                                    period={formatPeriod(filters.months, filters.year)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
