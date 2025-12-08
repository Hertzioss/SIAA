import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function usePropertyDetails(propertyId: string) {
    const [loading, setLoading] = useState(true);
    const [property, setProperty] = useState<any>(null);
    const [units, setUnits] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({
        totalUnits: 0,
        occupancyRate: 0,
        totalRevenue: 0,
    });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Placeholder data for missing tables
    const maintenance = [] as any[];
    const expenses = [] as any[];

    const refresh = () => setRefreshTrigger(prev => prev + 1);

    const fetchData = useCallback(async () => {
        if (!propertyId) return;
        setLoading(true);
        try {
            // 1. Fetch Property Info
            const propertyQuery = supabase
                .from('properties')
                .select('*')
                .eq('id', propertyId)
                .single();

            // 2. Fetch Units
            const unitsQuery = supabase
                .from('units')
                .select('*')
                .eq('property_id', propertyId);

            // 3. Fetch Active Contracts (to link tenants and check occupancy)
            // We need to know which unit has which active contract
            const contractsQuery = supabase
                .from('contracts')
                .select('*, tenant:tenants(*), unit:units!inner(property_id)') // !inner filters contracts by unit's property_id
                .eq('unit.property_id', propertyId)
                .eq('status', 'active');

            // 4. Fetch Payments (via contracts in this property)
            // We can reuse the contracts above to filter payments, but let's query payments directly linked to those contracts?
            // Easier to fetch all payments for contracts in this property.
            // But we can't deep filter payments -> contract -> unit -> property easily in one go without !inner join
            const paymentsQuery = supabase
                .from('payments')
                .select('amount, status, date, contract:contracts!inner(unit:units!inner(property_id))')
                .eq('contract.unit.property_id', propertyId);

            const [propRes, unitsRes, contractsRes, paymentsRes] = await Promise.all([
                propertyQuery,
                unitsQuery,
                contractsQuery,
                paymentsQuery
            ]);

            if (propRes.error) throw propRes.error;
            if (unitsRes.error) throw unitsRes.error;

            const propData = propRes.data;
            const unitsData = unitsRes.data || [];
            const contractsData = contractsRes.data || [];
            const paymentsData = paymentsRes.data || [];

            // --- PROCESS DATA ---

            // Map Units with Tenants
            // Create a map of UnitID -> ActiveContract
            const unitContractMap = new Map();
            contractsData.forEach((c: any) => {
                if (c.unit_id) unitContractMap.set(c.unit_id, c);
            });

            const processedUnits = unitsData.map((u: any) => {
                const contract = unitContractMap.get(u.id);
                return {
                    id: u.id,
                    name: u.name,
                    type: u.type,
                    area: "N/A", // Schema doesn't have area yet? Checked generic schema, units table has rent_amount, status, type. No area in schema 001.
                    status: contract ? "Ocupado" : "Vacante", // Or use u.status if managed manually
                    tenant: contract?.tenant?.name || "-",
                    rent: contract ? contract.rent_amount : u.rent_amount
                };
            });

            // Map Tenants list
            const processedTenants = contractsData.map((c: any) => ({
                id: c.tenant?.id,
                contractId: c.id,
                name: c.tenant?.name,
                contact: c.tenant?.name, // Placeholder, maybe add contact person col later
                email: c.tenant?.email,
                phone: c.tenant?.phone,
                unit: unitsData.find((u: any) => u.id === c.unit_id)?.name || "Unidad",
                status: c.tenant?.status === 'solvent' ? 'Al día' : 'Atrasado',
                leaseEnd: c.end_date ? format(parseISO(c.end_date), 'yyyy-MM-dd') : '-'
            }));

            // Stats
            const totalUnits = unitsData.length;
            const occupiedCount = contractsData.length;
            const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;

            // Revenue (Approved payments in the last month? Or total? Dashboard mock showed total monthly revenue logic?)
            // The Property Details card says "Ingresos Mensuales". let's sum approved payments of current month.
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            const totalRevenue = paymentsData
                .filter((p: any) => {
                    const d = new Date(p.date);
                    return p.status === 'approved' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                })
                .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

            // Charts Data (Reusing logic)
            // Pie Chart: Payments status (All time or current month? let's do All time for this view or last 3 months?)
            // Mock data has 12500 collected.
            // Let's do current month for the chart too.
            const monthlyPayments = paymentsData.filter((p: any) => {
                const d = new Date(p.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });

            const paymentChartData = [
                { name: "Cobrado", value: monthlyPayments.filter((p: any) => p.status === 'approved').reduce((s: number, x: any) => s + Number(x.amount), 0), color: "#22c55e" },
                { name: "Por Cobrar", value: monthlyPayments.filter((p: any) => p.status === 'pending').reduce((s: number, x: any) => s + Number(x.amount), 0), color: "#eab308" },
                { name: "Atrasado", value: 0, color: "#ef4444" } // Logic for overdue pending needed
            ];

            // Arrears Chart (Mocked for now as we don't have aging logic)
            const arrearsChartData = [
                { name: "0 Meses", value: 100, count: processedTenants.length },
                { name: "1 Mes", value: 0, count: 0 },
                { name: "2 Meses", value: 0, count: 0 },
                { name: "3+ Meses", value: 0, count: 0 },
            ];


            setProperty(propData);
            setUnits(processedUnits);
            setTenants(processedTenants);
            setStats({
                totalUnits,
                occupancyRate,
                totalRevenue,
                paymentChartData,
                arrearsChartData
            });

        } catch (err) {
            console.error("Error fetching property details:", err);
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
        maintenance,
        expenses,
        refresh
    };
}
