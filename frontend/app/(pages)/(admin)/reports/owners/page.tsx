"use client"

import { useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useOwnerReport } from "@/hooks/use-owner-report"
import { OwnerFinancialReport } from "@/components/reports/owner-financial-report"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ArrowLeft, FileBarChart, Download, Loader2, Check, ChevronsUpDown, Printer, Mail } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import { useReactToPrint } from "react-to-print"

import { useProperties } from "@/hooks/use-properties"
import { useOwners } from "@/hooks/use-owners"

export default function OwnerReportPage() {
    const router = useRouter()
    const { reportData, loading, ownersList, filters, setFilters, generateReport, sendReportEmail } = useOwnerReport()
    const { properties } = useProperties()
    const { owners } = useOwners()
    const [reportGenerated, setReportGenerated] = useState(false)
    const [openOwnerSelect, setOpenOwnerSelect] = useState(false)
    const [openPropertySelect, setOpenPropertySelect] = useState(false)
    const componentRef = useRef<HTMLDivElement>(null)
    const [showEmailDialog, setShowEmailDialog] = useState(false)
    const [sendingEmail, setSendingEmail] = useState(false)

    const handleGenerate = async () => {
        await generateReport()
        setReportGenerated(true)
    }

    const handleBackToFilters = () => {
        setReportGenerated(false)
    }

    // Derived state for selectable properties
    const selectableProperties = useMemo(() => {
        if (filters.ownerIds.length === 0) return properties

        const selectedOwnersData = owners.filter(o => filters.ownerIds.includes(o.id))
        const ownerPropertyIds = new Set<string>()

        selectedOwnersData.forEach(o => {
            o.properties?.forEach(p => ownerPropertyIds.add(p.id))
        })

        return properties.filter(p => ownerPropertyIds.has(p.id))
    }, [filters.ownerIds, owners, properties])

    const toggleOwner = (value: string) => {
        setFilters(prev => {
            const current = prev.ownerIds
            if (current.includes(value)) {
                return { ...prev, ownerIds: current.filter(o => o !== value) }
            } else {
                return { ...prev, ownerIds: [...current, value] }
            }
        })
    }

    const toggleAllOwners = () => {
        setFilters(prev => {
            if (prev.ownerIds.length === owners.length) {
                return { ...prev, ownerIds: [] }
            } else {
                return { ...prev, ownerIds: owners.map(o => o.id) }
            }
        })
    }

    const toggleProperty = (value: string) => {
        setFilters(prev => {
            const current = prev.propertyIds || []
            if (current.includes(value)) {
                return { ...prev, propertyIds: current.filter(p => p !== value) }
            } else {
                return { ...prev, propertyIds: [...current, value] }
            }
        })
    }

    const toggleAllProperties = () => {
        setFilters(prev => {
            const current = prev.propertyIds || []
            const allSelectableIds = selectableProperties.map(p => p.id)
            const areAllSelected = allSelectableIds.every(id => current.includes(id)) && allSelectableIds.length > 0

            if (areAllSelected) {
                return { ...prev, propertyIds: current.filter(id => !allSelectableIds.includes(id)) }
            } else {
                const newSelection = Array.from(new Set([...current, ...allSelectableIds]))
                return { ...prev, propertyIds: newSelection }
            }
        })
    }

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Reporte_Propietarios_${format(filters.startDate, "yyyy-MM-dd")}_${format(filters.endDate, "yyyy-MM-dd")}`
    })

    const handleExport = () => {
        try {
            if (reportData.length === 0) {
                toast.error("No hay datos para exportar")
                return
            }

            const exportData = reportData.map(item => ({
                "Propietario": item.ownerName,
                "Documento": item.ownerDocId,
                "Propiedades": item.propertyCount,
                "Ingresos ($)": item.totalIncomeUsd,
                "Ingresos (Bs)": item.totalIncomeBs,
                "Egresos ($)": item.totalExpensesUsd,
                "Egresos (Bs)": item.totalExpensesBs,
                "Balance Neto ($)": item.netBalanceUsd,
                "Balance Neto (Bs)": item.netBalanceBs
            }))

            const paymentsData = reportData.flatMap(owner =>
                (owner.payments || []).map(p => ({
                    "Tipo": "Ingreso",
                    "Fecha": p.date,
                    "Propietario": owner.ownerName,
                    "Inquilino": p.tenantName,
                    "Unidad": p.unitName,
                    "Concepto": `Pago - ${p.method}`,
                    "Monto Original": p.amountOriginal,
                    "Moneda Original": p.currency,
                    "Tasa": p.exchangeRate,
                    "Monto (Bs)": p.amount
                }))
            )

            const expensesData = reportData.flatMap(owner =>
                (owner.expenses || []).map(e => ({
                    "Tipo": "Egreso",
                    "Fecha": e.date,
                    "Propietario": owner.ownerName,
                    "Inquilino": "-",
                    "Unidad": "-",
                    "Concepto": e.description || e.category,
                    "Monto Original": e.amountOriginal,
                    "Moneda Original": e.currency,
                    "Tasa": e.exchangeRate,
                    "Monto (Bs)": e.amount
                }))
            )

            const combinedDetail = [...paymentsData, ...expensesData].sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime())

            const wsSummary = XLSX.utils.json_to_sheet(exportData)
            const wsDetail = XLSX.utils.json_to_sheet(combinedDetail)

            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen")
            XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle Completo")

            const fileName = `Reporte_Propietarios_${format(filters.startDate, "yyyy-MM-dd")}_${format(filters.endDate, "yyyy-MM-dd")}.xlsx`
            XLSX.writeFile(wb, fileName)
            toast.success("Reporte exportado con éxito (Resumen y Detalles)")
        } catch (error) {
            console.error("Export error:", error)
            toast.error("Error al exportar reporte")
        }
    }

    const periodLabel = `${format(filters.startDate, "dd/MM/yyyy")} - ${format(filters.endDate, "dd/MM/yyyy")}`

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/reports')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reporte Financiero por Propietario</h1>
                    <p className="text-muted-foreground">Resumen de ingresos y egresos distribuidos por propiedad.</p>
                </div>
            </div>

            {/* STEP 1: Filter Card */}
            {!reportGenerated && (
                <Card className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Desde</label>
                                <Input
                                    type="date"
                                    value={format(filters.startDate, "yyyy-MM-dd")}
                                    onChange={(e) => e.target.value && setFilters(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Hasta</label>
                                <Input
                                    type="date"
                                    value={format(filters.endDate, "yyyy-MM-dd")}
                                    onChange={(e) => e.target.value && setFilters(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Owner Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Propietarios</label>
                                <Popover open={openOwnerSelect} onOpenChange={setOpenOwnerSelect}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={openOwnerSelect} className="w-full justify-between">
                                            {filters.ownerIds.length === 0
                                                ? "Todos"
                                                : filters.ownerIds.length === owners.length
                                                    ? "Todos"
                                                    : `${filters.ownerIds.length} seleccionados`}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[250px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar..." />
                                            <CommandList>
                                                <CommandEmpty>No encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem onSelect={toggleAllOwners} className="font-medium">
                                                        <Check className={cn("mr-2 h-4 w-4", filters.ownerIds.length === owners.length ? "opacity-100" : "opacity-0")} />
                                                        Todos
                                                    </CommandItem>
                                                    {owners.map((owner) => (
                                                        <CommandItem key={owner.id} value={owner.id} onSelect={() => toggleOwner(owner.id)}>
                                                            <Check className={cn("mr-2 h-4 w-4", filters.ownerIds.includes(owner.id) ? "opacity-100" : "opacity-0")} />
                                                            {owner.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Property Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Propiedades</label>
                                <Popover open={openPropertySelect} onOpenChange={setOpenPropertySelect}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={openPropertySelect} className="w-full justify-between">
                                            {(filters.propertyIds || []).length === 0
                                                ? "Todas"
                                                : (filters.propertyIds || []).length === selectableProperties.length
                                                    ? "Todas"
                                                    : `${(filters.propertyIds || []).length} seleccionadas`}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[250px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar..." />
                                            <CommandList>
                                                <CommandEmpty>No encontrada.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem onSelect={toggleAllProperties} className="font-medium">
                                                        <Check className={cn("mr-2 h-4 w-4", (filters.propertyIds || []).length === selectableProperties.length && selectableProperties.length > 0 ? "opacity-100" : "opacity-0")} />
                                                        Todas
                                                    </CommandItem>
                                                    {selectableProperties.map((property) => (
                                                        <CommandItem key={property.id} value={property.id} onSelect={() => toggleProperty(property.id)}>
                                                            <Check className={cn("mr-2 h-4 w-4", (filters.propertyIds || []).includes(property.id) ? "opacity-100" : "opacity-0")} />
                                                            {property.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => router.push('/reports')}>Cancelar</Button>
                        <Button onClick={handleGenerate} className="w-1/3" disabled={loading}>
                            {loading ? "Generando..." : <><FileBarChart className="mr-2 h-4 w-4" /> Generar Reporte</>}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* STEP 2: Report Preview */}
            {reportGenerated && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={handleBackToFilters}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Configuración
                            </Button>
                            <div className="h-4 w-px bg-border" />
                            <div className="text-sm">
                                <span className="text-muted-foreground">Reporte:</span> <strong>Financiero por Propietario</strong>
                                <span className="mx-2 text-muted-foreground">|</span>
                                <span className="text-muted-foreground">Periodo:</span> <strong>{periodLabel}</strong>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={reportData.length === 0}>
                                        <Mail className="mr-2 h-4 w-4" /> Enviar
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-2" align="end">
                                    <p className="text-sm font-medium px-2 py-1 text-muted-foreground">Enviar reporte a:</p>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {reportData.map(owner => (
                                            <Button
                                                key={owner.ownerId}
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start text-left h-auto py-2"
                                                disabled={sendingEmail}
                                                onClick={async () => {
                                                    setSendingEmail(true)
                                                    await sendReportEmail(owner, periodLabel)
                                                    setSendingEmail(false)
                                                }}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{owner.ownerName}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {owner.ownerEmail || 'Sin correo registrado'}
                                                    </div>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" size="sm" onClick={handleExport} disabled={reportData.length === 0}>
                                <Download className="mr-2 h-4 w-4" /> Excel
                            </Button>
                            <Button size="sm" onClick={() => handlePrint()}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
                            </Button>
                        </div>
                    </div>

                    {/* Inline Preview */}
                    <div className="border rounded-md overflow-auto bg-white shadow-sm min-h-[600px]">
                        <div className="min-w-[800px]">
                            <OwnerFinancialReport ref={componentRef} data={reportData} period={periodLabel} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
