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
        <div ref={ref} className="p-4 bg-white text-black font-sans w-full max-w-[216mm] mx-auto [print-color-adjust:exact]">
            <style dangerouslySetInnerHTML={{ __html: `
                @page { 
                    size: 216mm 330mm; 
                    margin: 10mm 8mm; 
                }
                @media print {
                    .print-container { width: 100% !important; margin: 0 !important; border: none !important; }
                    body { overflow: visible !important; }
                }
            `}} />
            <div className="space-y-6 print-container">
                {/* Header Substituted for brevity in view, but keeping the same structure */}
                <div className="border-b-2 border-gray-800 pb-4">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-widest text-gray-900">REPORTE DE INQUILINOS</h1>
                            <div className="mt-1 space-y-0.5">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    {filters?.propertyName ? `INMUEBLE: ${filters.propertyName}` : 'Listado General'}
                                </p>
                                {filters?.ownerName && (
                                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                        PROPIETARIO: {filters.ownerName}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                                <p className="text-[9px] text-gray-500 font-bold uppercase">Generación: {new Date().toLocaleDateString('es-VE')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Table */}
                <div className="space-y-4 pt-1">
                    <div className="border border-gray-300 rounded overflow-hidden">
                        <Table className="text-[9px] table-fixed w-full">
                            <TableHeader>
                                <TableRow className="border-b-2 border-gray-400 bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="text-gray-900 font-bold w-[130px] px-2 py-2">NOMBRE</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[80px] px-1 py-2">CI/RIF</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[120px] px-1 py-2">CONTACTO</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[110px] px-1 py-2">INMUEBLE</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[65px] px-1 py-2 text-center">UNIDAD</TableHead>
                                    <TableHead className="text-gray-900 font-bold w-[120px] px-1 py-2">PROPIETARIO</TableHead>
                                    <TableHead className="text-gray-900 font-bold text-right w-[80px] px-1 py-2">CANON</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((t, idx) => (
                                    <TableRow key={`tenant-${t.id || idx}`} className={cn("border-b border-gray-200", idx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                                        <TableCell className="font-bold text-gray-900 px-2 py-2 overflow-hidden overflow-wrap-anywhere">
                                            {t.name}
                                        </TableCell>
                                        <TableCell className="text-gray-600 font-medium px-1 py-2">{t.doc_id}</TableCell>
                                        <TableCell className="text-gray-600 px-1 py-2 line-clamp-2">
                                            <div className="font-medium text-[8.5px] truncate">{t.phone || '-'}</div>
                                            <div className="text-[8px] text-gray-400 italic truncate">{t.email}</div>
                                        </TableCell>
                                        <TableCell className="text-gray-700 font-semibold px-1 py-2 truncate">{t.propertyName}</TableCell>
                                        <TableCell className="text-gray-700 font-black px-1 py-2 text-center bg-gray-100/50">{t.unitName}</TableCell>
                                        <TableCell className="text-gray-600 px-1 py-2">
                                            <div className="text-[8.5px] leading-snug whitespace-normal break-words py-1">{t.ownerName}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold px-1 py-2 whitespace-nowrap">
                                            <div className="text-xs text-gray-900">
                                                {t.currency === 'USD' ? '$' : 'Bs'} {Number(t.monthlyAmount || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">No hay inquilinos para mostrar</TableCell>
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
