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
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto">
            <div className="space-y-8">
                {/* Header */}
                <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wide">REPORTE FINANCIERO POR PROPIETARIO</h1>
                    <p className="text-sm text-gray-500">Resumen de ingresos y egresos por propietario</p>
                    <p className="text-sm text-gray-500 font-medium mt-1 uppercase">{period}</p>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-100 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-green-700">INGRESOS TOTALES</p>
                        <p className="text-2xl font-bold text-green-700">{formatMoney(totalIncomeUsd)}</p>
                        <p className="text-xs text-green-600">{formatMoney(totalIncomeBs, 'Bs')}</p>
                    </div>
                    <div className="bg-red-100 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-red-700">EGRESOS TOTALES</p>
                        <p className="text-2xl font-bold text-red-700">{formatMoney(totalExpensesUsd)}</p>
                        <p className="text-xs text-red-600">{formatMoney(totalExpensesBs, 'Bs')}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-blue-700">BALANCE NETO</p>
                        <p className={cn("text-2xl font-bold", netTotalUsd >= 0 ? "text-blue-700" : "text-yellow-700")}>{formatMoney(netTotalUsd)}</p>
                        <p className={cn("text-xs", netTotalBs >= 0 ? "text-blue-600" : "text-yellow-600")}>{formatMoney(netTotalBs, 'Bs')}</p>
                    </div>
                </div>

                {/* Owner Summary Table */}
                <div>
                    <h2 className="text-lg font-bold mb-2 bg-gray-200 p-2 rounded">Resumen por Propietario</h2>
                    <Table className="border border-black text-xs">
                        <TableHeader>
                            <TableRow className="border-b border-black">
                                <TableHead className="text-black font-bold">PROPIETARIO</TableHead>
                                <TableHead className="text-black font-bold">DOCUMENTO</TableHead>
                                <TableHead className="text-black font-bold text-center">PROP.</TableHead>
                                <TableHead className="text-black font-bold text-right">INGRESOS ($)</TableHead>
                                <TableHead className="text-black font-bold text-right">INGRESOS (Bs)</TableHead>
                                <TableHead className="text-black font-bold text-right">EGRESOS ($)</TableHead>
                                <TableHead className="text-black font-bold text-right">EGRESOS (Bs)</TableHead>
                                <TableHead className="text-black font-bold text-right">BALANCE ($)</TableHead>
                                <TableHead className="text-black font-bold text-right">BALANCE (Bs)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                                        No se encontraron registros en este periodo.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {data.map((item) => (
                                        <TableRow key={item.ownerId} className="border-b border-gray-300">
                                            <TableCell className="font-medium">{item.ownerName}</TableCell>
                                            <TableCell>{item.ownerDocId}</TableCell>
                                            <TableCell className="text-center">{item.propertyCount}</TableCell>
                                            <TableCell className="text-right text-green-700">{formatMoney(item.totalIncomeUsd)}</TableCell>
                                            <TableCell className="text-right text-green-700">{formatMoney(item.totalIncomeBs, 'Bs')}</TableCell>
                                            <TableCell className="text-right text-red-700">{formatMoney(item.totalExpensesUsd)}</TableCell>
                                            <TableCell className="text-right text-red-700">{formatMoney(item.totalExpensesBs, 'Bs')}</TableCell>
                                            <TableCell className="text-right font-bold">{formatMoney(item.netBalanceUsd)}</TableCell>
                                            <TableCell className="text-right font-bold">{formatMoney(item.netBalanceBs, 'Bs')}</TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Totals row */}
                                    <TableRow className="bg-gray-200 font-bold border-t-2 border-black">
                                        <TableCell colSpan={3} className="text-right uppercase">Totales</TableCell>
                                        <TableCell className="text-right text-green-700">{formatMoney(totalIncomeUsd)}</TableCell>
                                        <TableCell className="text-right text-green-700">{formatMoney(totalIncomeBs, 'Bs')}</TableCell>
                                        <TableCell className="text-right text-red-700">{formatMoney(totalExpensesUsd)}</TableCell>
                                        <TableCell className="text-right text-red-700">{formatMoney(totalExpensesBs, 'Bs')}</TableCell>
                                        <TableCell className="text-right">{formatMoney(netTotalUsd)}</TableCell>
                                        <TableCell className="text-right">{formatMoney(netTotalBs, 'Bs')}</TableCell>
                                    </TableRow>
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Payments Detail */}
                {data.some(d => d.payments.length > 0) && (
                    <div>
                        <h2 className="text-lg font-bold mb-2 bg-gray-200 p-2 rounded">Detalle de Pagos (Ingresos)</h2>
                        <Table className="border border-black text-xs">
                            <TableHeader>
                                <TableRow className="border-b border-black">
                                    <TableHead className="text-black font-bold">FECHA</TableHead>
                                    <TableHead className="text-black font-bold">PROPIETARIO</TableHead>
                                    <TableHead className="text-black font-bold">INQUILINO</TableHead>
                                    <TableHead className="text-black font-bold">UNIDAD</TableHead>
                                    <TableHead className="text-black font-bold">MÉTODO</TableHead>
                                    <TableHead className="text-black font-bold text-right">MONTO ORIG.</TableHead>
                                    <TableHead className="text-black font-bold text-right">TASA</TableHead>
                                    <TableHead className="text-black font-bold text-right">MONTO (Bs)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.flatMap(owner =>
                                    owner.payments.map((p, idx) => (
                                        <TableRow key={`${owner.ownerId}-pay-${idx}`} className="border-b border-gray-300">
                                            <TableCell>{p.date}</TableCell>
                                            <TableCell className="font-medium">{owner.ownerName}</TableCell>
                                            <TableCell>{p.tenantName}</TableCell>
                                            <TableCell>{p.unitName}</TableCell>
                                            <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                                            <TableCell className="text-right">
                                                {p.currency === 'VES' ? 'Bs.' : '$'} {Number(p.amountOriginal || p.amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right">{p.exchangeRate}</TableCell>
                                            <TableCell className="text-right font-medium">{formatMoney(p.amount, 'Bs')}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Expenses Detail */}
                {data.some(d => d.expenses.length > 0) && (
                    <div>
                        <h2 className="text-lg font-bold mb-2 bg-gray-200 p-2 rounded">Detalle de Egresos</h2>
                        <Table className="border border-black text-xs">
                            <TableHeader>
                                <TableRow className="border-b border-black">
                                    <TableHead className="text-black font-bold">FECHA</TableHead>
                                    <TableHead className="text-black font-bold">PROPIETARIO</TableHead>
                                    <TableHead className="text-black font-bold">CATEGORÍA</TableHead>
                                    <TableHead className="text-black font-bold">DETALLE</TableHead>
                                    <TableHead className="text-black font-bold text-right">MONTO ORIG.</TableHead>
                                    <TableHead className="text-black font-bold text-right">TASA</TableHead>
                                    <TableHead className="text-black font-bold text-right">MONTO (Bs)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.flatMap(owner =>
                                    owner.expenses.map((e, idx) => (
                                        <TableRow key={`${owner.ownerId}-exp-${idx}`} className="border-b border-gray-300">
                                            <TableCell>{e.date ? e.date.split('T')[0] : '-'}</TableCell>
                                            <TableCell className="font-medium">{owner.ownerName}</TableCell>
                                            <TableCell>{e.category}</TableCell>
                                            <TableCell>{e.description}</TableCell>
                                            <TableCell className="text-right">
                                                {e.currency === 'VES' ? 'Bs.' : '$'} {Number(e.amountOriginal).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right">{e.exchangeRate}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                Bs {Number(e.amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    )
})

OwnerFinancialReport.displayName = "OwnerFinancialReport"
