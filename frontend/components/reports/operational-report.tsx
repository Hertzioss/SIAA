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
        const chartData = [
            { name: 'Ocupado', value: occupied },
            { name: 'Vacante', value: vacant },
        ]

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
                <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wide">REPORTE DE OCUPACIÓN</h1>
                    <p className="text-sm text-gray-500">Estado actual de inmuebles</p>
                    {period && <p className="text-sm text-gray-500 font-medium mt-1 uppercase">{period}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-gray-500">TOTAL UNIDADES</p>
                        <p className="text-2xl font-bold">{data.length}</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-green-700">OCUPADAS</p>
                        <p className="text-2xl font-bold text-green-700">
                            {occupied} ({((occupied / data.length) * 100).toFixed(0)}%)
                        </p>
                    </div>
                    <div className="bg-red-100 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-red-700">VACANTES</p>
                        <p className="text-2xl font-bold text-red-700">
                            {vacant} ({((vacant / data.length) * 100).toFixed(0)}%)
                        </p>
                    </div>
                </div>

                {Object.keys(groupedData).map((propertyName) => (
                    <div key={propertyName} className="mb-8">
                        <h2 className="text-lg font-bold mb-2 bg-gray-200 p-2 rounded">{propertyName}</h2>
                        <Table className="border border-black text-xs">
                            <TableHeader>
                                <TableRow className="border-b border-black">
                                    <TableHead className="text-black font-bold">INQUILINO</TableHead>
                                    <TableHead className="text-black font-bold">CÉDULA / RIF</TableHead>
                                    <TableHead className="text-black font-bold">UNIDAD</TableHead>
                                    <TableHead className="text-black font-bold text-right">CANON ($)</TableHead>
                                    <TableHead className="text-black font-bold">ESTADO</TableHead>
                                    <TableHead className="text-black font-bold">TELÉFONO</TableHead>
                                    <TableHead className="text-black font-bold">CORREO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedData[propertyName].map((row: any, index: number) => (
                                    <TableRow key={index} className="border-b border-gray-300">
                                        <TableCell className="font-medium">{row.tenant}</TableCell>
                                        <TableCell>{row.docId}</TableCell>
                                        <TableCell>{row.unit}</TableCell>
                                        <TableCell className="text-right">{row.rent ? `$${row.rent.toFixed(2)}` : '-'}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                row.status === 'Ocupado' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                            }`}>
                                                {row.status.toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell>{row.phone}</TableCell>
                                        <TableCell>{row.email}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ))}
            </div>
        )
    }

    const renderDelinquencyReport = () => {
        const totalDebt = data.reduce((acc: number, curr: any) => acc + (curr.debt || 0), 0)
        const totalTenants = data.length
        const avgDebt = totalTenants > 0 ? totalDebt / totalTenants : 0

        // Group by property
        const groupedData = data.reduce((acc: any, curr: any) => {
            const prop = curr.property || 'Sin Propiedad'
            if (!acc[prop]) acc[prop] = []
            acc[prop].push(curr)
            return acc
        }, {})

        return (
            <div className="space-y-8">
                <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wide">REPORTE DE MOROSIDAD</h1>
                    <p className="text-sm text-gray-500">Análisis de deuda por inquilino</p>
                    {period && <p className="text-sm text-gray-500 font-medium mt-1 uppercase">{period}</p>}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-gray-500">INQUILINOS MOROSOS</p>
                        <p className="text-2xl font-bold">{totalTenants}</p>
                    </div>
                    <div className="bg-red-100 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-red-700">DEUDA TOTAL</p>
                        <p className="text-2xl font-bold text-red-700">${totalDebt.toFixed(2)}</p>
                    </div>
                    <div className="bg-orange-100 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-orange-700">DEUDA PROMEDIO</p>
                        <p className="text-2xl font-bold text-orange-700">${avgDebt.toFixed(2)}</p>
                    </div>
                </div>

                {/* Tables grouped by property */}
                {Object.keys(groupedData).map((propertyName) => {
                    const propertyDebt = groupedData[propertyName].reduce((acc: number, curr: any) => acc + (curr.debt || 0), 0)
                    return (
                        <div key={propertyName} className="mb-8">
                            <h2 className="text-lg font-bold mb-2 bg-gray-200 p-2 rounded flex justify-between">
                                <span>{propertyName}</span>
                                <span className="text-red-700">Deuda: ${propertyDebt.toFixed(2)}</span>
                            </h2>
                            <Table className="border border-black text-xs">
                                <TableHeader>
                                    <TableRow className="border-b border-black">
                                        <TableHead className="text-black font-bold">INQUILINO</TableHead>
                                        <TableHead className="text-black font-bold">UNIDAD</TableHead>
                                        <TableHead className="text-black font-bold text-right">MESES</TableHead>
                                        <TableHead className="text-black font-bold text-right">DEUDA TOTAL ($)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedData[propertyName].map((row: any, index: number) => (
                                        <TableRow key={index} className="border-b border-gray-300">
                                            <TableCell>{row.tenant}</TableCell>
                                            <TableCell>{row.unit}</TableCell>
                                            <TableCell className="text-right">{row.months}</TableCell>
                                            <TableCell className="text-right text-red-700 font-bold">{row.debt.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto">
            {type === 'occupancy' ? renderOccupancyReport() : renderDelinquencyReport()}
        </div>
    )
})

OperationalReport.displayName = "OperationalReport"
