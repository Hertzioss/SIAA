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
import { forwardRef } from "react"

interface MaintenanceReportProps {
    data: any[]
    period?: string
}

/**
 * Reporte de mantenimiento.
 * Muestra el estado global de solicitudes y reparaciones mediante tablas detalladas.
 */
export const MaintenanceReport = forwardRef<HTMLDivElement, MaintenanceReportProps>(({ data, period }, ref) => {

    const totalRequests = data.length
    const highPriority = data.filter(d => d.priority === 'high').length
    const resolved = data.filter(d => d.status === 'Resuelto' || d.status === 'resolved' || d.status === 'completado').length

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto shadow-sm border border-gray-100 rounded-sm">
            <div className="space-y-8">
                {/* 1. Header */}
                <div className="border-b-2 border-gray-800 pb-6">
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">REPORTE DE MANTENIMIENTO</h1>
                            <p className="text-md font-medium text-gray-500 uppercase mt-1 tracking-wider">Estado global de solicitudes y reparaciones</p>
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
                        <div className="bg-white border-l-4 border-slate-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Solicitudes</p>
                            <p className="text-2xl font-black text-gray-900">{totalRequests}</p>
                        </div>
                        <div className="bg-white border-l-4 border-emerald-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Completadas</p>
                            <p className="text-2xl font-black text-gray-900">{resolved}</p>
                        </div>
                        <div className={`bg-white border-l-4 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100 ${highPriority > 0 ? "border-rose-500" : "border-gray-500"}`}>
                            <p className={`text-xs font-bold tracking-wider uppercase mb-2 ${highPriority > 0 ? "text-rose-600" : "text-gray-600"}`}>Alta Prioridad</p>
                            <p className="text-2xl font-black text-gray-900">{highPriority}</p>
                        </div>
                    </div>
                </div>

                {/* 3. Detailed Table */}
                <div className="space-y-6 pt-2">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">1. Detalle de Solicitudes</h3>
                        <div className="border border-gray-300 rounded overflow-hidden">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                        <TableHead className="text-gray-900 font-bold">FECHA</TableHead>
                                        <TableHead className="text-gray-900 font-bold">INMUEBLE</TableHead>
                                        <TableHead className="text-gray-900 font-bold w-[40%]">ASUNTO</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-center">PRIORIDAD</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-center">ESTADO</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((item: any, idx: number) => (
                                        <TableRow key={item.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                            <TableCell className="font-medium text-gray-900 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-gray-900 font-medium">{item.properties?.name}</TableCell>
                                            <TableCell className="text-gray-600 whitespace-pre-wrap">{item.title}</TableCell>
                                            <TableCell className="text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    item.priority === 'high' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-800 border border-slate-200'
                                                }`}>
                                                    {item.priority === 'high' ? 'Alta' : item.priority}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    (item.status === 'Resuelto' || item.status === 'resolved')
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
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

MaintenanceReport.displayName = "MaintenanceReport"
