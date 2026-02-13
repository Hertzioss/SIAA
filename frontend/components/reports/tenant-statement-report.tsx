import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TenantStatementData } from '@/hooks/use-tenant-statement'

interface TenantStatementReportProps {
    data: TenantStatementData
}

/**
 * Preview / printable component for the tenant account statement.
 * Follows the same pattern as OperationalReport (forwardRef, inline render).
 */
export const TenantStatementReport = React.forwardRef<HTMLDivElement, TenantStatementReportProps>(({ data }, ref) => {
    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto">
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wide">ESTADO DE CUENTA</h1>
                    <p className="text-sm text-gray-500">Período: {data.period}</p>
                </div>

                {/* Tenant Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-100 p-4 rounded-lg">
                    <div>
                        <p className="text-sm"><span className="font-bold">Inquilino:</span> {data.tenantName}</p>
                        <p className="text-sm"><span className="font-bold">Cédula/RIF:</span> {data.tenantDocId}</p>
                        {data.tenantPhone && <p className="text-sm"><span className="font-bold">Teléfono:</span> {data.tenantPhone}</p>}
                        {data.tenantEmail && <p className="text-sm"><span className="font-bold">Correo:</span> {data.tenantEmail}</p>}
                    </div>
                    {data.contractInfo && (
                        <div>
                            <p className="text-sm"><span className="font-bold">Propiedad:</span> {data.contractInfo.propertyName}</p>
                            <p className="text-sm"><span className="font-bold">Unidad:</span> {data.contractInfo.unitName}</p>
                            <p className="text-sm"><span className="font-bold">Canon Mensual:</span> ${data.contractInfo.rentAmount.toFixed(2)}</p>
                        </div>
                    )}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-blue-700">PAGOS REGISTRADOS</p>
                        <p className="text-2xl font-bold text-blue-700">{data.payments.length}</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg text-center">
                        <p className="text-sm font-bold text-green-700">TOTAL PAGADO</p>
                        <p className="text-2xl font-bold text-green-700">${data.totalPaid.toFixed(2)}</p>
                    </div>
                    {data.contractInfo && (
                        <div className="bg-gray-100 p-4 rounded-lg text-center">
                            <p className="text-sm font-bold text-gray-600">CANON MENSUAL</p>
                            <p className="text-2xl font-bold text-gray-800">${data.contractInfo.rentAmount.toFixed(2)}</p>
                        </div>
                    )}
                </div>

                {/* Payments Table */}
                {data.payments.length === 0 ? (
                    <div className="text-center text-gray-400 py-12 border rounded-lg">
                        No se encontraron pagos en este período.
                    </div>
                ) : (
                    <Table className="border border-black text-xs">
                        <TableHeader>
                            <TableRow className="border-b border-black">
                                <TableHead className="text-black font-bold">FECHA</TableHead>
                                <TableHead className="text-black font-bold">CONCEPTO</TableHead>
                                <TableHead className="text-black font-bold">MÉTODO</TableHead>
                                <TableHead className="text-black font-bold">REFERENCIA</TableHead>
                                <TableHead className="text-black font-bold text-right">MONTO ($)</TableHead>
                                <TableHead className="text-black font-bold text-right">MONTO (Bs)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.payments.map((p, idx) => (
                                <TableRow key={idx} className="border-b border-gray-300">
                                    <TableCell>{p.date}</TableCell>
                                    <TableCell className="font-medium">{p.concept}</TableCell>
                                    <TableCell>{p.method}</TableCell>
                                    <TableCell>{p.reference}</TableCell>
                                    <TableCell className="text-right font-medium">${p.amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-gray-500">
                                        {p.currency === 'VES' && p.amountOriginal
                                            ? `Bs ${p.amountOriginal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                            : '-'
                                        }
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        {/* Totals */}
                        <TableBody>
                            <TableRow className="bg-gray-200 font-bold border-t-2 border-black">
                                <TableCell colSpan={4} className="text-right uppercase">Total Pagado</TableCell>
                                <TableCell className="text-right text-green-700 text-sm">${data.totalPaid.toFixed(2)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    )
})

TenantStatementReport.displayName = "TenantStatementReport"
