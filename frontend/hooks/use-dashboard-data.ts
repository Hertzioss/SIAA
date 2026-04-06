

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format, isSameMonth, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export function useDashboardData(propertyId: string, ownerId: string = 'all', filterMonth: string = 'all', filterYear: string = 'all') {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 0. If ownerId is selected, fetch their properties first to filter
            let ownerPropertyIds: string[] | null = null;
            if (ownerId !== 'all') {
                const { data: ownerProps } = await supabase
                    .from('property_owners')
                    .select('property_id')
                    .eq('owner_id', ownerId);
                
                if (ownerProps) {
                    ownerPropertyIds = ownerProps.map(p => p.property_id);
                }
            }

            // 1. Fetch Payments (Approved & Pending)
            let paymentsQuery = supabase
                .from('payments')
                .select('amount, date, billing_period, status, currency, exchange_rate, contract_id, tenants(name)');

            // 2. Fetch Contracts (Active)
            let contractsQuery = supabase
                .from('contracts')
                .select('id, end_date, status, rent_amount, unit:units(property_id, name), tenant:tenants(name)')
                .eq('status', 'active');

            // Also fetch all contracts (active + historical) to build a map for payment filtering
            let allContractsQuery = supabase
                .from('contracts')
                .select('id, unit:units(property_id, name)');

            // 3. Fetch Units (Total for Occupancy)
            let unitsQuery = supabase
                .from('units')
                .select('id, property_id, status');

            // 4. Fetch Maintenance Requests
            let maintenanceQuery = supabase
                .from('maintenance_requests')
                .select('id, property_id, status, priority, title, created_at, unit:units(name)')
                .in('status', ['open', 'in_progress', 'urgent']);

            // 5. Fetch Owner Expenses
            let ownerExpensesQuery = supabase
                .from('owner_expenses')
                .select('id, amount, date, property_id, owner_id, currency, exchange_rate, status');

            // 6. Fetch General Expenses (NEW: Missing in dashboard)
            let generalExpensesQuery = supabase
                .from('expenses')
                .select('id, amount, date, property_id, currency, exchange_rate, status');

            // Execute queries
            const [paymentsRes, contractsRes, unitsRes, maintenanceRes, ownerExpensesRes, generalExpensesRes, allContractsRes] = await Promise.all([
                paymentsQuery,
                contractsQuery,
                unitsQuery,
                maintenanceQuery,
                ownerExpensesQuery,
                generalExpensesQuery,
                allContractsQuery
            ]);

            const payments = paymentsRes.data || [];
            const contracts = contractsRes.data || [];
            const allContracts = allContractsRes.data || [];
            const units = unitsRes.data || [];
            const maintenance = maintenanceRes.data || [];
            const ownerExpenses = ownerExpensesRes.data || [];
            const generalExpenses = generalExpensesRes.data || [];

            // Build a map: contract_id -> { property_id, unit_name } for payment filtering/display
            const contractMap: Record<string, { property_id: string; unit_name: string }> = {};
            allContracts.forEach((c: any) => {
                const unitData = Array.isArray(c.unit) ? c.unit[0] : c.unit;
                if (c.id && unitData?.property_id) {
                    contractMap[c.id] = { property_id: unitData.property_id, unit_name: unitData.name || '' };
                }
            });

            // FILTERING LOGIC
            const filterByOwner = (itemPropertyId: string) => {
                if (ownerId === 'all') return true;
                return ownerPropertyIds?.includes(itemPropertyId);
            };

            const filterByProperty = (itemPropertyId: string) => {
                if (propertyId === 'all') return true;
                return itemPropertyId === propertyId;
            };

            const isVisible = (itemPropertyId: any) => {
                // If no property_id, only show when no filter is active
                if (!itemPropertyId) return (propertyId === 'all' && ownerId === 'all');
                return filterByOwner(itemPropertyId) && filterByProperty(itemPropertyId);
            };

            // Enhanced filter for expenses
            const filterExpense = (e: any) => {
                const ownerMatch = ownerId === 'all' || e.owner_id === ownerId;
                const propertyMatch = propertyId === 'all' || e.property_id === propertyId;
                return ownerMatch && propertyMatch;
            }

            const filteredPayments = payments.filter((p: any) => {
                const propertyId_ = contractMap[p.contract_id]?.property_id;
                return isVisible(propertyId_);
            });
            const filteredContracts = contracts.filter((c: any) => isVisible(c.unit?.property_id));
            const filteredUnits = units.filter((u: any) => isVisible(u.property_id));
            const filteredMaintenance = maintenance.filter((m: any) => isVisible(m.property_id));
            
            // Consolidate all expenses
            const allExpenses = [
                ...(generalExpenses || []).map(e => ({ ...e, type: 'general' })),
                ...(ownerExpenses || []).map(e => ({ ...e, type: 'owner' }))
            ];

            const filteredExpenses = allExpenses.filter((e: any) => {
                const propertyMatch = propertyId === 'all' || e.property_id === propertyId;
                const ownerMatch = ownerId === 'all' || (e.owner_id ? e.owner_id === ownerId : true);
                
                // If filtering by owner, ensure the property belongs to them if it's a general expense
                if (ownerId !== 'all' && !e.owner_id && e.property_id) {
                    return ownerPropertyIds?.includes(e.property_id);
                }

                return propertyMatch && ownerMatch;
            });

            // Improved Date Filter (matches use-reports logic)
            const matchesDateFilter = (dateString: string) => {
                if (!dateString) return false;
                if (filterMonth === 'all' && filterYear === 'all') return true;
                
                // Extract parts directly to avoid TZ shifts
                const datePart = dateString.split('T')[0];
                const [y, m] = datePart.split('-');
                
                const yearMatch = filterYear === 'all' || y === filterYear;
                const monthMatch = filterMonth === 'all' || parseInt(m).toString() === filterMonth;
                return yearMatch && monthMatch;
            };

            // REFERENCE RATES LOGIC
            const ratesByDate: Record<string, number> = {};
            [...payments, ...allExpenses].forEach((item: any) => {
                if (item.exchange_rate && item.exchange_rate > 0) {
                    const d = item.date?.split('T')[0];
                    if (d) ratesByDate[d] = item.exchange_rate;
                }
            });

            const getDualAmount = (item: any) => {
                const amount = Number(item.amount || 0);
                const currency = (item.currency || 'USD').toUpperCase().trim();
                const isBs = currency === 'BS' || currency === 'VES' || currency === 'BS.';
                let rate = Number(item.exchange_rate || 0);

                if (rate === 0) {
                    const d = item.date?.split('T')[0];
                    rate = ratesByDate[d] || 0;
                    if (rate === 0 && d) {
                        const monthKey = d.substring(0, 7); // YYYY-MM
                        const monthRate = Object.entries(ratesByDate).find(([dt]) => dt.startsWith(monthKey));
                        if (monthRate) rate = monthRate[1];
                    }
                }

                if (isBs) {
                    return { usd: rate > 0 ? amount / rate : 0, bs: amount };
                } else {
                    return { usd: amount, bs: amount * (rate || 1) };
                }
            };


            // --- CALCULATE STATS ---
            
            // Total Revenue (Approved Payments)
            let revenueConverted = 0; 
            let revenueConvertedBs = 0;

            filteredPayments
                .filter((p: any) => p.status === 'approved' && matchesDateFilter(p.billing_period || p.date))
                .forEach((p: any) => {
                    const { usd, bs } = getDualAmount(p);
                    revenueConverted += usd;
                    revenueConvertedBs += bs;
                });

            // Arrears (Pending) - filtered by time
            let pendingConverted = 0;
            filteredPayments
                .filter((p: any) => p.status === 'pending' && matchesDateFilter(p.billing_period || p.date))
                .forEach((p: any) => {
                    const { usd } = getDualAmount(p);
                    pendingConverted += usd;
                });

            // Total Expenses
            let expensesConverted = 0;
            let expensesConvertedBs = 0;
            filteredExpenses
                .filter((e: any) => e.status !== 'cancelled' && matchesDateFilter(e.date))
                .forEach((e: any) => {
                    const { usd, bs } = getDualAmount(e);
                    expensesConverted += usd;
                    expensesConvertedBs += bs;
                });


            // Occupancy
            const totalUnits = filteredUnits.length;
            const occupiedUnits = filteredContracts.length;
            const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

            // Requests
            const pendingRequests = filteredMaintenance.length;


            // --- CHARTS DATA ---
            // ... (Charts logic remains same for now)

             // Payment Status Pie Chart
            const paymentStatusData = [
                { name: "Cobrado", value: revenueConverted, color: "#22c55e" },
                { name: "Por Cobrar", value: pendingConverted, color: "#eab308" },
                { name: "Atrasado", value: 0, color: "#ef4444" }, 
            ];

             // Revenue vs Expenses (Last 6 Months)
            const last6Months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
            const revenueExpensesData = last6Months.map(date => {
                const monthRevenue = filteredPayments
                    .filter((p: any) => p.status === 'approved' && isSameMonth(parseISO(p.date), date))
                    .reduce((sum: number, p: any) => {
                        const { usd } = getDualAmount(p);
                        return sum + usd;
                    }, 0);

                const monthExpenses = filteredExpenses
                    .filter((e: any) => e.status !== 'cancelled' && isSameMonth(parseISO(e.date), date))
                    .reduce((sum: number, e: any) => {
                        const { usd } = getDualAmount(e);
                        return sum + usd;
                    }, 0);

                return {
                    name: format(date, 'MMM', { locale: es }), 
                    ingresos: monthRevenue,
                    gastos: monthExpenses
                };
            });

            // Lease Expirations (Next 30-60 days)
            const today = new Date();
            const leaseExpirations = filteredContracts
                .filter((c: any) => {
                    if (!c.end_date) return false;
                    const endDate = parseISO(c.end_date);
                    const days = differenceInDays(endDate, today);
                    return days >= 0 && days <= 60;
                })
                .map((c: any) => ({
                    tenant: c.tenant?.name || "Desconocido",
                    property: c.unit?.name || "Unidad",
                    date: format(parseISO(c.end_date), 'dd-MM-yyyy'),
                    days: differenceInDays(parseISO(c.end_date), today)
                }))
                .slice(0, 5); // Limit to 5

            // Recent Activity (Mixed Payments and Maintenance)
            const recentPayments = filteredPayments
                .sort((a: any) => new Date(a.date).getTime()) // sort first
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 8)
                .map((p: any) => {
                    const { usd, bs } = getDualAmount(p);
                    const tenantData = Array.isArray(p.tenants) ? p.tenants[0] : p.tenants;
                    const unitName = contractMap[p.contract_id]?.unit_name ?? 'Unidad';
                    
                    const formatUSD = usd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const formatBS = bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                    // Get the effective rate (either from transaction or calculation)
                    const pRate = Number(p.exchange_rate || 0);
                    const effectiveRate = pRate > 0 ? pRate : (usd > 0 ? (bs / usd) : 0);

                    return {
                        type: "payment",
                        title: "Pago Registrado",
                        desc: `${tenantData?.name ?? 'Inquilino'} - ${unitName}`,
                        amount: `Bs. ${formatBS}`,
                        amountUSD: `$ ${formatUSD}`,
                        rate: effectiveRate > 0 ? effectiveRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
                        status: p.status === 'approved' ? 'success' : 'warning',
                        date: p.date
                    };
                });
            
             // Recent Maintenance (Usually no amount in request list, just status)
             // If we want to show amount for completed maintenance with expense? 
             // Currently dashboard just lists status.
            const recentMaintenance = filteredMaintenance
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map((m: any) => ({
                    type: "maintenance",
                    title: "Mantenimiento",
                    desc: `${m.title} - ${m.unit?.name || 'Común'}`,
                    amount: m.priority === 'urgent' ? 'Urgente' : m.status,
                    status: m.priority === 'urgent' ? 'destructive' : 'warning',
                    date: m.created_at
                }));

            // Merge and sort
            const recentActivity = [...recentPayments, ...recentMaintenance]
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 6);


            // Occupancy Trend
            const occupancyData = last6Months.map(date => ({
                name: format(date, 'MMM', { locale: es }),
                value: occupancyRate
            }));

            setData({
                stats: {
                    revenueUSD: revenueConverted,
                    revenueVES: revenueConvertedBs,
                    revenueTrend: 0,
                    expensesUSD: expensesConverted,
                    expensesVES: expensesConvertedBs,
                    expensesTrend: 0,
                    properties: (propertyId === 'all' && ownerId === 'all') ? new Set(filteredUnits.map((u: any) => u.property_id)).size : 1,
                    propertiesTrend: 0,
                    requests: pendingRequests,
                    requestsTrend: pendingRequests > 0 ? "Activas" : "Sin pendientes"
                },
                paymentData: paymentStatusData,
                arrearsData: [], // TODO
                revenueExpensesData,
                occupancyData,
                leaseExpirations,
                recentActivity
            });

        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }, [propertyId, ownerId, filterMonth, filterYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading };
}
