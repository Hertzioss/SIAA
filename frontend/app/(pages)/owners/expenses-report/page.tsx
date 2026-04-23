"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getOwnerExpensesList } from "@/actions/owner-dashboard"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Printer, FileSpreadsheet } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export default function ExpensesReportPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    
    const month = searchParams.get('month') || 'all'
    const year = searchParams.get('year') || 'all'
    
    const [expenses, setExpenses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadReport() {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const { data, error } = await getOwnerExpensesList(session.access_token)
            
            if (data) {
                // Filter by month and year
                const filtered = data.filter((exp: any) => {
                    if (month === 'all' && year === 'all') return true
                    
                    const dateObj = new Date(exp.date)
                    // exp.date is UTC string or ISO string, we need to extract year and month safely
                    // Since it's stored as YYYY-MM-DD, we can use string splitting or Date methods
                    const [y, m] = exp.date.split('T')[0].split('-')
                    
                    if (month !== 'all' && parseInt(m) !== parseInt(month)) return false
                    if (year !== 'all' && parseInt(y) !== parseInt(year)) return false
                    
                    return true
                })
                
                setExpenses(filtered)
            }
            setLoading(false)
        }
        
        loadReport()
    }, [month, year])

    const handlePrint = () => {
        window.print()
    }

    const handleExportCSV = () => {
        const headers = ["Fecha", "Tipo", "Inmueble", "Concepto", "Monto (USD)", "Monto (VES)"]
        const csvContent = [
            headers.join(","),
            ...expenses.map(e => [
                e.date.split('T')[0],
                e.expense_type === 'property' ? 'General' : 'Directo',
                `"${e.propertyName || ''}"`,
                `"${e.description || e.category}"`,
                e.prorated_amount || 0,
                (e.prorated_amount || 0) * (e.exchange_rate || 1)
            ].join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `reporte_egresos_${month}_${year}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const periodName = month !== 'all' && year !== 'all' ? `${monthNames[parseInt(month) - 1]} ${year}` : 'Período General'
    
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 print:p-0 print:m-0 print:space-y-4 print:text-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/owners/dashboard')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Reporte de Egresos</h2>
                        <p className="text-muted-foreground mt-1">
                            {periodName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Button variant="outline" onClick={handleExportCSV}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : expenses.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-20 text-center print:shadow-none">
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Sin Egresos</p>
                    <p className="text-sm text-gray-500 mt-1">No hay egresos registrados para este período.</p>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 mt-4 print:grid-cols-2">
                        <Card className="p-4 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900">
                            <div className="text-sm font-medium text-rose-800 dark:text-rose-300">Total Egresos (USD)</div>
                            <div className="text-2xl font-bold text-rose-900 dark:text-rose-100 mt-1">
                                ${expenses.reduce((sum, exp) => sum + (exp.prorated_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </Card>
                        <Card className="p-4 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900">
                            <div className="text-sm font-medium text-rose-800 dark:text-rose-300">Total Egresos (VES)</div>
                            <div className="text-2xl font-bold text-rose-900 dark:text-rose-100 mt-1">
                                Bs. {expenses.reduce((sum, exp) => sum + ((exp.prorated_amount || 0) * (exp.exchange_rate || 1)), 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </Card>
                    </div>

                    <Card className="shadow-sm mt-8 border border-gray-200 print:shadow-none print:mt-4 print:border-gray-400">
                        <div className="rounded-md overflow-hidden">
                            <Table className="print:text-[10px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50 border-b-2 border-gray-300 dark:bg-muted/50 dark:border-muted print:bg-gray-100">
                                        <TableHead className="font-bold text-gray-900 dark:text-gray-200">FECHA</TableHead>
                                        <TableHead className="font-bold text-gray-900 dark:text-gray-200">TIPO</TableHead>
                                        <TableHead className="font-bold text-gray-900 dark:text-gray-200">INMUEBLE</TableHead>
                                        <TableHead className="font-bold text-gray-900 dark:text-gray-200">CONCEPTO</TableHead>
                                        <TableHead className="text-right font-bold text-gray-900 dark:text-gray-200">MONTO (USD)</TableHead>
                                        <TableHead className="text-right font-bold text-gray-900 dark:text-gray-200">MONTO (VES)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.map((expense) => {
                                        const dateLabel = expense.date ? expense.date.split('T')[0] : '-'
                                        const usdAmount = expense.prorated_amount || 0
                                        const vesAmount = usdAmount * (expense.exchange_rate || 1)
                                        
                                        return (
                                            <TableRow key={expense.id} className="border-b border-gray-200 dark:border-muted print:border-gray-300">
                                                <TableCell className="font-medium">{dateLabel}</TableCell>
                                                <TableCell>
                                                    {expense.expense_type === 'property' ? (
                                                        <Badge variant="outline" className="bg-slate-100 text-[10px] print:bg-transparent print:border-none print:p-0">General</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] print:bg-transparent print:border-none print:p-0 print:text-blue-700">Directo</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>{expense.propertyName}</TableCell>
                                                <TableCell className="max-w-[200px]">
                                                    <span className="truncate block" title={expense.description || expense.category}>
                                                        {expense.description || expense.category}
                                                    </span>
                                                    {expense.expense_type === 'property' && expense.prorated_percentage < 100 && (
                                                        <span className="text-[9px] text-muted-foreground block mt-0.5">
                                                            Prorrateo {expense.prorated_percentage}%
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">
                                                    ${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    Bs. {vesAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}
