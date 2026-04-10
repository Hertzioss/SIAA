import { forwardRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import { Building2, User } from 'lucide-react';

interface UnitHistoryReportProps {
    data: any[]; 
    period?: string; // Optional, normally we don't have periods but added for consistency props
}

export const UnitHistoryReport = forwardRef<HTMLDivElement, UnitHistoryReportProps>(({ data }, ref) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const getStatusText = (status: string) => {
        const statuses: any = {
            active: 'Activo',
            ended: 'Finalizado',
            terminated: 'Terminado',
            draft: 'Borrador',
            cancelled: 'Cancelado',
            pending: 'Pendiente',
        };
        return statuses[status] || status;
    };

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans w-full max-w-[1000px] mx-auto shadow-sm border border-gray-100 rounded-sm [print-color-adjust:exact]">
            <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-slate-800">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Histórico de Contratos</h1>
                    <p className="text-slate-500 mt-1">Sistema Integral de Administración de Inmuebles</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium bg-slate-100 px-3 py-1 rounded-full text-slate-800">
                        Generado: {new Date().toLocaleDateString('es-VE')}
                    </p>
                </div>
            </div>

            {data.map((unitData, index) => {
                const property = unitData.properties;
                const contracts = unitData.contracts || [];

                return (
                    <div key={unitData.id} className={`${index > 0 ? 'mt-12 pt-12 border-t-2 border-dashed border-slate-300 print:break-before-page print:mt-8 print:pt-8 print:border-none' : ''}`}>
                        {/* Resume Card */}
                        <div className="mb-8">
                            <Card className="border-none bg-slate-50 rounded-xl overflow-hidden shadow-sm">
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-200">
                                        <div className="p-4 flex flex-col justify-center">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Inmueble</span>
                                            <span className="font-medium text-slate-900 line-clamp-2" title={property?.name}>{property?.name || 'N/A'}</span>
                                        </div>
                                        <div className="p-4 flex flex-col justify-center">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Unidad</span>
                                            <span className="font-bold text-lg text-primary">{unitData.name || 'N/A'}</span>
                                        </div>
                                        <div className="p-4 flex flex-col justify-center">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tipo</span>
                                            <span className="font-medium text-slate-900 capitalize">{unitData.type || 'N/A'}</span>
                                        </div>
                                        <div className="p-4 flex flex-col justify-center">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estado Físico actual</span>
                                            <span className="font-medium text-slate-900 capitalize">{unitData.status === 'occupied' ? 'Ocupado' : 'Vacante'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Timeline / Contracts */}
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" />
                                Historial de Ocupación / Contratos
                            </h3>

                            {contracts.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                    <p className="text-slate-500">No hay contratos registrados para esta unidad.</p>
                                </div>
                            ) : (
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50 border-b border-slate-200">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="font-semibold text-slate-700 py-3">INQUILINO</TableHead>
                                                <TableHead className="font-semibold text-slate-700 py-3">ESTATUS</TableHead>
                                                <TableHead className="font-semibold text-slate-700 py-3">FECHA INICIO</TableHead>
                                                <TableHead className="font-semibold text-slate-700 py-3">FECHA FIN</TableHead>
                                                <TableHead className="font-semibold text-slate-700 py-3 text-right">CANON ($)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {contracts.map((contract: any) => {
                                                const tenant = Array.isArray(contract.tenants) ? contract.tenants[0] : contract.tenants;
                                                const isCurrent = contract.status === 'active';
                                                
                                                return (
                                                    <TableRow key={contract.id} className={`${isCurrent ? 'bg-primary/5' : ''}`}>
                                                        <TableCell className="font-medium text-slate-900">
                                                            <div className="flex items-center gap-2">
                                                                {isCurrent && <span className="w-2 h-2 rounded-full bg-primary" title="Activo ahora" />}
                                                                {tenant?.name || 'Desconocido'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                isCurrent 
                                                                    ? 'bg-green-100 text-green-700' 
                                                                    : contract.status === 'ended' || contract.status === 'terminated'
                                                                        ? 'bg-slate-100 text-slate-600'
                                                                        : 'bg-orange-100 text-orange-700'
                                                            }`}>
                                                                {getStatusText(contract.status)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-slate-600">
                                                            {contract.start_date ? new Date(contract.start_date).toLocaleDateString('es-VE') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-slate-600">
                                                            {contract.end_date ? new Date(contract.end_date).toLocaleDateString('es-VE') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {formatCurrency(contract.rent_amount || 0)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

UnitHistoryReport.displayName = 'UnitHistoryReport';
