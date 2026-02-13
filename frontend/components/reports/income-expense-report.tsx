import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Movement {
    date: string
    tenantName?: string
    concept: string
    debit: number
    credit: number
    balance: number
    type: 'income_usd' | 'income_bs' | 'expense'
    originalAmount?: number
    rate?: number
}

interface Distribution {
    owner: string
    percentage: number
    amount: number
}

interface IncomeExpenseReportProps {
    month: string
    year: string
    dataUsd: any[]
    dataBs: any[]
    dataExpenses?: {
        date: string
        category: string
        description: string
        amount: number
        status: string
    }[]
    dataDistribution?: Distribution[]
}

/**
 * Componente de reporte financiero tipo Estado de Cuenta.
 * Genera una vista imprimible con una tabla unificada cronológica de ingresos y egresos.
 */
export const IncomeExpenseReport = React.forwardRef<HTMLDivElement, IncomeExpenseReportProps>(({ month, year, dataUsd, dataBs, dataExpenses = [], dataDistribution }, ref) => {

    const totalIncomeUsd = dataUsd.reduce((acc: number, curr: any) => acc + (curr.credit || 0), 0)
    const totalIncomeBsConverted = dataBs.reduce((acc: number, curr: any) => acc + (curr.incomeUsd || 0), 0)
    const totalGrossIncome = totalIncomeUsd + totalIncomeBsConverted

    const totalExpenses = dataExpenses.reduce((acc, curr) => acc + curr.amount, 0)
    const netIncome = totalGrossIncome - totalExpenses

    // Unify and sort movements
    const movements = React.useMemo(() => {
        const unified: Movement[] = []

        // 1. Incomes USD
        dataUsd.forEach((item: any) => {
            unified.push({
                date: item.date,
                tenantName: item.tenantName,
                concept: item.concept,
                debit: 0,
                credit: item.credit || 0,
                balance: 0,
                type: 'income_usd'
            })
        })

        // 2. Incomes Bs (Converted to USD)
        dataBs.forEach((item: any) => {
            unified.push({
                date: item.date,
                tenantName: item.tenantName,
                concept: item.concept,
                debit: 0,
                credit: item.incomeUsd || 0,
                balance: 0,
                type: 'income_bs',
                originalAmount: item.balance,
                rate: item.rate
            })
        })

        // 3. Expenses
        dataExpenses.forEach(item => {
            unified.push({
                date: item.date,
                concept: `${item.category} - ${item.description}`,
                debit: item.amount,
                credit: 0,
                balance: 0,
                type: 'expense'
            })
        })

        // Sort by date ascending
        unified.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Calculate running balance
        let runningBalance = 0
        return unified.map(m => {
            runningBalance += (m.credit - m.debit)
            return { ...m, balance: runningBalance }
        })
    }, [dataUsd, dataBs, dataExpenses])

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto">
            <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                <h1 className="text-xl font-bold uppercase tracking-wide">ESTADO DE CUENTA - INGRESOS Y EGRESOS</h1>
                <div className="flex justify-end mt-2">
                    <span className="border border-black px-4 py-1 font-bold uppercase">{month} {year}</span>
                </div>
            </div>

            {/* UNIFIED TABLE */}
            <div className="mb-8">
                <div className="bg-gray-800 text-white text-center font-bold py-1 uppercase text-sm">
                    MOVIMIENTOS DEL PERÍODO (USD)
                </div>
                <Table className="border border-black text-xs">
                    <TableHeader>
                        <TableRow className="border-b border-black hover:bg-transparent">
                            <TableHead className="border-r border-black text-black font-bold h-8">FECHA</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8">INQUILINO / ENTIDAD</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 w-[40%]">CONCEPTO / DESCRIPCIÓN</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 text-right text-red-700">DEBE (EGRESOS)</TableHead>
                            <TableHead className="border-r border-black text-black font-bold h-8 text-right text-green-700">HABER (INGRESOS)</TableHead>
                            <TableHead className="text-black font-bold h-8 text-right">SALDO</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {movements.length > 0 ? (
                            movements.map((row, index) => (
                                <TableRow key={index} className="border-b border-gray-300 hover:bg-transparent">
                                    <TableCell className="border-r border-black py-1">{row.date}</TableCell>
                                    <TableCell className="border-r border-black py-1 font-medium">
                                        {row.tenantName ? row.tenantName : '-'}
                                    </TableCell>
                                    <TableCell className="border-r border-black py-1 uppercase">
                                        {row.concept}
                                        {row.type === 'income_bs' && (
                                            <span className="block text-[10px] text-gray-500 italic">
                                                (Conv. Bs. {row.originalAmount?.toLocaleString('es-VE')} @ {row.rate})
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="border-r border-black py-1 text-right text-red-700">
                                        {row.debit > 0 ? row.debit.toFixed(2) : ''}
                                    </TableCell>
                                    <TableCell className="border-r border-black py-1 text-right text-green-700">
                                        {row.credit > 0 ? row.credit.toFixed(2) : ''}
                                    </TableCell>
                                    <TableCell className="py-1 text-right font-bold">
                                        {row.balance.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 italic text-gray-500">
                                    No hay movimientos registrados en este período.
                                </TableCell>
                            </TableRow>
                        )}
                        <TableRow className="border-t-2 border-black hover:bg-transparent bg-gray-100">
                            <TableCell colSpan={3} className="text-right font-bold border-r border-black py-1">TOTALES</TableCell>
                            <TableCell className="text-right font-bold border-r border-black py-1 text-red-700">
                                {totalExpenses.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold border-r border-black py-1 text-green-700">
                                {totalGrossIncome.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold py-1">
                                {netIncome.toFixed(2)}
                            </TableCell>
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

            {/* TABLE: DISTRIBUTION */}
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
