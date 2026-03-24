import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OwnerReportItem } from '@/hooks/use-owner-report'
import { cn } from '@/lib/utils'

interface OwnerFinancialReportProps {
    data: OwnerReportItem[]
    period: string
}

const formatMoney = (amount: number, currency: 'USD' | 'Bs' = 'USD') => {
    if (currency === 'Bs') {
        return `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'symbol' }).format(amount)
}

/**
 * Preview / printable component for the owner financial report.
 * Follows the same pattern as OperationalReport (forwardRef, inline render).
 */
export const OwnerFinancialReport = React.forwardRef<HTMLDivElement, OwnerFinancialReportProps>(({ data, period }, ref) => {
    const totalIncomeUsd = data.reduce((acc, curr) => acc + curr.totalIncomeUsd, 0)
    const totalIncomeBs = data.reduce((acc, curr) => acc + curr.totalIncomeBs, 0)
    const totalExpensesUsd = data.reduce((acc, curr) => acc + curr.totalExpensesUsd, 0)
    const totalExpensesBs = data.reduce((acc, curr) => acc + curr.totalExpensesBs, 0)
    const netTotalUsd = totalIncomeUsd - totalExpensesUsd
    const netTotalBs = totalIncomeBs - totalExpensesBs

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto shadow-sm border border-gray-100 rounded-sm">
            {data.length === 0 ? (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900">ESTADO DE CUENTA</h1>
                            <p className="text-sm font-medium text-gray-500 uppercase mt-1">Reporte Financiero de Propietario</p>
                        </div>
                        <div className="text-right mt-4 md:mt-0">
                            <p className="text-sm text-gray-500 font-medium uppercase bg-gray-100 px-3 py-1 rounded-md inline-block">
                                PERÍODO: {period}
                            </p>
                        </div>
                    </div>
                    <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        No hay movimientos registrados en el período seleccionado.
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* 1. Header & Owner Info */}
                    <div className="border-b-2 border-gray-800 pb-6">
                        <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6">
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">ESTADO DE CUENTA</h1>
                                <p className="text-md font-medium text-gray-500 uppercase mt-1 tracking-wider">Reporte Financiero</p>
                            </div>
                            <div className="text-right mt-2 md:mt-0 print:mt-0">
                                <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-200">
                                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Período del Reporte</p>
                                    <p className="text-sm font-semibold text-gray-900">{period}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Datos del Beneficiario</h2>
                            <div className="flex items-center justify-start">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <p className="text-xl font-bold text-slate-900">{data[0].ownerName}</p>
                                        <p className="text-sm text-slate-600 mt-0.5"> <span className="font-semibold">{data[0].ownerDocId}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Details */}
                    <div className="space-y-6 pt-2">
                        {/* Payments */}
                        {data[0].payments.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">1. Detalle de Ingresos</h3>
                                <div className="border border-gray-300 rounded overflow-hidden">
                                    <Table className="text-xs">
                                        <TableHeader>
                                            <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                                <TableHead className="text-gray-900 font-bold w-[100px]">FECHA</TableHead>
                                                <TableHead className="text-gray-900 font-bold">INQUILINO</TableHead>
                                                <TableHead className="text-gray-900 font-bold">EDIF / UNIDAD</TableHead>
                                                <TableHead className="text-gray-900 font-bold text-right">MONTO ORIG.</TableHead>
                                                <TableHead className="text-gray-900 font-bold text-right">TASA (Bs/USD)</TableHead>
                                                <TableHead className="text-gray-900 font-bold text-right">MONTO (Bs)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data[0].payments.map((p, idx) => (
                                                <TableRow key={`pay-${idx}`} className={cn("border-b border-gray-200", idx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                                                    <TableCell className="font-medium text-gray-600">{p.date}</TableCell>
                                                    <TableCell>{p.tenantName}</TableCell>
                                                    <TableCell>{p.propertyName} / {p.unitName}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {p.currency === 'VES' ? 'Bs.' : '$'} {Number(p.amountOriginal || p.amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right text-gray-500">{p.exchangeRate}</TableCell>
                                                    <TableCell className="text-right font-bold text-gray-900">{formatMoney(p.amount, 'Bs')}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Expenses */}
                        {data[0].expenses.length > 0 && (
                            <div className="pt-2">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">2. Detalle de Egresos</h3>
                                <div className="border border-gray-300 rounded overflow-hidden">
                                    <Table className="text-xs">
                                        <TableHeader>
                                            <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                                <TableHead className="text-gray-900 font-bold w-[100px]">FECHA</TableHead>
                                                <TableHead className="text-gray-900 font-bold w-[20%]">CATEGORÍA</TableHead>
                                                <TableHead className="text-gray-900 font-bold w-[40%]">DESCRIPCIÓN</TableHead>
                                                <TableHead className="text-gray-900 font-bold text-right">MONTO ORIG.</TableHead>
                                                <TableHead className="text-gray-900 font-bold text-right">TASA (Bs/USD)</TableHead>
                                                <TableHead className="text-gray-900 font-bold text-right">MONTO (Bs)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data[0].expenses.map((e, idx) => (
                                                <TableRow key={`exp-${idx}`} className={cn("border-b border-gray-200", idx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                                                    <TableCell className="font-medium text-gray-600">{e.date || '-'}</TableCell>
                                                    <TableCell className="w-[20%] whitespace-pre-wrap break-words ">{e.category}</TableCell>
                                                    <TableCell className="whitespace-pre-wrap break-words">{e.description}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {e.currency === 'VES' ? 'Bs.' : '$'} {Number(e.amountOriginal).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right text-gray-500">{e.exchangeRate}</TableCell>
                                                    <TableCell className="text-right font-bold text-gray-900">
                                                        Bs {Number(e.amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Executive Summary (Moved to Bottom) */}
                    <div className="pt-6">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Resumen de Movimientos</h3>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-white border-l-4 border-emerald-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Ingresos Totales</p>
                                <p className="text-2xl font-black text-gray-900">{formatMoney(totalIncomeUsd)}</p>
                                <p className="text-sm text-gray-500 mt-1 font-medium">{formatMoney(totalIncomeBs, 'Bs')}</p>
                            </div>
                            <div className="bg-white border-l-4 border-rose-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Egresos Totales</p>
                                <p className="text-2xl font-black text-gray-900">{formatMoney(totalExpensesUsd)}</p>
                                <p className="text-sm text-gray-500 mt-1 font-medium">{formatMoney(totalExpensesBs, 'Bs')}</p>
                            </div>
                            <div className={cn("bg-white border-l-4 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100", netTotalUsd >= 0 ? "border-blue-500" : "border-amber-500")}>
                                <p className={cn("text-xs font-bold uppercase tracking-wider mb-2", netTotalUsd >= 0 ? "text-blue-600" : "text-amber-600")}>Balance Neto</p>
                                <p className="text-2xl font-black text-gray-900">{formatMoney(netTotalUsd)}</p>
                                <p className="text-sm text-gray-500 mt-1 font-medium">{formatMoney(netTotalBs, 'Bs')}</p>
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
            )}
        </div>
    )
})

OwnerFinancialReport.displayName = "OwnerFinancialReport"
