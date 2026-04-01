import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface OperationalReportProps {
    type: 'occupancy' | 'delinquency'
    data: any[]
    period?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

/**
 * Reporte operativo (Ocupación y Morosidad).
 * Visualiza el estado de ocupación de inmuebles o el análisis de deuda por inquilino.
 */
export const OperationalReport = React.forwardRef<HTMLDivElement, OperationalReportProps>(({ type, data, period }, ref) => {

    const renderOccupancyReport = () => {
        const occupied = data.filter(d => d.status === 'Ocupado').length
        const vacant = data.filter(d => d.status === 'Vacante').length

        // Group data by property
        const groupedData = data.reduce((acc: any, curr: any) => {
            if (!acc[curr.property]) {
                acc[curr.property] = []
            }
            acc[curr.property].push(curr)
            return acc
        }, {})

        return (
            <div className="space-y-8">
                {/* 1. Header */}
                <div className="border-b-2 border-gray-800 pb-6">
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">REPORTE OPERATIVO</h1>
                            <p className="text-md font-medium text-gray-500 uppercase mt-1 tracking-wider">Estado de Ocupación</p>
                        </div>
                        <div className="text-right mt-2 md:mt-0 print:mt-0">
                            <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-200">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Período del Reporte</p>
                                <p className="text-sm font-semibold text-gray-900 uppercase">{period || 'Actual'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Detail Tables by Property */}
                <div className="space-y-6 pt-2">
                    {Object.keys(groupedData).map((propertyName, idx) => (
                        <div key={propertyName}>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">{idx + 1}. Inmueble: {propertyName}</h3>
                                <div className="border border-gray-300 rounded overflow-hidden">
                                <Table className="text-[10px]">
                                    <TableHeader>
                                        <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                            <TableHead className="text-gray-900 font-bold w-[150px] min-w-[150px] max-w-[150px] whitespace-normal break-words">INQUILINO</TableHead>
                                            <TableHead className="text-gray-900 font-bold w-[100px] min-w-[100px] max-w-[100px]">CÉDULA / RIF</TableHead>
                                            <TableHead className="text-gray-900 font-bold w-[100px] min-w-[100px] max-w-[100px] whitespace-normal break-words">UNIDAD</TableHead>
                                            <TableHead className="text-gray-900 font-bold w-[80px] text-right">CANON ($)</TableHead>
                                            <TableHead className="text-gray-900 font-bold w-[60px] text-center">ESTADO</TableHead>
                                            <TableHead className="text-gray-900 font-bold w-[100px]">TELÉFONO</TableHead>
                                            <TableHead className="text-gray-900 font-bold w-[180px] min-w-[180px] max-w-[180px] whitespace-normal break-words">CORREO</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedData[propertyName].map((row: any, index: number) => (
                                            <TableRow key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                                <TableCell className="font-medium text-gray-900 w-[150px] min-w-[150px] max-w-[150px] whitespace-normal break-words leading-tight">{row.tenant}</TableCell>
                                                <TableCell className="text-gray-600 w-[100px]">{row.docId}</TableCell>
                                                <TableCell className="font-medium w-[100px] min-w-[100px] max-w-[100px] whitespace-normal break-words leading-tight">{row.unit}</TableCell>
                                                <TableCell className="text-right font-bold text-gray-900 w-[80px]">{row.rent ? `$${row.rent.toFixed(2)}` : '-'}</TableCell>
                                                <TableCell className="text-center w-[60px]">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        row.status === 'Ocupado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                                                    }`}>
                                                        {row.status === 'Ocupado' ? 'Oc' : 'Va'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-gray-600 w-[100px]">{row.phone}</TableCell>
                                                <TableCell className="text-gray-600 w-[180px] min-w-[180px] max-w-[180px] whitespace-normal break-all leading-tight">{row.email}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 2. Executive Summary - Occupancy */}
                <div className="pt-2">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Resumen General</h3>
                    <div className="grid grid-cols-3 gap-6 mb-8 break-inside-avoid">
                        <div className="bg-white border-l-4 border-slate-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Unidades</p>
                            <p className="text-2xl font-black text-gray-900">{data.length}</p>
                        </div>
                        <div className="bg-white border-l-4 border-emerald-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Ocupadas</p>
                            <p className="text-2xl font-black text-gray-900">{occupied} <span className="text-sm font-medium text-gray-400">({data.length > 0 ? ((occupied / data.length) * 100).toFixed(0) : 0}%)</span></p>
                        </div>
                        <div className="bg-white border-l-4 border-rose-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Vacantes</p>
                            <p className="text-2xl font-black text-gray-900">{vacant} <span className="text-sm font-medium text-gray-400">({data.length > 0 ? ((vacant / data.length) * 100).toFixed(0) : 0}%)</span></p>
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
        )
    }

    const renderDelinquencyReport = () => {
        const totalDebt = data.reduce((acc: number, curr: any) => acc + (curr.debt || 0), 0)
        const totalTenants = data.length
        const avgDebt = totalTenants > 0 ? totalDebt / totalTenants : 0

        // Group by property
        const groupedData = data.reduce((acc: any, curr: any) => {
            const prop = curr.property || 'Sin Inmueble'
            if (!acc[prop]) acc[prop] = []
            acc[prop].push(curr)
            return acc
        }, {})

        return (
            <div className="space-y-8">
                {/* 1. Header */}
                <div className="border-b-2 border-gray-800 pb-6">
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">REPORTE OPERATIVO</h1>
                            <p className="text-md font-medium text-gray-500 uppercase mt-1 tracking-wider">Análisis de Deuda (Morosidad)</p>
                        </div>
                        <div className="text-right mt-2 md:mt-0 print:mt-0">
                            <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-200">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Período del Reporte</p>
                                <p className="text-sm font-semibold text-gray-900 uppercase">{period || 'Actual'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Detail Tables by Property */}
                <div className="space-y-6 pt-2">
                    {Object.keys(groupedData).map((propertyName, idx) => {
                        const propertyDebt = groupedData[propertyName].reduce((acc: number, curr: any) => acc + (curr.debt || 0), 0)
                        return (
                            <div key={propertyName}>
                                <h3 className="text-sm font-bold text-gray-800 flex justify-between uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">
                                    <span>{idx + 1}. Inmueble: {propertyName}</span>
                                    <span className="text-rose-700 font-black">Deuda: ${propertyDebt.toFixed(2)}</span>
                                </h3>
                                <div className="border border-gray-300 rounded overflow-hidden">
                                    <Table className="text-[10px]">
                                        <TableHeader>
                                            <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                                <TableHead className="text-gray-900 font-bold w-[150px] min-w-[150px] max-w-[150px] whitespace-normal break-words">INQUILINO</TableHead>
                                                <TableHead className="text-gray-900 font-bold w-[100px] min-w-[100px] max-w-[100px] whitespace-normal break-words">UNIDAD</TableHead>
                                                <TableHead className="text-gray-900 font-bold text-right w-[120px]">MESES ATRASADOS</TableHead>
                                                <TableHead className="text-gray-900 font-bold text-right w-[120px]">DEUDA TOTAL ($)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedData[propertyName].map((row: any, index: number) => (
                                                <TableRow key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                                    <TableCell className="font-medium text-gray-900 w-[150px] min-w-[150px] max-w-[150px] whitespace-normal break-words leading-tight">{row.tenant}</TableCell>
                                                    <TableCell className="font-medium w-[100px] min-w-[100px] max-w-[100px] whitespace-normal break-words leading-tight">{row.unit}</TableCell>
                                                    <TableCell className="text-right text-gray-600 font-bold w-[120px]">{row.months}</TableCell>
                                                    <TableCell className="text-right text-rose-600 font-bold w-[120px]">${row.debt.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {/* 2. Executive Summary - Delinquency */}
                <div className="pt-2">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Resumen General</h3>
                    <div className="grid grid-cols-3 gap-6 mb-8 break-inside-avoid">
                        <div className="bg-white border-l-4 border-slate-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Inquilinos Morosos</p>
                            <p className="text-2xl font-black text-gray-900">{totalTenants}</p>
                        </div>
                        <div className="bg-white border-l-4 border-rose-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Deuda Total</p>
                            <p className="text-2xl font-black text-gray-900">${totalDebt.toFixed(2)}</p>
                        </div>
                        <div className="bg-white border-l-4 border-amber-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Deuda Promedio</p>
                            <p className="text-2xl font-black text-gray-900">${avgDebt.toFixed(2)}</p>
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
        )
    }

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans w-full max-w-[1000px] mx-auto shadow-sm border border-gray-100 rounded-sm [print-color-adjust:exact]">
            {type === 'occupancy' ? renderOccupancyReport() : renderDelinquencyReport()}
        </div>
    )
})

OperationalReport.displayName = "OperationalReport"
