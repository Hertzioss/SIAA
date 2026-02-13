"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTenantStatement } from "@/hooks/use-tenant-statement"
import { TenantStatementReport } from "@/components/reports/tenant-statement-report"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ArrowLeft, FileBarChart, Download, Loader2, Mail, Check, ChevronsUpDown, Printer } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import * as XLSX from 'xlsx'
import { useReactToPrint } from "react-to-print"
import { supabase } from "@/lib/supabase"

export default function TenantStatementPage() {
    const router = useRouter()
    const { statementData, loading, filters, setFilters, generateStatement, sendStatementEmail } = useTenantStatement()
    const [reportGenerated, setReportGenerated] = useState(false)
    const [openTenantSelect, setOpenTenantSelect] = useState(false)
    const [tenants, setTenants] = useState<any[]>([])
    const [sendingEmail, setSendingEmail] = useState(false)
    const componentRef = useRef<HTMLDivElement>(null)

    // Fetch tenants
    useEffect(() => {
        const fetchTenants = async () => {
            const { data } = await supabase
                .from('tenants')
                .select('id, name, doc_id, email')
                .order('name')
            setTenants(data || [])
        }
        fetchTenants()
    }, [])

    const handleGenerate = async () => {
        const result = await generateStatement()
        if (result) setReportGenerated(true)
    }

    const handleSendEmail = async () => {
        if (!statementData) return
        setSendingEmail(true)
        await sendStatementEmail(statementData)
        setSendingEmail(false)
    }

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Estado_Cuenta_${statementData?.tenantName || 'Inquilino'}`
    })

    const handleExport = () => {
        if (!statementData || statementData.payments.length === 0) {
            toast.error("No hay datos para exportar")
            return
        }

        const exportData = statementData.payments.map(p => ({
            "Fecha": p.date,
            "Concepto": p.concept,
            "Propiedad": p.property,
            "Unidad": p.unit,
            "Método": p.method,
            "Referencia": p.reference,
            "Monto ($)": p.amount,
            "Moneda Original": p.currency,
            "Monto Original": p.amountOriginal,
        }))

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Estado de Cuenta")
        XLSX.writeFile(wb, `Estado_Cuenta_${statementData.tenantName}_${format(filters.startDate, "yyyy-MM-dd")}_${format(filters.endDate, "yyyy-MM-dd")}.xlsx`)
        toast.success("Exportado con éxito")
    }

    const handleBackToFilters = () => {
        setReportGenerated(false)
    }

    const selectedTenant = tenants.find(t => t.id === filters.tenantId)

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/reports')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Estado de Cuenta por Inquilino</h1>
                    <p className="text-muted-foreground">Detalle de pagos registrados por inquilino en un período.</p>
                </div>
            </div>

            {/* STEP 1: Filters (hidden when report is generated, matching occupancy report flow) */}
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

                        {/* Tenant Selector */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Inquilino</label>
                            <Popover open={openTenantSelect} onOpenChange={setOpenTenantSelect}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openTenantSelect}
                                        className="w-full justify-between"
                                    >
                                        {selectedTenant ? `${selectedTenant.name} — ${selectedTenant.doc_id}` : "Seleccionar inquilino..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar inquilino..." />
                                        <CommandList>
                                            <CommandEmpty>No encontrado.</CommandEmpty>
                                            <CommandGroup>
                                                {tenants.map((tenant) => (
                                                    <CommandItem
                                                        key={tenant.id}
                                                        value={tenant.name}
                                                        onSelect={() => {
                                                            setFilters(prev => ({ ...prev, tenantId: tenant.id }))
                                                            setOpenTenantSelect(false)
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", filters.tenantId === tenant.id ? "opacity-100" : "opacity-0")} />
                                                        <div>
                                                            <span className="font-medium">{tenant.name}</span>
                                                            <span className="text-muted-foreground text-xs ml-2">{tenant.doc_id}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Email warning */}
                        {selectedTenant && !selectedTenant.email && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                                ⚠️ Este inquilino no tiene correo electrónico registrado.
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => router.push('/reports')}>Cancelar</Button>
                        <Button onClick={handleGenerate} className="w-1/3" disabled={loading || !filters.tenantId}>
                            {loading ? "Generando..." : <><FileBarChart className="mr-2 h-4 w-4" /> Generar Reporte</>}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* STEP 2: Report Preview (like occupancy report) */}
            {reportGenerated && statementData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={handleBackToFilters}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Configuración
                            </Button>
                            <div className="h-4 w-px bg-border" />
                            <div className="text-sm">
                                <span className="text-muted-foreground">Inquilino:</span> <strong>{statementData.tenantName}</strong>
                                <span className="mx-2 text-muted-foreground">|</span>
                                <span className="text-muted-foreground">Periodo:</span> <strong>{statementData.period}</strong>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSendEmail} disabled={sendingEmail || !statementData.tenantEmail}>
                                {sendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                Enviar por Correo
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExport}>
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
                            <TenantStatementReport ref={componentRef} data={statementData} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
