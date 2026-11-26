import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Property, PropertyOwnerReference, PropertyType, UnitStatus, UnitType } from '@/types/property';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { isBolivares, parseLocalDate } from '@/lib/utils';

export interface UnitSummary {
    id: string;
    name: string;
    type: UnitType | string;
    area: number | null;
    floor: string | null;
    rawStatus: UnitStatus;
    status: 'Ocupado' | 'Vacante' | 'Vencido' | 'Mantenimiento';
    tenant: string;
    rent: number;
    defaultRent: number | null;
    contractId?: string;
}

export interface ChartDataEntry {
    name: string;
    value: number;
    color?: string;
    count?: number;
}

export interface PropertyStats {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    expiredUnits: number;
    occupancyRate: number;
    totalRevenue: number;
    expectedMonthlyRent: number;
    paymentChartData: ChartDataEntry[];
    arrearsChartData: ChartDataEntry[];
}

export interface TenantSummary {
    id: string;
    contractId: string;
    name: string;
    email: string | null;
    phone: string | null;
    unit: string;
    status: 'Al día' | 'Moroso' | 'Vencido';
    contractStatus: string;
    leaseEnd: string;
    rawEndDate: string | null;
    rentAmount: number;
}

interface RawPropertyOwnerRow {
    percentage: number;
    owner: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface RawPropertyRow {
    id: string;
    name: string;
    property_type_id: string;
    address: string;
    total_area?: number | null;
    floors?: number | null;
    description?: string | null;
    created_at?: string;
    property_type?: PropertyType | PropertyType[] | null;
    property_owners?: RawPropertyOwnerRow[] | null;
}

interface RawUnitRow {
    id: string;
    property_id: string;
    name: string;
    type: UnitType | string;
    floor?: string | null;
    area?: number | null;
    default_rent_amount?: number | null;
    status: UnitStatus;
}

interface RawContractRow {
    id: string;
    unit_id: string | null;
    tenant_id: string | null;
    status: string;
    rent_amount: number | null;
    start_date: string;
    end_date: string | null;
    tenant?: {
        id: string;
        name: string;
        email?: string | null;
        phone?: string | null;
        status: string;
    } | null;
}

interface RawPaymentRow {
    amount: number;
    currency?: string | null;
    exchange_rate?: number | null;
    status: string;
    date: string;
}

function firstOf<T>(val: T | T[] | null | undefined): T | null {
    if (!val) return null;
    return Array.isArray(val) ? val[0] ?? null : val;
}

function toUsdAmount(amount: number, currency?: string | null, exchangeRate?: number | null): number {
    const numeric = Number(amount) || 0;
    if (!isBolivares(currency)) return numeric;
    const rate = Number(exchangeRate) || 0;
    return rate > 0 ? numeric / rate : 0;
}

export function usePropertyDetails(propertyId: string) {
    const [loading, setLoading] = useState(true);
    const [property, setProperty] = useState<Property | null>(null);
    const [units, setUnits] = useState<UnitSummary[]>([]);
    const [tenants, setTenants] = useState<TenantSummary[]>([]);
    const [stats, setStats] = useState<PropertyStats>({
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        expiredUnits: 0,
        occupancyRate: 0,
        totalRevenue: 0,
        expectedMonthlyRent: 0,
        paymentChartData: [],
        arrearsChartData: [],
    });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refresh = useCallback(() => setRefreshTrigger((prev) => prev + 1), []);

    const fetchData = useCallback(async () => {
        if (!propertyId) return;
        setLoading(true);
        try {
            const propertyQuery = supabase
                .from('properties')
                .select(`
                    *,
                    property_type:property_types(*),
                    property_owners(
                        percentage,
                        owner:owners(id, name)
                    )
                `)
                .eq('id', propertyId)
                .single();

            const unitsQuery = supabase
                .from('units')
                .select('*')
                .eq('property_id', propertyId)
                .order('name', { ascending: true });

            const contractsQuery = supabase
                .from('contracts')
                .select('*, tenant:tenants(*), unit:units!inner(property_id)')
                .eq('unit.property_id', propertyId)
                .in('status', ['active', 'expired']);

            const paymentsQuery = supabase
                .from('payments')
                .select('amount, currency, exchange_rate, status, date, contract:contracts!inner(unit:units!inner(property_id))')
                .eq('contract.unit.property_id', propertyId);

            const [propRes, unitsRes, contractsRes, paymentsRes] = await Promise.all([
                propertyQuery,
                unitsQuery,
                contractsQuery,
                paymentsQuery,
            ]);

            if (propRes.error) throw propRes.error;
            if (unitsRes.error) throw unitsRes.error;

            const rawProp = propRes.data as unknown as RawPropertyRow;
            const unitsData = (unitsRes.data || []) as RawUnitRow[];
            const contractsData = (contractsRes.data || []) as RawContractRow[];
            const paymentsData = (paymentsRes.data || []) as RawPaymentRow[];

            const owners: PropertyOwnerReference[] = (rawProp.property_owners || [])
                .map((po) => {
                    const owner = firstOf(po.owner);
                    if (!owner) return null;
                    return {
                        owner_id: owner.id,
                        name: owner.name,
                        participation_percentage: Number(po.percentage) || 0,
                    };
                })
                .filter((o): o is PropertyOwnerReference => o !== null);

            const formattedProperty: Property = {
                id: rawProp.id,
                name: rawProp.name,
                property_type_id: rawProp.property_type_id,
                property_type: firstOf(rawProp.property_type) || undefined,
                address: rawProp.address,
                total_area: rawProp.total_area ?? null,
                floors: rawProp.floors ?? null,
                description: rawProp.description ?? null,
                created_at: rawProp.created_at,
                owners,
            };

            const unitContractMap = new Map<string, RawContractRow>();
            contractsData.forEach((c) => {
                if (c.unit_id) {
                    const existing = unitContractMap.get(c.unit_id);
                    if (!existing || (existing.status !== 'active' && c.status === 'active')) {
                        unitContractMap.set(c.unit_id, c);
                    }
                }
            });

            const processedUnits: UnitSummary[] = unitsData.map((u) => {
                const contract = unitContractMap.get(u.id);
                let unitStatus: UnitSummary['status'] = 'Vacante';
                if (contract?.status === 'active') unitStatus = 'Ocupado';
                else if (contract?.status === 'expired') unitStatus = 'Vencido';
                else if (u.status === 'maintenance') unitStatus = 'Mantenimiento';

                return {
                    id: u.id,
                    name: u.name,
                    type: u.type,
                    area: u.area ?? null,
                    floor: u.floor ?? null,
                    rawStatus: u.status,
                    status: unitStatus,
                    tenant: contract?.tenant?.name || '—',
                    rent: Number(contract?.rent_amount ?? u.default_rent_amount ?? 0),
                    defaultRent: u.default_rent_amount ?? null,
                    contractId: contract?.id,
                };
            });

            const processedTenants: TenantSummary[] = contractsData
                .filter((c) => Boolean(c.tenant))
                .map((c) => {
                    const parsedEnd = c.end_date ? parseLocalDate(c.end_date) : null;
                    const leaseEnd =
                        parsedEnd && isValid(parsedEnd)
                            ? format(parsedEnd, 'dd MMM yyyy', { locale: es })
                            : 'Indefinido';
                    const status: TenantSummary['status'] =
                        c.status === 'expired'
                            ? 'Vencido'
                            : c.tenant?.status === 'solvent'
                              ? 'Al día'
                              : 'Moroso';

                    return {
                        id: c.tenant!.id,
                        contractId: c.id,
                        name: c.tenant!.name,
                        email: c.tenant!.email ?? null,
                        phone: c.tenant!.phone ?? null,
                        unit: unitsData.find((u) => u.id === c.unit_id)?.name || 'Unidad',
                        status,
                        contractStatus: c.status,
                        leaseEnd,
                        rawEndDate: c.end_date ?? null,
                        rentAmount: Number(c.rent_amount || 0),
                    };
                });

            const totalUnits = unitsData.length;
            const occupiedUnits = processedUnits.filter((u) => u.status === 'Ocupado').length;
            const vacantUnits = processedUnits.filter((u) => u.status === 'Vacante').length;
            const expiredUnits = processedUnits.filter((u) => u.status === 'Vencido').length;
            const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

            const expectedMonthlyRent = contractsData
                .filter((c) => c.status === 'active')
                .reduce((sum, c) => sum + Number(c.rent_amount || 0), 0);

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const monthlyPayments = paymentsData.filter((p) => {
                if (!p.date) return false;
                const d = parseLocalDate(p.date);
                return isValid(d) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });

            const approvedTotal = monthlyPayments
                .filter((p) => p.status === 'approved' || p.status === 'paid')
                .reduce((sum, p) => sum + toUsdAmount(p.amount, p.currency, p.exchange_rate), 0);

            const pendingTotal = monthlyPayments
                .filter((p) => p.status === 'pending')
                .reduce((sum, p) => sum + toUsdAmount(p.amount, p.currency, p.exchange_rate), 0);

            const uncollectedEstimate = Math.max(0, expectedMonthlyRent - approvedTotal - pendingTotal);

            const paymentChartData: ChartDataEntry[] = [
                { name: 'Cobrado', value: Math.round(approvedTotal * 100) / 100, color: '#10b981' },
                { name: 'Por Conciliar', value: Math.round(pendingTotal * 100) / 100, color: '#f59e0b' },
                { name: 'Pendiente Mes', value: Math.round(uncollectedEstimate * 100) / 100, color: '#f43f5e' },
            ];

            const totalTenants = processedTenants.length;
            const solventCount = processedTenants.filter((t) => t.status === 'Al día').length;
            const delinquentCount = processedTenants.filter((t) => t.status === 'Moroso').length;
            const expiredCount = processedTenants.filter((t) => t.status === 'Vencido').length;

            const pct = (count: number) => (totalTenants > 0 ? Math.round((count / totalTenants) * 100) : 0);

            const arrearsChartData: ChartDataEntry[] = [
                { name: 'Al día', value: pct(solventCount), count: solventCount, color: '#10b981' },
                { name: 'Moroso', value: pct(delinquentCount), count: delinquentCount, color: '#f59e0b' },
                { name: 'Vencido', value: pct(expiredCount), count: expiredCount, color: '#f43f5e' },
            ];

            setProperty(formattedProperty);
            setUnits(processedUnits);
            setTenants(processedTenants);
            setStats({
                totalUnits,
                occupiedUnits,
                vacantUnits,
                expiredUnits,
                occupancyRate,
                totalRevenue: approvedTotal,
                expectedMonthlyRent,
                paymentChartData,
                arrearsChartData,
            });
        } catch (err) {
            console.error('Error fetching property details:', err);
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshTrigger]);

    return {
        loading,
        property,
        units,
        tenants,
        stats,
        refresh,
    };
}
