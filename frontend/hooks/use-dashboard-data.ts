

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format, isSameMonth, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export function useDashboardData(propertyId: string, ownerId: string = 'all') {
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
                .select('amount, date, status, currency, contract_id, tenants(name)');

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

            // 5. Fetch Owner Expenses (NEW)
            let expensesQuery = supabase
                .from('owner_expenses')
                .select('id, amount, date, property_id, owner_id'); // Note: Expenses schema might need currency too if multi-currency supported

            // Execute queries
            const [paymentsRes, contractsRes, unitsRes, maintenanceRes, expensesRes, allContractsRes] = await Promise.all([
                paymentsQuery,
                contractsQuery,
                unitsQuery,
                maintenanceQuery,
                expensesQuery,
                allContractsQuery
            ]);

            const payments = paymentsRes.data || [];
            const contracts = contractsRes.data || [];
            const allContracts = allContractsRes.data || [];
            const units = unitsRes.data || [];
            const maintenance = maintenanceRes.data || [];
            const expenses = expensesRes.data || [];

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
            const filteredExpenses = expenses.filter(filterExpense);


            // --- CALCULATE STATS ---
            // Note: Mixing currencies in stats sum is tricky. For now assuming base currency or converting? 
            // The prompt only mentioned "Recent Activity" display issue. 
            // I will fix the display in recent activity first.

            // Revenue (Approved Payments)
            const revenue = filteredPayments
                .filter((p: any) => p.status === 'approved')
                .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

            // Arrears (Pending?)
            const pending = filteredPayments
                .filter((p: any) => p.status === 'pending')
                .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
            
            // Total Expenses (NEW)
            const totalExpenses = filteredExpenses
                .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

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
                { name: "Cobrado", value: revenue, color: "#22c55e" },
                { name: "Por Cobrar", value: pending, color: "#eab308" },
                { name: "Atrasado", value: 0, color: "#ef4444" }, 
            ];

             // Revenue vs Expenses (Last 6 Months)
            const last6Months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
            const revenueExpensesData = last6Months.map(date => {
                const monthRevenue = filteredPayments
                    .filter((p: any) => p.status === 'approved' && isSameMonth(parseISO(p.date), date))
                    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

                const monthExpenses = filteredExpenses
                    .filter((e: any) => isSameMonth(parseISO(e.date), date))
                    .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

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
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((p: any) => {
                    const symbol = p.currency === 'VES' || p.currency === 'Bs' ? 'Bs' : '$';
                    const tenantData = Array.isArray(p.tenants) ? p.tenants[0] : p.tenants;
                    const unitName = contractMap[p.contract_id]?.unit_name ?? 'Unidad';
                    return {
                        type: "payment",
                        title: "Pago Registrado",
                        desc: `${tenantData?.name ?? 'Inquilino'} - ${unitName}`,
                        amount: `${symbol} ${p.amount}`,
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
                    revenue,
                    revenueTrend: 0, // Need historical comparison
                    expenses: totalExpenses, // REPLACED OCCUPANCY
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
    }, [propertyId, ownerId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading };
}
