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
import { User } from "lucide-react"

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
        <div ref={ref} className="p-8 bg-white text-black font-sans w-full max-w-[1000px] mx-auto shadow-sm border border-gray-100 rounded-sm [print-color-adjust:exact]">
            <div className="space-y-8">
                {/* 1. Header */}
                <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-slate-800">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Rendimiento por Propiedad</h1>
                        <p className="text-slate-500 mt-1">Desglose de ingresos y egresos por propiedad y por propietario</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-sm font-medium bg-slate-100 px-3 py-1 rounded-full text-slate-800">
                            Generado: {new Date().toLocaleDateString('es-VE')}
                        </p>
                        {period && (
                            <p className="text-sm font-medium bg-slate-100 px-3 py-1 rounded-full text-slate-800">
                                {period}
                            </p>
                        )}
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
                            <div className="flex justify-between items-end border-b pb-2 border-slate-200 mb-4">
                                <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                    <User className="w-5 h-5 text-slate-500" />
                                    {group.ownerName}
                                </h3>
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Desglose de Participación</span>
                            </div>

                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <Table className="text-xs">
                                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-semibold text-slate-700 py-3 w-[40%]">INMUEBLE / CONCEPTO</TableHead>
                                            <TableHead className="font-semibold text-slate-700 py-3 text-center">% PART.</TableHead>
                                            <TableHead className="font-semibold text-slate-700 py-3 text-right">INGRESOS ($/Bs)</TableHead>
                                            <TableHead className="font-semibold text-slate-700 py-3 text-right">EGRESOS ($/Bs)</TableHead>
                                            <TableHead className="font-semibold text-slate-700 py-3 text-right">UTILIDAD ($/Bs)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.properties.map((prop: any, pIdx: number) => (
                                            <TableRow key={pIdx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                                <TableCell className="font-medium text-slate-900">{prop.name}</TableCell>
                                                <TableCell className="text-center font-semibold text-slate-500">{prop.percentage}%</TableCell>
                                                <TableCell className="text-right py-2">
                                                    <span className="block text-slate-900 font-medium">${prop.income.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="block text-[11px] text-slate-500 italic">Bs. {prop.incomeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </TableCell>
                                                <TableCell className="text-right py-2">
                                                    <span className="block text-slate-900 font-medium">${prop.expense.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="block text-[11px] text-slate-500 italic">Bs. {prop.expenseBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </TableCell>
                                                <TableCell className="text-right py-2">
                                                    <span className="block font-bold text-slate-900">${prop.net.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="block text-[11px] text-slate-500 italic">Bs. {prop.netBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                                        <TableRow className="bg-slate-100/50 text-slate-900 font-bold hover:bg-slate-100/50 border-t-2 border-slate-200">
                                            <TableCell colSpan={2} className="uppercase tracking-widest text-[11px]">TOTAL: {group.ownerName}</TableCell>
                                            <TableCell className="text-right py-2">
                                                <span className="block">${group.total.income.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="block text-[11px] text-slate-500 italic font-normal mt-0.5">Bs. {group.total.incomeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </TableCell>
                                            <TableCell className="text-right py-2">
                                                <span className="block">${group.total.expense.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="block text-[11px] text-slate-500 italic font-normal mt-0.5">Bs. {group.total.expenseBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </TableCell>
                                            <TableCell className="text-right py-2">
                                                <span className="block font-black">${group.total.net.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="block text-[11px] text-slate-500 italic font-normal mt-0.5">Bs. {group.total.netBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Badge variant="outline" className="text-xs uppercase font-bold text-slate-700 bg-slate-50 border-slate-200 py-1 px-3">
                                    Participación Neta: ${group.total.net.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
})

PropertyPerformanceReport.displayName = "PropertyPerformanceReport"
