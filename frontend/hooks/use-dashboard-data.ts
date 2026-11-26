import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { subMonths, format, isSameMonth, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { isBolivares, parseLocalDate } from '@/lib/utils';

type OneOrMany<T> = T | T[] | null | undefined;

interface PaymentRow {
    id: string;
    amount: number | string;
    date: string;
    billing_period: string | null;
    status: string;
    currency: string | null;
    exchange_rate: number | string | null;
    contract_id: string | null;
    tenants: OneOrMany<{ name: string }>;
}

interface ContractUnitRef {
    property_id: string | null;
    name: string | null;
    property?: OneOrMany<{ name: string }>;
}

interface ActiveContractRow {
    id: string;
    end_date: string | null;
    status: string;
    rent_amount: number | string;
    unit: OneOrMany<ContractUnitRef>;
    tenant: OneOrMany<{ name: string }>;
}

interface ContractSummaryRow {
    id: string;
    status: string;
    end_date: string | null;
    unit: OneOrMany<{ property_id: string | null; name: string | null }>;
}

interface UnitRow {
    id: string;
    property_id: string | null;
    status: string;
}

interface MaintenanceRow {
    id: string;
    property_id: string | null;
    status: string;
    priority: string;
    title: string;
    created_at: string;
    unit: OneOrMany<{ name: string }>;
}

interface ExpenseRow {
    id: string;
    amount: number | string;
    date: string;
    property_id: string | null;
    owner_id?: string | null;
    currency?: string | null;
    exchange_rate?: number | string | null;
    status: string;
    type?: 'general' | 'owner';
}

function firstOf<T>(value: OneOrMany<T>): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

export interface DashboardStats {
    revenueUSD: number;
    revenueBs: number;
    revenueTrend: number | null;
    expensesUSD: number;
    expensesBs: number;
    expensesTrend: number | null;
    netBalanceUSD: number;
    netBalanceBs: number;
    pendingPaymentsCount: number;
    pendingPaymentsUSD: number;
    pendingPaymentsBs: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: number;
    properties: number;
    requests: number;
    expiredContractsCount: number;
}

export interface DashboardData {
    stats: DashboardStats;
    paymentData: { name: string; value: number; color: string }[];
    arrearsData: unknown[];
    revenueExpensesData: { name: string; ingresos: number; gastos: number }[];
    occupancyData: { name: string; value: number }[];
    leaseExpirations: {
        id: string;
        tenant: string;
        property: string;
        unit: string;
        date: string;
        days: number;
    }[];
    recentActivity: {
        type: 'payment' | 'maintenance';
        title: string;
        desc: string;
        amount: string;
        amountUSD?: string;
        rate?: string;
        status: 'success' | 'warning' | 'destructive';
        statusLabel: string;
        date: string;
    }[];
}

export function useDashboardData(
    propertyId: string,
    ownerId: string = 'all',
    filterMonth: string = 'all',
    filterYear: string = 'all'
) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let ownerPropertyIds: string[] | null = null;
            if (ownerId !== 'all') {
                const { data: ownerProps } = await supabase
                    .from('property_owners')
                    .select('property_id')
                    .eq('owner_id', ownerId);

                if (ownerProps) {
                    ownerPropertyIds = ownerProps.map((p) => p.property_id);
                }
            }

            const [
                paymentsRes,
                contractsRes,
                unitsRes,
                maintenanceRes,
                ownerExpensesRes,
                generalExpensesRes,
                allContractsRes
            ] = await Promise.all([
                supabase
                    .from('payments')
                    .select('id, amount, date, billing_period, status, currency, exchange_rate, contract_id, tenants(name)'),
                supabase
                    .from('contracts')
                    .select('id, end_date, status, rent_amount, unit:units(property_id, name, property:properties(name)), tenant:tenants(name)')
                    .eq('status', 'active'),
                supabase
                    .from('units')
                    .select('id, property_id, status'),
                supabase
                    .from('maintenance_requests')
                    .select('id, property_id, status, priority, title, created_at, unit:units(name)')
                    .in('status', ['open', 'in_progress', 'urgent']),
                supabase
                    .from('owner_expenses')
                    .select('id, amount, date, property_id, owner_id, currency, exchange_rate, status'),
                supabase
                    .from('expenses')
                    .select('*'),
                supabase
                    .from('contracts')
                    .select('id, status, end_date, unit:units(property_id, name)')
            ]);

            const payments = (paymentsRes.data || []) as unknown as PaymentRow[];
            const contracts = (contractsRes.data || []) as unknown as ActiveContractRow[];
            const allContracts = (allContractsRes.data || []) as unknown as ContractSummaryRow[];
            const units = (unitsRes.data || []) as unknown as UnitRow[];
            const maintenance = (maintenanceRes.data || []) as unknown as MaintenanceRow[];
            const ownerExpenses = (ownerExpensesRes.data || []) as unknown as ExpenseRow[];
            const generalExpenses = (generalExpensesRes.data || []) as unknown as ExpenseRow[];

            const contractMap: Record<string, { property_id: string; unit_name: string }> = {};
            allContracts.forEach((c) => {
                const unitData = firstOf(c.unit);
                if (c.id && unitData?.property_id) {
                    contractMap[c.id] = {
                        property_id: unitData.property_id,
                        unit_name: unitData.name || ''
                    };
                }
            });

            const filterByOwner = (itemPropertyId: string) => {
                if (ownerId === 'all') return true;
                return Boolean(ownerPropertyIds?.includes(itemPropertyId));
            };

            const filterByProperty = (itemPropertyId: string) => {
                if (propertyId === 'all') return true;
                return itemPropertyId === propertyId;
            };

            const isVisible = (itemPropertyId: string | null | undefined) => {
                if (!itemPropertyId) return propertyId === 'all' && ownerId === 'all';
                return filterByOwner(itemPropertyId) && filterByProperty(itemPropertyId);
            };

            const filteredPayments = payments.filter((p) => {
                const propId = p.contract_id ? contractMap[p.contract_id]?.property_id : null;
                return isVisible(propId);
            });

            const filteredContracts = contracts.filter((c) => isVisible(firstOf(c.unit)?.property_id));
            const filteredAllContracts = allContracts.filter((c) => isVisible(firstOf(c.unit)?.property_id));
            const filteredUnits = units.filter((u) => isVisible(u.property_id));
            const filteredMaintenance = maintenance.filter((m) => isVisible(m.property_id));

            const allExpenses: ExpenseRow[] = [
                ...generalExpenses.map((e) => ({ ...e, type: 'general' as const })),
                ...ownerExpenses.map((e) => ({ ...e, type: 'owner' as const }))
            ];

            const filteredExpenses = allExpenses.filter((e) => {
                const propertyMatch = propertyId === 'all' || e.property_id === propertyId;
                const ownerMatch = ownerId === 'all' || (e.owner_id ? e.owner_id === ownerId : true);

                if (ownerId !== 'all' && !e.owner_id && e.property_id) {
                    return Boolean(ownerPropertyIds?.includes(e.property_id) && propertyMatch);
                }

                return propertyMatch && ownerMatch;
            });

            const matchesMonthYear = (dateString: string | null | undefined, targetMonth: string, targetYear: string) => {
                if (!dateString) return false;
                if (targetMonth === 'all' && targetYear === 'all') return true;

                const datePart = dateString.split('T')[0];
                const [y, m] = datePart.split('-');

                const yearMatch = targetYear === 'all' || y === targetYear;
                const monthMatch = targetMonth === 'all' || parseInt(m, 10).toString() === targetMonth;
                return yearMatch && monthMatch;
            };

            const matchesDateFilter = (dateString: string | null | undefined) =>
                matchesMonthYear(dateString, filterMonth, filterYear);

            let prevMonth: string | null = null;
            let prevYear: string | null = null;
            if (filterMonth !== 'all' && filterYear !== 'all') {
                const mNum = parseInt(filterMonth, 10);
                const yNum = parseInt(filterYear, 10);
                if (mNum === 1) {
                    prevMonth = '12';
                    prevYear = String(yNum - 1);
                } else {
                    prevMonth = String(mNum - 1);
                    prevYear = String(yNum);
                }
            }

            const ratesByDate: Record<string, number> = {};
            const rateSources: Array<{ date?: string; exchange_rate?: number | string | null }> = [
                ...payments,
                ...allExpenses
            ];
            rateSources.forEach((item) => {
                const r = Number(item.exchange_rate || 0);
                if (r > 0) {
                    const d = item.date?.split('T')[0];
                    if (d) ratesByDate[d] = r;
                }
            });

            const getDualAmount = (item: {
                amount: number | string;
                currency?: string | null;
                exchange_rate?: number | string | null;
                date?: string;
            }) => {
                const amount = Number(item.amount || 0);
                const isBs = isBolivares(item.currency);
                let rate = Number(item.exchange_rate || 0);

                if (rate === 0) {
                    const d = item.date?.split('T')[0];
                    rate = (d && ratesByDate[d]) || 0;
                    if (rate === 0 && d) {
                        const monthKey = d.substring(0, 7);
                        const monthRate = Object.entries(ratesByDate).find(([dt]) => dt.startsWith(monthKey));
                        if (monthRate) rate = monthRate[1];
                    }
                }

                if (isBs) {
                    return { usd: rate > 0 ? amount / rate : 0, bs: amount };
                }
                return { usd: amount, bs: amount * (rate || 1) };
            };

            let revenueUSD = 0;
            let revenueBs = 0;
            let prevRevenueUSD = 0;

            filteredPayments
                .filter((p) => p.status === 'approved')
                .forEach((p) => {
                    const refDate = p.billing_period || p.date;
                    if (matchesDateFilter(refDate)) {
                        const { usd, bs } = getDualAmount(p);
                        revenueUSD += usd;
                        revenueBs += bs;
                    } else if (prevMonth && prevYear && matchesMonthYear(refDate, prevMonth, prevYear)) {
                        prevRevenueUSD += getDualAmount(p).usd;
                    }
                });

            let pendingPaymentsUSD = 0;
            let pendingPaymentsBs = 0;
            const pendingPaymentsList = filteredPayments.filter((p) => p.status === 'pending');
            pendingPaymentsList.forEach((p) => {
                const { usd, bs } = getDualAmount(p);
                pendingPaymentsUSD += usd;
                pendingPaymentsBs += bs;
            });

            let periodPendingUSD = 0;
            pendingPaymentsList
                .filter((p) => matchesDateFilter(p.billing_period || p.date))
                .forEach((p) => {
                    periodPendingUSD += getDualAmount(p).usd;
                });

            let expensesUSD = 0;
            let expensesBs = 0;
            let prevExpensesUSD = 0;
            filteredExpenses
                .filter((e) => e.status !== 'cancelled')
                .forEach((e) => {
                    if (matchesDateFilter(e.date)) {
                        const { usd, bs } = getDualAmount(e);
                        expensesUSD += usd;
                        expensesBs += bs;
                    } else if (prevMonth && prevYear && matchesMonthYear(e.date, prevMonth, prevYear)) {
                        prevExpensesUSD += getDualAmount(e).usd;
                    }
                });

            const calcTrend = (current: number, previous: number): number | null => {
                if (prevMonth === null || previous <= 0) return null;
                return Math.round(((current - previous) / previous) * 100);
            };

            const revenueTrend = calcTrend(revenueUSD, prevRevenueUSD);
            const expensesTrend = calcTrend(expensesUSD, prevExpensesUSD);

            const totalUnits = filteredUnits.length;
            const occupiedUnitKeys = new Set(
                filteredContracts.map((c) => {
                    const u = firstOf(c.unit);
                    return u?.property_id ? `${u.property_id}:${u.name}` : c.id;
                })
            );
            const occupiedUnits = Math.min(occupiedUnitKeys.size, totalUnits);
            const vacantUnits = Math.max(totalUnits - occupiedUnits, 0);
            const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

            const uniquePropertiesCount =
                propertyId === 'all'
                    ? new Set(filteredUnits.map((u) => u.property_id).filter(Boolean)).size
                    : 1;

            const pendingRequests = filteredMaintenance.length;

            const paymentStatusData = [
                { name: 'Cobrado', value: revenueUSD, color: '#10b981' },
                { name: 'Por conciliar', value: periodPendingUSD, color: '#f59e0b' },
            ];

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const last6Months = Array.from({ length: 6 }).map((_, i) => subMonths(today, 5 - i));

            const revenueExpensesData = last6Months.map((monthDate) => {
                const monthRevenue = filteredPayments
                    .filter((p) => p.status === 'approved' && Boolean(p.date) && isSameMonth(parseLocalDate(p.date), monthDate))
                    .reduce((sum, p) => sum + getDualAmount(p).usd, 0);

                const monthExpenses = filteredExpenses
                    .filter((e) => e.status !== 'cancelled' && Boolean(e.date) && isSameMonth(parseLocalDate(e.date), monthDate))
                    .reduce((sum, e) => sum + getDualAmount(e).usd, 0);

                const label = format(monthDate, 'MMM', { locale: es });
                return {
                    name: label.charAt(0).toUpperCase() + label.slice(1).replace('.', ''),
                    ingresos: Number(monthRevenue.toFixed(2)),
                    gastos: Number(monthExpenses.toFixed(2))
                };
            });

            const expiredContractsCount = filteredAllContracts.filter((c) => {
                const st = (c.status || '').toLowerCase().trim();
                if (st === 'terminated' || st === 'cancelled') return false;
                if (!c.end_date) return st === 'expired';
                return st === 'expired' || parseLocalDate(c.end_date) < today;
            }).length;

            const leaseExpirations = filteredContracts
                .filter((c) => {
                    if (!c.end_date) return false;
                    const days = differenceInDays(parseLocalDate(c.end_date), today);
                    return days >= 0 && days <= 60;
                })
                .map((c) => {
                    const endDate = parseLocalDate(c.end_date!);
                    const unitData = firstOf(c.unit);
                    const propData = firstOf(unitData?.property);
                    const tenantData = firstOf(c.tenant);
                    return {
                        id: c.id,
                        tenant: tenantData?.name || 'Desconocido',
                        property: propData?.name || 'Inmueble',
                        unit: unitData?.name || 'Unidad',
                        date: format(endDate, 'dd MMM yyyy', { locale: es }),
                        days: differenceInDays(endDate, today)
                    };
                })
                .sort((a, b) => a.days - b.days)
                .slice(0, 6);

            const recentPayments = [...filteredPayments]
                .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
                .slice(0, 8)
                .map((p) => {
                    const { usd, bs } = getDualAmount(p);
                    const tenantData = firstOf(p.tenants);
                    const unitName = (p.contract_id && contractMap[p.contract_id]?.unit_name) || 'Unidad';

                    const formatUSD = usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const formatBS = bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                    const pRate = Number(p.exchange_rate || 0);
                    const effectiveRate = pRate > 0 ? pRate : (usd > 0 ? bs / usd : 0);

                    const statusMap: Record<string, { tone: 'success' | 'warning' | 'destructive'; label: string }> = {
                        approved: { tone: 'success', label: 'Conciliado' },
                        pending: { tone: 'warning', label: 'Pendiente' },
                        rejected: { tone: 'destructive', label: 'Rechazado' }
                    };
                    const st = statusMap[p.status] || { tone: 'warning', label: 'Pendiente' };

                    return {
                        type: 'payment' as const,
                        title: tenantData?.name ?? 'Inquilino',
                        desc: unitName,
                        amount: `Bs. ${formatBS}`,
                        amountUSD: `$${formatUSD}`,
                        rate: effectiveRate > 0 ? effectiveRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : undefined,
                        status: st.tone,
                        statusLabel: st.label,
                        date: p.date
                    };
                });

            const recentMaintenance = [...filteredMaintenance]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map((m) => {
                    const unitData = firstOf(m.unit);
                    return {
                        type: 'maintenance' as const,
                        title: m.title,
                        desc: `Mantenimiento · ${unitData?.name || 'Área común'}`,
                        amount: m.priority === 'urgent' ? 'Urgente' : 'Abierta',
                        status: (m.priority === 'urgent' ? 'destructive' : 'warning') as 'destructive' | 'warning',
                        statusLabel: m.priority === 'urgent' ? 'Urgente' : 'Mantenimiento',
                        date: m.created_at
                    };
                });

            const recentActivity = [...recentPayments, ...recentMaintenance]
                .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
                .slice(0, 6);

            const occupancyData = last6Months.map((monthDate) => ({
                name: format(monthDate, 'MMM', { locale: es }),
                value: occupancyRate
            }));

            setData({
                stats: {
                    revenueUSD,
                    revenueBs,
                    revenueTrend,
                    expensesUSD,
                    expensesBs,
                    expensesTrend,
                    netBalanceUSD: revenueUSD - expensesUSD,
                    netBalanceBs: revenueBs - expensesBs,
                    pendingPaymentsCount: pendingPaymentsList.length,
                    pendingPaymentsUSD,
                    pendingPaymentsBs,
                    totalUnits,
                    occupiedUnits,
                    vacantUnits,
                    occupancyRate,
                    properties: uniquePropertiesCount,
                    requests: pendingRequests,
                    expiredContractsCount
                },
                paymentData: paymentStatusData,
                arrearsData: [],
                revenueExpensesData,
                occupancyData,
                leaseExpirations,
                recentActivity
            });
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, [propertyId, ownerId, filterMonth, filterYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, refresh: fetchData };
}
