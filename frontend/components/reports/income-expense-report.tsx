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
    property: string
    percentage: number | null
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
        originalAmount?: number
        rate?: number
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

    const totalIncomeBs = [...dataUsd, ...dataBs].reduce((acc: number, curr: any) => acc + (curr.originalAmount || 0), 0)
    const totalExpenses = dataExpenses.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0)
    const totalExpensesBs = React.useMemo(() => dataExpenses.reduce((acc, curr) => acc + (curr.originalAmount || 0), 0), [dataExpenses])
    const totalNetBs = totalIncomeBs - totalExpensesBs
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
                type: 'income_usd',
                originalAmount: item.originalAmount,
                rate: item.rate
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
                originalAmount: item.credit,
                rate: item.rate
            })
        })

        // 3. Expenses
        dataExpenses.forEach(item => {
            unified.push({
                date: item.date,
                tenantName: item.category || "EGRESO GENERAL",
                concept: item.description,
                debit: item.amount,
                credit: 0,
                balance: 0,
                type: 'expense',
                originalAmount: item.originalAmount,
                rate: item.rate
            })
        })

        // Sort by date ascending
        unified.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-')).getTime();
            const dateB = new Date(b.date.split('/').reverse().join('-')).getTime();
            return dateA - dateB;
        })

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
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">1. Movimientos del Período</h3>
                    <div className="border border-gray-300 rounded overflow-hidden">
                                     <Table className="text-[10px]">
                            <TableHeader>
                                <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="text-gray-900 font-bold w-[90px]">FECHA</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[120px] min-w-[120px] max-w-[120px] whitespace-normal break-words">INQUILINO / ENTIDAD</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[30%]">CONCEPTO / DESCRIPCIÓN</TableHead>
                                    <TableHead className="text-gray-900 font-bold text-center w-[60px]">TASA</TableHead>
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
                                            <TableCell className="font-medium w-[120px] min-w-[120px] max-w-[120px] whitespace-normal break-words leading-tight">
                                                {row.tenantName ? row.tenantName : '-'}
                                            </TableCell>
                                            <TableCell className="whitespace-pre-wrap break-words">
                                                {row.concept}
                                            </TableCell>
                                            <TableCell className="text-center font-medium text-slate-500">
                                                {(row.rate ?? 0) > 0 ? row.rate?.toFixed(2) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-rose-600 font-bold py-1">
                                                {row.debit > 0 ? (
                                                    <>
                                                        <span className="block">${row.debit.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        {row.originalAmount && row.originalAmount > 0 && (
                                                            <span className="block text-[8px] text-slate-500 italic mt-0.5 font-bold">
                                                                Bs. {row.originalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : ''}
                                            </TableCell>
                                            <TableCell className="text-right text-emerald-600 font-bold py-1">
                                                {row.credit > 0 ? (
                                                    <>
                                                        <span className="block">${row.credit.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        {row.originalAmount && row.originalAmount > 0 && (
                                                            <span className="block text-[8px] text-slate-500 italic mt-0.5 font-bold">
                                                                Bs. {row.originalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : ''}
                                            </TableCell>
                                            <TableCell className="text-right font-bold py-1">
                                                ${row.balance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                        <TableHead className="text-gray-900 font-bold">INMUEBLE</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-center">% PARTICIPACIÓN</TableHead>
                                        <TableHead className="text-gray-900 font-bold text-right">MONTO A PAGAR ($)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dataDistribution.map((item, index) => (
                                        <TableRow key={index} className="border-b border-gray-200">
                                            <TableCell className="font-bold py-1 uppercase">{item.owner}</TableCell>
                                            <TableCell className="py-1 uppercase text-gray-600 italic text-[9px]">{item.property}</TableCell>
                                            <TableCell className="text-center font-medium py-1">
                                                {item.percentage !== null ? `${item.percentage.toFixed(2)}%` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold py-1 text-emerald-800">
                                                ${item.amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Ingresos Brutos</p>
                            <p className="text-xl font-black text-gray-900">
                                Bs. {totalIncomeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm font-bold text-gray-500 mt-1">
                                ${totalGrossIncome.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            </p>
                        </div>
                        <div className="bg-white border-l-4 border-rose-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Total Egresos</p>
                            <p className="text-xl font-black text-gray-900">
                                Bs. {totalExpensesBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm font-bold text-gray-500 mt-1">
                                ${totalExpenses.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            </p>
                        </div>
                        <div className={`bg-white border-l-4 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100 ${netIncome >= 0 ? "border-blue-500" : "border-amber-500"}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${netIncome >= 0 ? "text-blue-600" : "text-amber-600"}`}>Utilidad Neta</p>
                            <p className="text-xl font-black text-gray-900">
                                Bs. {totalNetBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm font-bold text-gray-500 mt-1">
                                ${netIncome.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            </p>
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
