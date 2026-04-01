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
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[850px] mx-auto shadow-sm border border-gray-100 rounded-sm [print-color-adjust:exact]">
            <div className="space-y-8">
                {/* 1. Header */}
                <div className="border-b-2 border-gray-800 pb-6">
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">ESTADO DE CUENTA</h1>
                            <p className="text-md font-medium text-gray-500 uppercase mt-1 tracking-wider">Ingresos y Egresos Generales</p>
                        </div>
                        <div className="text-right mt-2 md:mt-0 print:mt-0">
                            <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-200">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Período del Reporte</p>
                                <p className="text-sm font-semibold text-gray-900 uppercase">{month} {year}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Unified Table */}
                <div className="pt-2">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">1. Movimientos del Período (USD)</h3>
                    <div className="border border-gray-300 rounded overflow-hidden">
                                    <Table className="text-[10px]">
                            <TableHeader>
                                <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="text-gray-900 font-bold w-[100px]">FECHA</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[150px] min-w-[150px] max-w-[150px] whitespace-normal break-words">INQUILINO / ENTIDAD</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[35%]">CONCEPTO / DESCRIPCIÓN</TableHead>
                                    <TableHead className="text-gray-900 font-bold text-right text-rose-700">DEBE (EGRESOS)</TableHead>
                                    <TableHead className="text-gray-900 font-bold text-right text-emerald-700">HABER (INGRESOS)</TableHead>
                                    <TableHead className="text-gray-900 font-bold text-right">SALDO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.length > 0 ? (
                                    movements.map((row, index) => (
                                        <TableRow key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                            <TableCell className="font-medium text-gray-600">{row.date}</TableCell>
                                            <TableCell className="font-medium w-[150px] min-w-[150px] max-w-[150px] whitespace-normal break-words leading-tight">
                                                {row.tenantName ? row.tenantName : '-'}
                                            </TableCell>
                                            <TableCell className="whitespace-pre-wrap break-words">
                                                {row.concept}
                                                {row.type === 'income_bs' && (
                                                    <span className="block text-[10px] text-gray-500 italic mt-1 font-medium">
                                                        (Conv. Bs. {row.originalAmount?.toLocaleString('es-VE')} @ {row.rate})
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-rose-600 font-bold py-1">
                                                {row.debit > 0 ? row.debit.toFixed(2) : ''}
                                            </TableCell>
                                            <TableCell className="text-right text-emerald-600 font-bold py-1">
                                                {row.credit > 0 ? row.credit.toFixed(2) : ''}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-gray-900 py-1">
                                                {row.balance.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                            No hay movimientos registrados en este período.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* 3. Distribution Table */}
                {dataDistribution && dataDistribution.length > 0 && (
                    <div className="pt-2">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">2. Distribución de Utilidades</h3>
                        <div className="border border-gray-300 rounded overflow-hidden">
                                        <Table className="text-[10px]">
                                <TableHeader>
                                    <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                        <TableHead className="text-gray-900 font-bold">PROPIETARIO</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-right">% PARTICIPACIÓN</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-right">MONTO A PAGAR ($)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dataDistribution.map((row, index) => (
                                        <TableRow key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                            <TableCell className="font-medium text-gray-900 uppercase">{row.owner}</TableCell>
                                            <TableCell className="text-right text-gray-600 font-bold">{row.percentage}%</TableCell>
                                            <TableCell className="text-right font-bold text-gray-900">
                                                {((netIncome * row.percentage) / 100).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* 4. Executive Summary */}
                <div className="pt-6 break-inside-avoid">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Resumen Operativo</h3>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white border-l-4 border-emerald-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Total Ingresos Brutos</p>
                            <p className="text-2xl font-black text-gray-900">${totalGrossIncome.toFixed(2)}</p>
                        </div>
                        <div className="bg-white border-l-4 border-rose-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Total Egresos</p>
                            <p className="text-2xl font-black text-gray-900">-${totalExpenses.toFixed(2)}</p>
                        </div>
                        <div className={`bg-white border-l-4 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100 ${netIncome >= 0 ? "border-blue-500" : "border-amber-500"}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${netIncome >= 0 ? "text-blue-600" : "text-amber-600"}`}>Utilidad Neta</p>
                            <p className="text-2xl font-black text-gray-900">${netIncome.toFixed(2)}</p>
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

IncomeExpenseReport.displayName = "IncomeExpenseReport"
