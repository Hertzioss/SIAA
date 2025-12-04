import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Transaction {
    date: string
    concept: string
    debit?: number
    credit?: number
    balance: number
    // For BS table
    rate?: number
    incomeUsd?: number
    balanceUsd?: number
}

interface Distribution {
    owner: string
    percentage: number
    amount: number
}

interface IncomeExpenseReportProps {
    month: string
    year: string
    dataUsd: Transaction[]
    dataBs: Transaction[]
    dataExpenses?: {
        date: string
        category: string
        description: string
        amount: number
        status: string
    }[]
    dataDistribution?: Distribution[]
}

export const IncomeExpenseReport = React.forwardRef<HTMLDivElement, IncomeExpenseReportProps>(({ month, year, dataUsd, dataBs, dataExpenses = [], dataDistribution }, ref) => {

    const totalIncomeUsd = dataUsd.reduce((acc, curr) => acc + (curr.credit || 0), 0)
    const totalIncomeBsConverted = dataBs.reduce((acc, curr) => acc + (curr.incomeUsd || 0), 0)
    const totalGrossIncome = totalIncomeUsd + totalIncomeBsConverted

    const totalExpenses = dataExpenses.reduce((acc, curr) => acc + curr.amount, 0)
    const netIncome = totalGrossIncome - totalExpenses

    const chartData = [
        { name: 'Ingresos ($)', amount: totalGrossIncome, fill: '#22c55e' },
        { name: 'Egresos ($)', amount: totalExpenses, fill: '#ef4444' },
        { name: 'Utilidad Neta ($)', amount: netIncome, fill: '#3b82f6' }
    ]

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto">
            <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                <h1 className="text-xl font-bold uppercase tracking-wide">CONTROL DE INGRESOS y EGRESOS POR ARRENDAMIENTOS</h1>
                <div className="flex justify-end mt-2">
                    <span className="border border-black px-4 py-1 font-bold uppercase">{month} {year}</span>
                </div>
            </div>

            {/* CHART SECTION */}
            <div className="mb-8 h-[300px] w-full print:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="amount" name="Monto ($)" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* TABLE 1: INGRESOS EN DOLARES */}
            <div className="mb-8">
                <div className="bg-gray-600 text-white text-center font-bold py-1 uppercase text-sm">
                    INGRESOS EN DOLARES $
                </div>
                <Table className="border border-black text-xs">
                    <TableHeader>
                        <TableRow className="border-b border-black hover:bg-transparent">
                            <TableHead className="border-r border-black text-black font-bold h-8">FECHA</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 w-[40%]">CONCEPTO</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 text-right">DEBE</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 text-right">HABER</TableHead>
                            <TableHead className="text-black font-bold h-8 text-right">SALDO $</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dataUsd.map((row, index) => (
                            <TableRow key={index} className="border-b border-gray-300 hover:bg-transparent">
                                <TableCell className="border-r border-black py-1">{row.date}</TableCell>
                                <TableCell className="border-r border-black py-1 uppercase">{row.concept}</TableCell>
                                <TableCell className="border-r border-black py-1 text-right">{row.debit ? row.debit.toFixed(2) : ''}</TableCell>
                                <TableCell className="border-r border-black py-1 text-right">{row.credit ? row.credit.toFixed(2) : ''}</TableCell>
                                <TableCell className="py-1 text-right">{row.balance.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="border-t-2 border-black hover:bg-transparent">
                            <TableCell colSpan={3} className="text-right font-bold border-r border-black py-1">TOTAL INGRESO EN $</TableCell>
                            <TableCell className="text-right font-bold border-r border-black py-1">{totalIncomeUsd.toFixed(2)}</TableCell>
                            <TableCell className="py-1"></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* TABLE 2: INGRESOS EN BOLIVARES */}
            <div className="mb-8">
                <div className="bg-gray-300 text-black text-center font-bold py-1 uppercase text-sm border border-black border-b-0">
                    INGRESOS EN BOLIVARES ( ) Y LLEVADOS A DOLARES
                </div>
                <Table className="border border-black text-xs">
                    <TableHeader>
                        <TableRow className="border-b border-black hover:bg-transparent">
                            <TableHead className="border-r border-black text-black font-bold h-8">FECHA</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 w-[35%]">CONCEPTO</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 text-right">DEBE</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 text-right">HABER Bs.</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 text-right">SALDO Bs.</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 text-right">TASA</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 text-right">INGRESO EN $</TableHead>
                            <TableHead className="text-black font-bold h-8 text-right">SALDO $</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dataBs.map((row, index) => (
                            <TableRow key={index} className="border-b border-gray-300 hover:bg-transparent">
                                <TableCell className="border-r border-black py-1">{row.date}</TableCell>
                                <TableCell className="border-r border-black py-1 uppercase">{row.concept}</TableCell>
                                <TableCell className="border-r border-black py-1 text-right">{row.debit ? row.debit.toFixed(2) : ''}</TableCell>
                                <TableCell className="border-r border-black py-1 text-right">{row.credit ? row.credit.toFixed(2) : ''}</TableCell>
                                <TableCell className="border-r border-black py-1 text-right">{row.balance.toFixed(2)}</TableCell>
                                <TableCell className="border-r border-black py-1 text-right">{row.rate?.toFixed(2)}</TableCell>
                                <TableCell className="border-r border-black py-1 text-right">{row.incomeUsd?.toFixed(2)}</TableCell>
                                <TableCell className="py-1 text-right">{row.balanceUsd?.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="border-t-2 border-black hover:bg-transparent">
                            <TableCell colSpan={6} className="text-right font-bold border-r border-black py-1">TOTAL CONVERTIDO A $</TableCell>
                            <TableCell className="text-right font-bold border-r border-black py-1">{totalIncomeBsConverted.toFixed(2)}</TableCell>
                            <TableCell className="py-1"></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* TABLE 3: EXPENSES */}
            <div className="mb-8">
                <div className="bg-red-800 text-white text-center font-bold py-1 uppercase text-sm">
                    EGRESOS / GASTOS OPERATIVOS
                </div>
                <Table className="border border-black text-xs">
                    <TableHeader>
                        <TableRow className="border-b border-black hover:bg-transparent">
                            <TableHead className="border-r border-black text-black font-bold h-8">FECHA</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8">CATEGORÍA</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 w-[40%]">DESCRIPCIÓN</TableHead>
                            <TableHead className="text-black font-bold h-8 text-right">MONTO ($)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dataExpenses.length > 0 ? (
                            dataExpenses.map((expense, index) => (
                                <TableRow key={index} className="border-b border-gray-300 hover:bg-transparent">
                                    <TableCell className="border-r border-black py-1">{expense.date}</TableCell>
                                    <TableCell className="border-r border-black py-1 uppercase">{expense.category}</TableCell>
                                    <TableCell className="border-r border-black py-1 uppercase">{expense.description}</TableCell>
                                    <TableCell className="py-1 text-right">{expense.amount.toFixed(2)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow className="border-b border-gray-300 hover:bg-transparent">
                                <TableCell colSpan={4} className="py-2 text-center text-gray-500 italic">No hay gastos registrados en este período.</TableCell>
                            </TableRow>
                        )}
                        <TableRow className="border-t-2 border-black hover:bg-transparent bg-red-50">
                            <TableCell colSpan={3} className="text-right font-bold border-r border-black py-1">TOTAL EGRESOS</TableCell>
                            <TableCell className="text-right font-bold py-1 text-red-700">{totalExpenses.toFixed(2)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* SUMMARY SECTION */}
            <div className="mb-8 flex justify-end">
                <div className="w-1/3 border-2 border-black">
                    <div className="flex justify-between px-4 py-2 border-b border-black bg-gray-100">
                        <span className="font-bold">TOTAL INGRESOS BRUTOS:</span>
                        <span className="font-bold text-green-700">{totalGrossIncome.toFixed(2)} $</span>
                    </div>
                    <div className="flex justify-between px-4 py-2 border-b border-black bg-gray-100">
                        <span className="font-bold">TOTAL EGRESOS:</span>
                        <span className="font-bold text-red-700">-{totalExpenses.toFixed(2)} $</span>
                    </div>
                    <div className="flex justify-between px-4 py-2 bg-blue-50">
                        <span className="font-bold text-lg">UTILIDAD NETA:</span>
                        <span className="font-bold text-lg text-blue-800">{netIncome.toFixed(2)} $</span>
                    </div>
                </div>
            </div>

            {/* TABLE 4: DISTRIBUTION */}
            {dataDistribution && (
                <div>
                    <div className="bg-gray-800 text-white text-center font-bold py-1 uppercase text-sm">
                        DISTRIBUCIÓN DE UTILIDADES
                    </div>
                    <Table className="border border-black text-xs">
                        <TableHeader>
                            <TableRow className="border-b border-black hover:bg-transparent">
                                <TableHead className="border-r border-black text-black font-bold h-8">PROPIETARIO</TableHead>
                                <TableHead className="border-r border-black text-black font-bold h-8 text-right">% PARTICIPACIÓN</TableHead>
                                <TableHead className="text-black font-bold h-8 text-right">MONTO A PAGAR ($)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dataDistribution.map((row, index) => (
                                <TableRow key={index} className="border-b border-gray-300 hover:bg-transparent">
                                    <TableCell className="border-r border-black py-1 uppercase">{row.owner}</TableCell>
                                    <TableCell className="border-r border-black py-1 text-right">{row.percentage}%</TableCell>
                                    <TableCell className="py-1 text-right font-bold">
                                        {/* Recalculate based on Net Income if needed, or use passed value */}
                                        {((netIncome * row.percentage) / 100).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
})

IncomeExpenseReport.displayName = "IncomeExpenseReport"
