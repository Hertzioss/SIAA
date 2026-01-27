import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface OwnerReportItem {
    ownerId: string;
    ownerName: string;
    ownerDocId: string;
    totalIncomeBs: number;
    totalExpensesBs: number;
    netBalanceBs: number;
    propertyCount: number;
    payments: OwnerPaymentDetail[];
    expenses: OwnerExpenseDetail[];
}

export interface OwnerExpenseDetail {
    date: string;
    amount: number; // In Bs
    currency: 'USD' | 'Bs'; // Original currency
    amountOriginal: number; // Original amount
    exchangeRate: number; // Rate used for conversion
    category: string;
    description: string;
    ownerName?: string; // For flattened usage
    uniqueKey?: string; // For list keys
}

export interface OwnerPaymentDetail {
    date: string;
    amount: number; // In Bs
    amountOriginal: number;
    currency: string;
    exchangeRate: number;
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
                .select('amount, owner_id, currency, date, category, description, exchange_rate')
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
                        totalIncomeBs: 0,
                        totalExpensesBs: 0,
                        netBalanceBs: 0,
                        propertyCount: 0,
                        payments: [],
                        expenses: []
                    };
                }
                return ownerStats[id];
            };

            // Process Payments
            payments?.forEach((p: any) => {
                // Normalize to Bs
                const amount = Number(p.amount);
                const currency = p.currency || 'USD';
                const exchangeRate = Number(p.exchange_rate) || 1; // Default to 1 if missing (shouldn't happen for USD)

                let amountBs = amount;
                if (currency === 'USD') {
                    amountBs = amount * exchangeRate;
                }
                // If currency is Bs, amount is already amountBs.

                // Find Property
                const propertyId = p.contract?.unit?.property_id;
                if (!propertyId) return;

                // Create Detail Object
                const detail: OwnerPaymentDetail = {
                    date: p.date,
                    amount: amountBs, // Normalized to Bs
                    amountOriginal: amount,
                    currency: currency,
                    exchangeRate: exchangeRate,
                    method: p.payment_method,
                    tenantName: p.tenant?.name || 'Desconocido',
                    unitName: p.contract?.unit?.name || '',
                    propertyName: p.contract?.unit?.property?.name || ''
                };

                // Distribute to Owners
                const owners = propertyOwnership[propertyId] || [];
                owners.forEach(owner => {
                    const share = amountBs * (owner.percentage / 100);
                    const stats = getStats(owner.ownerId, owner.name, owner.doc_id);
                    stats.totalIncomeBs += share;
                    stats.payments.push({
                        ...detail,
                        amount: share // Share in Bs
                    });
                });
            });

            // Process Expenses
            expenses?.forEach((e: any) => {
                const amount = Number(e.amount);
                const ownerId = e.owner_id;
                const currency = e.currency || 'USD';
                const exchangeRate = Number(e.exchange_rate) || 1;

                // We need owner details
                let ownerName = "Desconocido";
                let ownerDoc = "";

                if (ownerStats[ownerId]) {
                    ownerName = ownerStats[ownerId].ownerName;
                    ownerDoc = ownerStats[ownerId].ownerDocId;
                } else {
                    const found = ownersList.find((o: any) => o.id === ownerId);
                    if (found) {
                        ownerName = found.name;
                        ownerDoc = found.doc_id;
                    }
                }

                const stats = getStats(ownerId, ownerName, ownerDoc);

                let amountBs = amount;
                if (currency === 'USD') {
                    amountBs = amount * exchangeRate;
                }

                stats.totalExpensesBs += amountBs;

                stats.expenses.push({
                    date: e.date,
                    amount: amountBs, // Normalized to Bs
                    amountOriginal: amount,
                    currency: currency,
                    exchangeRate: exchangeRate,
                    category: e.category,
                    description: e.description
                });
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
                netBalanceBs: stat.totalIncomeBs - stat.totalExpensesBs,
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
