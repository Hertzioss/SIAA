import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface PropertyPerformanceProps {
    data: any[]
    period?: string
}

/**
 * Reporte de rendimiento por propiedad.
 * Ofrece un análisis comparativo de ingresos vs. egresos y calcula el margen de utilidad neta.
 */
export const PropertyPerformanceReport = forwardRef<HTMLDivElement, PropertyPerformanceProps>(({ data, period }, ref) => {

    const totalIncome = data.reduce((sum, item) => sum + item.income, 0)
    const totalExpense = data.reduce((sum, item) => sum + item.expense, 0)
    const totalNet = totalIncome - totalExpense

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto shadow-sm border border-gray-100 rounded-sm">
            <div className="space-y-8">
                {/* 1. Header */}
                <div className="border-b-2 border-gray-800 pb-6">
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">RENDIMIENTO POR INMUEBLE</h1>
                            <p className="text-md font-medium text-gray-500 uppercase mt-1 tracking-wider">Análisis comparativo (Ingresos vs Egresos)</p>
                        </div>
                        <div className="text-right mt-2 md:mt-0 print:mt-0">
                            <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-200">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Período del Reporte</p>
                                <p className="text-sm font-semibold text-gray-900 uppercase">{period || 'Actual'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Executive Summary */}
                <div className="pt-2">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Resumen Operativo</h3>
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-white border-l-4 border-emerald-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Ingresos Totales (USD)</p>
                            <p className="text-2xl font-black text-gray-900">${totalIncome.toLocaleString()}</p>
                        </div>
                        <div className="bg-white border-l-4 border-rose-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Egresos Totales (USD)</p>
                            <p className="text-2xl font-black text-gray-900">${totalExpense.toLocaleString()}</p>
                        </div>
                        <div className={`bg-white border-l-4 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100 ${totalNet >= 0 ? "border-blue-500" : "border-amber-500"}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${totalNet >= 0 ? "text-blue-600" : "text-amber-600"}`}>Utilidad Neta (USD)</p>
                            <p className="text-2xl font-black text-gray-900">${totalNet.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* 3. Details Table */}
                <div className="space-y-6 pt-2">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">1. Desglose de Rendimiento</h3>
                        <div className="border border-gray-300 rounded overflow-hidden">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                        <TableHead className="text-gray-900 font-bold w-[40%]">INMUEBLE</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-right">INGRESOS ($)</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-right">EGRESOS ($)</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-right">UTILIDAD NETA ($)</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-center">MARGEN</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((item, idx) => {
                                        const margin = item.income > 0 ? ((item.net / item.income) * 100).toFixed(1) : '0.0'
                                        return (
                                            <TableRow key={idx} className={`border-b border-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                                <TableCell className="font-medium text-gray-900">{item.property}</TableCell>
                                                <TableCell className="text-right text-emerald-600 font-bold">${item.income.toLocaleString()}</TableCell>
                                                <TableCell className="text-right text-rose-500 font-bold">${item.expense.toLocaleString()}</TableCell>
                                                <TableCell className={`text-right font-bold ${item.net >= 0 ? "text-gray-900" : "text-rose-600"}`}>
                                                    ${item.net.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        parseFloat(margin) > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                                                    }`}>
                                                        {margin}%
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* Footer Signature Area */}
                <div className="pt-20 pb-4 text-center text-xs text-gray-400">
                    <div className="w-64 border-t border-gray-300 mx-auto mb-3"></div>
                    {/* <p className="uppercase tracking-widest">Generado por SIAA</p> */}
                    <p>Sistema Integral de Administración de Alquileres</p>
                </div>
            </div>
        </div>
    )
})

PropertyPerformanceReport.displayName = "PropertyPerformanceReport"
