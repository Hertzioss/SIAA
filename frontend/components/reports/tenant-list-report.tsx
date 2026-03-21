import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from '@/lib/utils'

interface TenantListReportProps {
    data: any[]
    filters?: {
        ownerName?: string
        propertyName?: string
    }
}

/**
 * Preview / printable component for the tenant list.
 */
export const TenantListReport = React.forwardRef<HTMLDivElement, TenantListReportProps>(({ data, filters }, ref) => {
    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[1000px] mx-auto shadow-sm border border-gray-100 rounded-sm">
            <div className="space-y-8">
                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-6">
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6">
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-widest text-gray-900">REPORTE DE INQUILINOS</h1>
                            <div className="mt-2 space-y-1">
                                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                    {filters?.propertyName ? `INMUEBLE: ${filters.propertyName}` : 'Listado General de Inquilinato'}
                                </p>
                                {filters?.ownerName && (
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        PROPIETARIO: {filters.ownerName}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-right mt-2 md:mt-0 print:mt-0">
                            <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-200">
                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Fecha de Generación</p>
                                <p className="text-xs font-semibold text-gray-900">{new Date().toLocaleDateString('es-VE')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Table */}
                <div className="space-y-6 pt-2">
                    <div className="border border-gray-300 rounded overflow-hidden">
                        <Table className="text-[11px]">
                            <TableHeader>
                                <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="text-gray-900 font-bold w-[160px]">NOMBRE</TableHead>
                                    <TableHead className="text-gray-900 font-bold">DOCUMENTO</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[140px]">CONTACTO</TableHead>
                                    <TableHead className="text-gray-900 font-bold">PROPIEDAD / UNIDAD</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[140px]">PROPIETARIO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((t, idx) => (
                                    <TableRow key={`tenant-${t.id || idx}`} className={cn("border-b border-gray-200", idx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                                        <TableCell className="font-medium text-gray-900 max-w-[160px]">
                                            <div className="break-words whitespace-pre-wrap">{t.name}</div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{t.doc_id}</TableCell>
                                        <TableCell className="text-gray-600 max-w-[140px]">
                                            <div className="break-words whitespace-pre-wrap">{t.phone || '-'}</div>
                                            <div className="text-[9px] text-gray-400 break-words whitespace-pre-wrap">{t.email}</div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{t.propertyName} / {t.unitName}</TableCell>
                                        <TableCell className="text-gray-600 max-w-[140px]">
                                            <div className="break-words whitespace-pre-wrap">{t.ownerName}</div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">No hay inquilinos para mostrar</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="pt-20 pb-4 text-center text-[10px] text-gray-400">
                    <div className="w-64 border-t border-gray-300 mx-auto mb-3"></div>
                    <p>Sistema Integral de Administración de Alquileres</p>
                </div>
            </div>
        </div>
    )
})

TenantListReport.displayName = "TenantListReport"
