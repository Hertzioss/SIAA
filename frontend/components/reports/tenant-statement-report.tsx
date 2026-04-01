import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TenantStatementData } from '@/hooks/use-tenant-statement'

interface TenantStatementReportProps {
    data: TenantStatementData
}

const formatMoney = (amount: number, currency: 'USD' | 'Bs' = 'USD') => {
    if (currency === 'Bs') {
        return `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'symbol' }).format(amount)
}

/**
 * Preview / printable component for the tenant account statement.
 * Follows the same pattern as OperationalReport (forwardRef, inline render).
 */
export const TenantStatementReport = React.forwardRef<HTMLDivElement, TenantStatementReportProps>(({ data }, ref) => {
    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans w-full max-w-[1000px] mx-auto shadow-sm border border-gray-100 rounded-sm [print-color-adjust:exact]">
            <div className="space-y-8">
                {/* 1. Header & Tenant Info */}
                <div className="border-b-2 border-gray-800 pb-6">
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">ESTADO DE CUENTA</h1>
                            <p className="text-md font-medium text-gray-500 uppercase mt-1 tracking-wider">Reporte de Inquilino</p>
                        </div>
                        <div className="text-right mt-2 md:mt-0 print:mt-0">
                            <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-200">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Período del Reporte</p>
                                <p className="text-sm font-semibold text-gray-900">{data.period}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Datos del Arrendatario</h2>
                        <div className="flex items-center justify-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-xl">
                                    {data.tenantName.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-slate-900">{data.tenantName}</p>
                                    <p className="text-sm text-slate-600 mt-0.5"><span className="font-semibold">{data.tenantDocId}</span></p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 mt-2">
                            <div>
                                {data.tenantPhone && <p className="text-sm text-gray-600"><span className="font-bold">Teléfono:</span> {data.tenantPhone}</p>}
                                {data.tenantEmail && <p className="text-sm text-gray-600"><span className="font-bold">Correo:</span> {data.tenantEmail}</p>}
                            </div>
                            {data.contractInfo && (
                                <div className="md:text-right print:text-right">
                                    <p className="text-sm text-gray-600"><span className="font-bold">Inmueble:</span> {data.contractInfo.propertyName}</p>
                                    <p className="text-sm text-gray-600"><span className="font-bold">Unidad:</span> {data.contractInfo.unitName}</p>
                                    <p className="text-sm text-gray-600"><span className="font-bold">Canon Mensual:</span> ${data.contractInfo.rentAmount.toFixed(2)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Details (Payments) */}
                <div className="space-y-6 pt-2">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 bg-gray-100 p-2 rounded">1. Detalle de Pagos Realizados</h3>
                        {data.payments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                No se registraron pagos en este período.
                            </div>
                        ) : (
                            <div className="border border-gray-300 rounded overflow-hidden">
                                <Table className="text-[10px]">
                                    <TableHeader>
                                        <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                            <TableHead className="text-gray-900 font-bold w-[100px]">FECHA</TableHead>
                                            <TableHead className="text-gray-900 font-bold w-[200px] min-w-[200px] max-w-[200px] whitespace-normal break-words">CONCEPTO</TableHead>
                                            <TableHead className="text-gray-900 font-bold">MÉTODO</TableHead>
                                            <TableHead className="text-gray-900 font-bold">REFERENCIA</TableHead>
                                            <TableHead className="text-gray-900 font-bold text-right">MONTO ORIG.</TableHead>
                                            <TableHead className="text-gray-900 font-bold text-right text-gray-500">TASA</TableHead>
                                            <TableHead className="text-gray-900 font-bold text-right">MONTO (Bs)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.payments.map((p, idx) => (
                                            <TableRow key={idx} className={`border-b border-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                                <TableCell className="font-medium text-gray-600">{p.date}</TableCell>
                                                <TableCell className="font-medium w-[200px] min-w-[200px] max-w-[200px] whitespace-normal break-words leading-tight">{p.concept}</TableCell>
                                                <TableCell>{p.method}</TableCell>
                                                <TableCell>{p.reference || '-'}</TableCell>
                                                <TableCell className="text-right font-bold text-gray-900">
                                                    {p.currency === 'VES' ? 'Bs. ' : '$ '}
                                                    {Number(p.amountOriginal || p.amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right text-gray-400 italic">
                                                    {p.exchangeRate ? p.exchangeRate.toFixed(2) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-gray-500">
                                                    {p.exchangeRate && p.exchangeRate > 0
                                                        ? formatMoney(p.amount * p.exchangeRate, 'Bs')
                                                        : '-'
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Executive Summary */}
                <div className="pt-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 border-b pb-2">Resumen Operativo</h3>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white border-l-4 border-emerald-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Total Pagado</p>
                            <p className="text-2xl font-black text-gray-900">{formatMoney(data.totalPaidBs, 'Bs')}</p>
                            <p className="text-sm text-gray-500 mt-1 font-medium">{formatMoney(data.totalPaid)}</p>
                        </div>
                        <div className="bg-white border-l-4 border-blue-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Pagos Registrados</p>
                            <p className="text-2xl font-black text-gray-900">{data.payments.length}</p>
                        </div>
                        <div className="bg-white border-l-4 border-slate-500 shadow-sm p-4 rounded-r-lg border-y border-r border-gray-100">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Canon Mensual</p>
                            <p className="text-2xl font-black text-gray-900">{formatMoney(data.contractInfo?.rentAmount || 0)}</p>
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

TenantStatementReport.displayName = "TenantStatementReport"
