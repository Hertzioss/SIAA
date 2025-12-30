import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format, isSameMonth, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export function useDashboardData(propertyId: string) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Payments (Approved & Pending)
            let paymentsQuery = supabase
                .from('payments')
                .select('amount, date, status, contract:contracts(unit:units(property_id, name), tenant:tenants(name))');

            // 2. Fetch Contracts (Active)
            let contractsQuery = supabase
                .from('contracts')
                .select('id, end_date, status, rent_amount, unit:units(property_id, name), tenant:tenants(name)')
                .eq('status', 'active');

            // 3. Fetch Units (Total for Occupancy)
            let unitsQuery = supabase
                .from('units')
                .select('id, property_id, status');

            // 4. Fetch Maintenance Requests
            let maintenanceQuery = supabase
                .from('maintenance_requests')
                .select('id, property_id, status, priority, title, created_at, unit:units(name)')
                .in('status', ['open', 'in_progress', 'urgent']);

            // Execute queries
            const [paymentsRes, contractsRes, unitsRes, maintenanceRes] = await Promise.all([
                paymentsQuery,
                contractsQuery,
                unitsQuery,
                maintenanceQuery
            ]);

            const payments = paymentsRes.data || [];
            const contracts = contractsRes.data || [];
            const units = unitsRes.data || [];
            const maintenance = maintenanceRes.data || [];

            // FILTER BY PROPERTY ID IF NOT 'all'
            const filteredPayments = propertyId === 'all'
                ? payments
                : payments.filter((p: any) => p.contract?.unit?.property_id === propertyId);

            const filteredContracts = propertyId === 'all'
                ? contracts
                : contracts.filter((c: any) => c.unit?.property_id === propertyId);

            const filteredUnits = propertyId === 'all'
                ? units
                : units.filter((u: any) => u.property_id === propertyId);

            const filteredMaintenance = propertyId === 'all'
                ? maintenance
                : maintenance.filter((m: any) => m.property_id === propertyId);


            // --- CALCULATE STATS ---

            // Revenue (Approved Payments)
            const revenue = filteredPayments
                .filter((p: any) => p.status === 'approved')
                .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

            // Arrears (Pending?)
            const pending = filteredPayments
                .filter((p: any) => p.status === 'pending')
                .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

            // Occupancy
            const totalUnits = filteredUnits.length;
            const occupiedUnits = filteredContracts.length; // Active contracts ~ occupied units
            const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

            // Requests
            const pendingRequests = filteredMaintenance.length;


            // --- CHARTS DATA ---

            // Revenue vs Expenses (Last 6 Months)
            const last6Months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
            const revenueExpensesData = last6Months.map(date => {
                const monthRevenue = filteredPayments
                    .filter((p: any) => p.status === 'approved' && isSameMonth(parseISO(p.date), date))
                    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

                return {
                    name: format(date, 'MMM', { locale: es }), // "Nov"
                    ingresos: monthRevenue,
                    gastos: 0 // No expenses table yet
                };
            });

            // Payment Status Pie Chart
            const paymentStatusData = [
                { name: "Cobrado", value: revenue, color: "#22c55e" },
                { name: "Por Cobrar", value: pending, color: "#eab308" },
                { name: "Atrasado", value: 0, color: "#ef4444" }, // Todo: Implement arrears logic
            ];

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
                    date: format(parseISO(c.end_date), 'dd/MM/yyyy'),
                    days: differenceInDays(parseISO(c.end_date), today)
                }))
                .slice(0, 5); // Limit to 5

            // Recent Activity (Mixed Payments and Maintenance)
            const recentPayments = filteredPayments
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((p: any) => ({
                    type: "payment",
                    title: "Pago Registrado",
                    desc: `${p.contract?.tenant?.name} - ${p.contract?.unit?.name}`,
                    amount: `$${p.amount}`,
                    status: p.status === 'approved' ? 'success' : 'warning',
                    date: p.date
                }));

            // Map maintenance to activity format
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
                    occupancy: occupancyRate,
                    occupancyTrend: 0,
                    properties: propertyId === 'all' ? new Set(filteredUnits.map((u: any) => u.property_id)).size : 1,
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
    }, [propertyId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading };
}
