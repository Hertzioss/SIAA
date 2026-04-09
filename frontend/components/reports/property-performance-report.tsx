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
    data: any
    period?: string
}

/**
 * Reporte de rendimiento por propiedad.
 * Ofrece un análisis comparativo de ingresos vs. egresos y calcula el margen de utilidad neta.
 */
export const PropertyPerformanceReport = forwardRef<HTMLDivElement, PropertyPerformanceProps>(({ data, period }, ref) => {
    // Check if data is using the new grouped structure
    const groups = data?.groups || []
    const grandTotal = data?.grandTotal || { income: 0, expense: 0, net: 0 }

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto shadow-sm border border-gray-100 rounded-sm">
            <div className="space-y-8">
                {/* 1. Header */}
                <div className="border-b-2 border-gray-800 pb-6">
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">RENDIMIENTO POR INMUEBLE</h1>
                            <p className="text-md font-medium text-gray-500 uppercase mt-1 tracking-wider">Desglose por Propietario e Inmueble</p>
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
                {/* <div className="pt-2">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Resumen Operativo Consolidado</h3>
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-white border-l-4 border-emerald-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Ingresos Totales</p>
                            <div className="flex flex-col">
                                <p className="text-2xl font-black text-gray-900">${grandTotal.income.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs font-semibold text-slate-500 italic">Bs. {grandTotal.incomeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <div className="bg-white border-l-4 border-rose-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Egresos Totales</p>
                            <div className="flex flex-col">
                                <p className="text-2xl font-black text-gray-900">${grandTotal.expense.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs font-semibold text-slate-500 italic">Bs. {grandTotal.expenseBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <div className={`bg-white border-l-4 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100 ${grandTotal.net >= 0 ? "border-blue-500" : "border-amber-500"}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${grandTotal.net >= 0 ? "text-blue-600" : "text-amber-600"}`}>Utilidad Neta</p>
                            <div className="flex flex-col">
                                <p className="text-2xl font-black text-gray-900">${grandTotal.net.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs font-semibold text-slate-500 italic">Bs. {grandTotal.netBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>
                </div> */}

                {/* 3. Details Grouped by Owner */}
                <div className="space-y-10 pt-2">
                    {groups.map((group: any, gIdx: number) => (
                        <div key={gIdx} className="space-y-3">
                            <div className="flex justify-between items-end border-b-2 border-primary/20 pb-2">
                                <h3 className="text-lg font-black text-primary uppercase tracking-tighter">
                                    {group.ownerName}
                                </h3>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Desglose de Participación</span>
                            </div>

                            <div className="border border-gray-300 rounded overflow-hidden">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="border-b border-gray-400 bg-gray-50 hover:bg-gray-50 uppercase font-black">
                                            <TableHead className="text-gray-900 w-[40%]">INMUEBLE / CONCEPTO</TableHead>
                                            <TableHead className="text-gray-900 text-center">% PART.</TableHead>
                                            <TableHead className="text-gray-900 text-right">INGRESOS ($/Bs)</TableHead>
                                            <TableHead className="text-gray-900 text-right">EGRESOS ($/Bs)</TableHead>
                                            <TableHead className="text-gray-900 text-right">UTILIDAD ($/Bs)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.properties.map((prop: any, pIdx: number) => (
                                            <TableRow key={pIdx} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <TableCell className="font-semibold text-gray-800">{prop.name}</TableCell>
                                                <TableCell className="text-center font-bold text-slate-400">{prop.percentage}%</TableCell>
                                                <TableCell className="text-right py-1">
                                                    <span className="block text-emerald-600 font-bold">${prop.income.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="block text-[11px] text-slate-500 italic font-medium">Bs. {prop.incomeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </TableCell>
                                                <TableCell className="text-right py-1">
                                                    <span className="block text-rose-500 font-bold">${prop.expense.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="block text-[11px] text-slate-500 italic font-medium">Bs. {prop.expenseBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </TableCell>
                                                <TableCell className="text-right py-1">
                                                    <span className="block font-black text-gray-900">${prop.net.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="block text-[11px] text-slate-500 italic font-medium">Bs. {prop.netBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        
                                        {/* Unassigned row for this owner */}
                                        {(group.unassigned.expense > 0 || group.unassigned.income > 0) && (
                                            <TableRow className="bg-amber-50/30 border-b border-amber-100">
                                                <TableCell className="font-bold text-amber-800 italic">GASTOS GENERALES (ADMINISTRATIVOS)</TableCell>
                                                <TableCell className="text-center text-amber-600 font-bold">-</TableCell>
                                                <TableCell className="text-right py-1">
                                                    <span className="block text-emerald-600 font-bold">${group.unassigned.income.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="block text-[9px] text-slate-500 italic font-medium">Bs. {group.unassigned.incomeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </TableCell>
                                                <TableCell className="text-right py-1">
                                                    <span className="block text-rose-500 font-bold">${group.unassigned.expense.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="block text-[9px] text-slate-500 italic font-medium">Bs. {group.unassigned.expenseBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </TableCell>
                                                <TableCell className="text-right py-1">
                                                    <span className="block font-black text-amber-900">${group.unassigned.net.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="block text-[9px] text-slate-500 italic font-medium">Bs. {group.unassigned.netBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {/* Subtotal Row */}
                                        <TableRow className="bg-slate-900 text-white font-black hover:bg-slate-900/90">
                                            <TableCell colSpan={2} className="uppercase tracking-widest text-[10px]">TOTAL {group.ownerName}</TableCell>
                                            <TableCell className="text-right py-1">
                                                <span className="block">${group.total.income.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="block text-[12px] text-slate-400 font-bold">Bs. {group.total.incomeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </TableCell>
                                            <TableCell className="text-right py-1">
                                                <span className="block">${group.total.expense.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="block text-[12px] text-slate-400 font-bold">Bs. {group.total.expenseBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </TableCell>
                                            <TableCell className="text-right py-1">
                                                <span className="block text-emerald-400">${group.total.net.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="block text-[12px] text-slate-400 font-bold">Bs. {group.total.netBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Badge variant="outline" className="text-[10px] uppercase font-black text-slate-400 border-slate-200">
                                    Participación Neta: ${group.total.net.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </Badge>
                            </div>
                        </div>
                    ))}
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
