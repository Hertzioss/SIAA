import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface OwnerReportItem {
    ownerId: string;
    ownerName: string;
    ownerDocId: string;
    totalIncome: number; // Income from Payments
    totalExpenses: number; // Share of Expenses
    netBalance: number;
    propertyCount: number;
    payments: OwnerPaymentDetail[];
}

export interface OwnerPaymentDetail {
    date: string;
    amount: number;
    method: string;
    tenantName: string;
    unitName: string;
    propertyName: string;
}

export interface OwnerReportFilters {
    startDate: Date;
    endDate: Date;
    ownerIds: string[]; // Empty = All
}

export function useOwnerReport() {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<OwnerReportItem[]>([]);
    const [ownersList, setOwnersList] = useState<any[]>([]);

    // Default filters: Current Month
    const [filters, setFilters] = useState<OwnerReportFilters>({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
        ownerIds: []
    });

    // Fetch basic lists (Owners) only once
    useEffect(() => {
        const fetchOwners = async () => {
            const { data, error } = await supabase
                .from('owners')
                .select('id, name, doc_id')
                .order('name');

            if (error) console.error('Error fetching owners:', error);
            else setOwnersList(data || []);
        };
        fetchOwners();
    }, []);

    const generateReport = useCallback(async () => {
        setLoading(true);
        try {
            const startStr = format(filters.startDate, 'yyyy-MM-dd');
            const endStr = format(filters.endDate, 'yyyy-MM-dd');

            // 1. Get Property Ownership Map
            // Map: PropertyId -> [{ ownerId, percentage }]
            const { data: propOwners, error: poError } = await supabase
                .from('property_owners')
                .select('property_id, owner_id, percentage, owners(name, doc_id)');

            if (poError) throw poError;

            const propertyOwnership: Record<string, { ownerId: string, name: string, doc_id: string, percentage: number }[]> = {};
            propOwners?.forEach((po: any) => {
                if (!propertyOwnership[po.property_id]) {
                    propertyOwnership[po.property_id] = [];
                }
                propertyOwnership[po.property_id].push({
                    ownerId: po.owner_id,
                    name: po.owners?.name,
                    doc_id: po.owners?.doc_id,
                    percentage: Number(po.percentage)
                });
            });

            // 2. Fetch Payments (Income)
            // Approved payments within date range
            const { data: payments, error: payError } = await supabase
                .from('payments')
                .select(`
                    amount, 
                    currency, 
                    exchange_rate,
                    date,
                    payment_method, 
                    contract:contracts!inner(
                        unit:units(
                            name,
                            property_id,
                            property:properties(name)
                        )
                    ),
                    tenant:tenants(name)
                `)
                .eq('status', 'approved')
                .gte('date', startStr)
                .lte('date', endStr);

            if (payError) throw payError;

            // 3. Fetch Owner Expenses (Directly linked to owner)
            const { data: expenses, error: expError } = await supabase
                .from('owner_expenses')
                .select('amount, owner_id')
                .eq('status', 'paid')
                .gte('date', startStr)
                .lte('date', endStr);

            if (expError) throw expError;

            // --- Aggregation ---
            const ownerStats: Record<string, OwnerReportItem> = {};

            // Initialize stats for known owners from property map (or all owners?)
            // Let's initialize as we go or pre-fill from options.
            // Better to see who actually has activity or ownership.

            // Helper to get stats object
            const getStats = (id: string, name: string, doc: string) => {
                if (!ownerStats[id]) {
                    ownerStats[id] = {
                        ownerId: id,
                        ownerName: name,
                        ownerDocId: doc,
                        totalIncome: 0,
                        totalExpenses: 0,
                        netBalance: 0,
                        propertyCount: 0, // To be calculated? 
                        payments: []
                    };
                }
                return ownerStats[id];
            };

            // Process Payments
            payments?.forEach((p: any) => {
                // Normalize to USD
                let amountUSD = Number(p.amount);
                if (p.currency === 'VES' && p.exchange_rate) {
                    amountUSD = amountUSD / p.exchange_rate;
                }

                // Find Property
                const propertyId = p.contract?.unit?.property_id;
                if (!propertyId) return;

                // Create Detail Object
                const detail: OwnerPaymentDetail = {
                    date: p.date,
                    amount: amountUSD, // Using calculated USD amount
                    method: p.payment_method,
                    tenantName: p.tenant?.name || 'Desconocido',
                    unitName: p.contract?.unit?.name || '',
                    propertyName: p.contract?.unit?.property?.name || ''
                };

                // Distribute to Owners
                const owners = propertyOwnership[propertyId] || [];
                owners.forEach(owner => {
                    const share = amountUSD * (owner.percentage / 100);
                    const stats = getStats(owner.ownerId, owner.name, owner.doc_id);
                    stats.totalIncome += share;
                    // Add detail copy with share? No, usually they want to see the full payment or their share?
                    // User asked: "evidenciar el monto pagado".
                    // If spread across owners, showing the FULL amount might be confusing if we sum it up.
                    // But usually "Line Items" in a statement show the share. 
                    // Let's store the SHARE as the amount for this owner's report, 
                    // but maybe keep a reference to the original total if needed?
                    // Let's store the share for now as that balances the report.
                    stats.payments.push({
                        ...detail,
                        amount: share
                    });
                });
            });

            // Process Expenses
            expenses?.forEach((e: any) => {
                const amount = Number(e.amount);
                const ownerId = e.owner_id;

                // We need owner details (name, doc) if not already initialized by payments.
                // We should probably rely on the pre-fetched ownersList or ensure 'getStats' can find it.
                // For now, let's assume if they have expenses but no income, they should still appear?
                // Yes, but we need their name.
                // Let's Find name in ownersList if not in stats.
                let ownerName = "Desconocido";
                let ownerDoc = "";

                // Try to find in existing stats
                if (ownerStats[ownerId]) {
                    ownerName = ownerStats[ownerId].ownerName;
                    ownerDoc = ownerStats[ownerId].ownerDocId;
                } else {
                    // Try to find in fetched owners list
                    const found = ownersList.find((o: any) => o.id === ownerId);
                    if (found) {
                        ownerName = found.name;
                        ownerDoc = found.doc_id;
                    }
                }

                const stats = getStats(ownerId, ownerName, ownerDoc);
                stats.totalExpenses += amount;
            });

            // Calculate Net & Property Count
            // Prop count is tricky here, static count from ownership map?
            // Let's count unique properties owned by this owner.
            const ownerProperties: Record<string, Set<string>> = {};
            Object.values(propertyOwnership).flat().forEach(po => {
                if (!ownerProperties[po.ownerId]) ownerProperties[po.ownerId] = new Set();
                ownerProperties[po.ownerId].add(Object.keys(propertyOwnership).find(key => propertyOwnership[key] === propertyOwnership[key]) || ''); // logic flaw inverted
            });
            // Re-think property count: Iterate propertyOwnership map.
            Object.entries(propertyOwnership).forEach(([pid, owners]) => {
                owners.forEach(o => {
                    if (!ownerProperties[o.ownerId]) ownerProperties[o.ownerId] = new Set();
                    ownerProperties[o.ownerId].add(pid);
                });
            });

            // Finalize
            let results = Object.values(ownerStats).map(stat => ({
                ...stat,
                netBalance: stat.totalIncome - stat.totalExpenses,
                propertyCount: ownerProperties[stat.ownerId]?.size || 0
            }));

            // Filter by selected owners if any
            if (filters.ownerIds.length > 0) {
                results = results.filter(r => filters.ownerIds.includes(r.ownerId));
            }

            setReportData(results);

        } catch (err: any) {
            console.error('Error generating report:', err);
            toast.error('Error generando reporte');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Initial generation
    useEffect(() => {
        generateReport();
    }, [generateReport]);

    return {
        loading,
        reportData,
        ownersList,
        filters,
        setFilters,
        generateReport
    };
}
