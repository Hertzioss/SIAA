import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface OperationalReportProps {
    type: 'occupancy' | 'delinquency'
    data: any[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const OperationalReport = React.forwardRef<HTMLDivElement, OperationalReportProps>(({ type, data }, ref) => {

    const renderOccupancyReport = () => {
        const occupied = data.filter(d => d.status === 'Ocupado').length
        const vacant = data.filter(d => d.status === 'Vacante').length
        const chartData = [
            { name: 'Ocupado', value: occupied },
            { name: 'Vacante', value: vacant },
        ]

        return (
            <div className="space-y-8">
                <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wide">REPORTE DE OCUPACIÓN</h1>
                    <p className="text-sm text-gray-500">Estado actual de inmuebles</p>
                </div>

                <div className="h-[300px] w-full flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <Table className="border border-black text-xs">
                    <TableHeader>
                        <TableRow className="border-b border-black">
                            <TableHead className="text-black font-bold">PROPIEDAD</TableHead>
                            <TableHead className="text-black font-bold">UNIDAD</TableHead>
                            <TableHead className="text-black font-bold">ESTADO</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={index} className="border-b border-gray-300">
                                <TableCell>{row.property}</TableCell>
                                <TableCell>{row.unit}</TableCell>
                                <TableCell>{row.status}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    const renderDelinquencyReport = () => {
        return (
            <div className="space-y-8">
                <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wide">REPORTE DE MOROSIDAD</h1>
                    <p className="text-sm text-gray-500">Análisis de deuda por inquilino</p>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="tenant" type="category" width={100} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="debt" fill="#ff8042" name="Deuda ($)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

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
                        {data.map((row, index) => (
                            <TableRow key={index} className="border-b border-gray-300">
                                <TableCell>{row.tenant}</TableCell>
                                <TableCell>{row.unit}</TableCell>
                                <TableCell className="text-right">{row.months}</TableCell>
                                <TableCell className="text-right">{row.debt.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
