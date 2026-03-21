import React from 'react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ContractDetailReportProps {
    contract: any | null
}

export const ContractDetailReport = React.forwardRef<HTMLDivElement, ContractDetailReportProps>(({ contract }, ref) => {
    if (!contract) return null;

    const startDate = contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: es }) : 'N/A'
    const endDate = contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: es }) : 'Indefinido'
    const statusText = contract.status === 'active' || contract.status === 'Activo' ? 'Activo' : 
                       contract.status === 'expired' || contract.status === 'Vencido' ? 'Vencido' : contract.status;

    return (
        <div ref={ref} className="p-10 bg-white text-black font-sans max-w-[800px] mx-auto shadow-sm border border-gray-100 rounded-sm">
            <div className="space-y-10">
                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-6 flex flex-col md:flex-row print:flex-row justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">CONTRATO</h1>
                        <p className="text-xl font-medium text-gray-500 uppercase mt-1 tracking-wider">Arrendamiento</p>
                    </div>
                    <div className="text-right mt-4 md:mt-0 print:mt-0">
                        <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-200">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Fecha de Emisión</p>
                            <p className="text-sm font-semibold text-gray-900">{format(new Date(), 'dd/MM/yyyy')}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 font-mono">REF: {contract.id.slice(0, 8)}</p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8">
                    {/* Arrendador / Propiedad */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50/50">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 border-b pb-2">Datos del Inmueble</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Propiedad</p>
                                <p className="text-sm font-bold text-gray-900">{contract.units?.properties?.name || contract.property?.split(' - ')[0] || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Unidad</p>
                                <p className="text-sm font-medium text-gray-800">{contract.units?.name || contract.property?.split(' - ')[1] || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Arrendatario */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50/50">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 border-b pb-2">Datos del Arrendatario</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Inquilino</p>
                                <p className="text-sm font-bold text-gray-900">{contract.tenants?.name || contract.tenant || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Documento de Identidad</p>
                                <p className="text-sm font-medium text-gray-800">{contract.tenants?.doc_id || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Condiciones del Contrato */}
                <div>
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-wider mb-4 border-b-2 border-gray-200 pb-2">Condiciones del Contrato</h3>
                    
                    <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-bold text-gray-600 bg-gray-50 w-1/3">Fecha de Inicio</td>
                                    <td className="py-3 px-4 text-gray-900 font-medium">{startDate}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-bold text-gray-600 bg-gray-50">Fecha de Culminación</td>
                                    <td className="py-3 px-4 text-gray-900 font-medium">{endDate}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-bold text-gray-600 bg-gray-50">Canon Mensual</td>
                                    <td className="py-3 px-4 text-gray-900 font-bold">${Number(contract.rent_amount || contract.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 px-4 font-bold text-gray-600 bg-gray-50">Estado</td>
                                    <td className="py-3 px-4">
                                        <span className={cn(
                                            "font-bold",
                                            statusText === 'Activo' ? 'text-green-600' : 
                                            statusText === 'Vencido' ? 'text-red-600' : 'text-yellow-600'
                                        )}>
                                            {statusText}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-bold text-gray-600 bg-gray-50">Tipo</td>
                                    <td className="py-3 px-4 text-gray-700 capitalize">{contract.type || 'Standard'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pt-24 pb-4 text-center text-xs text-gray-400">
                    <p className="mb-8">Este documento es un comprobante en formato digital sin carga validante expresa.</p>
                    <div className="w-64 border-t border-gray-300 mx-auto mb-3"></div>
                    <p>Sistema Integral de Administración de Alquileres</p>
                </div>
            </div>
        </div>
    )
})

ContractDetailReport.displayName = "ContractDetailReport"
