import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface OwnerReportItem {
    ownerId: string;
    ownerName: string;
    ownerDocId: string;
    ownerEmail: string | null;
    totalIncomeBs: number;
    totalIncomeUsd: number;
    totalExpensesBs: number;
    totalExpensesUsd: number;
    netBalanceBs: number;
    netBalanceUsd: number;
    propertyCount: number;
    payments: OwnerPaymentDetail[];
    expenses: OwnerExpenseDetail[];
}

export interface OwnerExpenseDetail {
    date: string;
    amount: number; // In Bs
    amountUsd: number; // In USD
    currency: string; // Original currency
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
    amountUsd: number; // In USD
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
    propertyIds: string[]; // Empty = All
}

export function useOwnerReport() {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<OwnerReportItem[]>([]);
    const [ownersList, setOwnersList] = useState<any[]>([]);

    // Default filters: Current Month
    const [filters, setFilters] = useState({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
        ownerIds: [],
        propertyIds: []
    });

    // Fetch basic lists (Owners) only once
    useEffect(() => {
        const fetchOwners = async () => {
            const { data, error } = await supabase
                .from('owners')
                .select('id, name, doc_id, email')
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
                .select('property_id, owner_id, percentage, owners(name, doc_id, email)');

            if (poError) throw poError;

            const propertyOwnership: Record<string, { ownerId: string, name: string, doc_id: string, email: string | null, percentage: number }[]> = {};
            propOwners?.forEach((po: any) => {
                if (!propertyOwnership[po.property_id]) {
                    propertyOwnership[po.property_id] = [];
                }
                propertyOwnership[po.property_id].push({
                    ownerId: po.owner_id,
                    name: po.owners?.name,
                    doc_id: po.owners?.doc_id,
                    email: po.owners?.email || null,
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
            const getStats = (id: string, name: string, doc: string, email?: string | null) => {
                if (!ownerStats[id]) {
                    ownerStats[id] = {
                        ownerId: id,
                        ownerName: name,
                        ownerDocId: doc,
                        ownerEmail: email || null,
                        totalIncomeBs: 0,
                        totalIncomeUsd: 0,
                        totalExpensesBs: 0,
                        totalExpensesUsd: 0,
                        netBalanceBs: 0,
                        netBalanceUsd: 0,
                        propertyCount: 0,
                        payments: [],
                        expenses: []
                    };
                }
                return ownerStats[id];
            };

            // Process Payments
            payments?.forEach((p: any) => {
                const amount = Number(p.amount);
                const currency = p.currency || 'USD';
                const exchangeRate = Number(p.exchange_rate) || 1;

                let amountBs = amount;
                let amountUsd = amount;

                if (currency === 'USD') {
                    amountBs = amount * exchangeRate;
                    amountUsd = amount;
                } else {
                    amountBs = amount;
                    amountUsd = exchangeRate > 0 ? amount / exchangeRate : 0;
                }

                // Find Property
                const propertyId = p.contract?.unit?.property_id;
                if (!propertyId) return;

                // Apply Property Filter
                if (filters.propertyIds.length > 0 && !filters.propertyIds.includes(propertyId)) return;

                // Create Detail Object
                const detail: OwnerPaymentDetail = {
                    date: p.date,
                    amount: amountBs,
                    amountUsd: amountUsd,
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
                    const shareBs = amountBs * (owner.percentage / 100);
                    const shareUsd = amountUsd * (owner.percentage / 100);
                    
                    const stats = getStats(owner.ownerId, owner.name, owner.doc_id, owner.email);
                    stats.totalIncomeBs += shareBs;
                    stats.totalIncomeUsd += shareUsd;
                    stats.payments.push({
                        ...detail,
                        amount: shareBs,
                        amountUsd: shareUsd
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

                const ownerEmail = ownerStats[ownerId]?.ownerEmail || ownersList.find((o: any) => o.id === ownerId)?.email || null;
                const stats = getStats(ownerId, ownerName, ownerDoc, ownerEmail);

                let amountBs = amount;
                let amountUsd = amount;

                if (currency === 'USD') {
                    amountBs = amount * exchangeRate;
                    amountUsd = amount;
                } else {
                    amountBs = amount;
                    amountUsd = exchangeRate > 0 ? amount / exchangeRate : 0;
                }

                stats.totalExpensesBs += amountBs;
                stats.totalExpensesUsd += amountUsd;

                stats.expenses.push({
                    date: e.date,
                    amount: amountBs,
                    amountUsd: amountUsd,
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
                netBalanceUsd: stat.totalIncomeUsd - stat.totalExpensesUsd,
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

    const sendReportEmail = useCallback(async (ownerData: OwnerReportItem, period: string) => {
        if (!ownerData.ownerEmail) {
            toast.error(`${ownerData.ownerName} no tiene correo electrónico registrado`);
            return false;
        }

        try {
            const formatMoney = (amount: number, currency: 'USD' | 'Bs' = 'USD') => {
                if (currency === 'Bs') return `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
                return `$${amount.toFixed(2)}`;
            };

            const paymentRows = ownerData.payments.map(p => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 6px 8px; font-size: 12px;">${p.date}</td>
                    <td style="padding: 6px 8px; font-size: 12px;">${p.tenantName}</td>
                    <td style="padding: 6px 8px; font-size: 12px;">${p.unitName}</td>
                    <td style="padding: 6px 8px; font-size: 12px; text-align: right;">${formatMoney(p.amountUsd)}</td>
                    <td style="padding: 6px 8px; font-size: 12px; text-align: right;">${formatMoney(p.amount, 'Bs')}</td>
                </tr>
            `).join('');

            const expenseRows = ownerData.expenses.map(e => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 6px 8px; font-size: 12px;">${e.date ? e.date.split('T')[0] : '-'}</td>
                    <td style="padding: 6px 8px; font-size: 12px;">${e.category}</td>
                    <td style="padding: 6px 8px; font-size: 12px;">${e.description}</td>
                    <td style="padding: 6px 8px; font-size: 12px; text-align: right;">${formatMoney(e.amountUsd)}</td>
                    <td style="padding: 6px 8px; font-size: 12px; text-align: right;">${formatMoney(e.amount, 'Bs')}</td>
                </tr>
            `).join('');

            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
                    <h2 style="text-align: center; color: #1f2937;">Reporte Financiero</h2>
                    <p style="text-align: center; color: #6b7280; font-size: 14px;">Período: ${period}</p>

                    <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 16px 0;">
                        <p style="margin: 4px 0; font-size: 14px;"><strong>Propietario:</strong> ${ownerData.ownerName}</p>
                        <p style="margin: 4px 0; font-size: 14px;"><strong>Documento:</strong> ${ownerData.ownerDocId}</p>
                        <p style="margin: 4px 0; font-size: 14px;"><strong>Propiedades:</strong> ${ownerData.propertyCount}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                        <tr>
                            <td style="padding: 12px; background: #d1fae5; border-radius: 6px; text-align: center;">
                                <div style="font-size: 12px; font-weight: bold; color: #047857;">INGRESOS</div>
                                <div style="font-size: 18px; font-weight: bold; color: #047857;">${formatMoney(ownerData.totalIncomeUsd)}</div>
                                <div style="font-size: 11px; color: #059669;">${formatMoney(ownerData.totalIncomeBs, 'Bs')}</div>
                            </td>
                            <td style="width: 8px;"></td>
                            <td style="padding: 12px; background: #fee2e2; border-radius: 6px; text-align: center;">
                                <div style="font-size: 12px; font-weight: bold; color: #b91c1c;">EGRESOS</div>
                                <div style="font-size: 18px; font-weight: bold; color: #b91c1c;">${formatMoney(ownerData.totalExpensesUsd)}</div>
                                <div style="font-size: 11px; color: #dc2626;">${formatMoney(ownerData.totalExpensesBs, 'Bs')}</div>
                            </td>
                            <td style="width: 8px;"></td>
                            <td style="padding: 12px; background: #dbeafe; border-radius: 6px; text-align: center;">
                                <div style="font-size: 12px; font-weight: bold; color: #1d4ed8;">BALANCE</div>
                                <div style="font-size: 18px; font-weight: bold; color: #1d4ed8;">${formatMoney(ownerData.netBalanceUsd)}</div>
                                <div style="font-size: 11px; color: #2563eb;">${formatMoney(ownerData.netBalanceBs, 'Bs')}</div>
                            </td>
                        </tr>
                    </table>

                    ${ownerData.payments.length > 0 ? `
                        <h3 style="color: #1f2937; font-size: 14px; margin-top: 24px;">Detalle de Ingresos</h3>
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db;">
                            <thead>
                                <tr style="background: #1f2937; color: white;">
                                    <th style="padding: 6px 8px; text-align: left; font-size: 11px;">FECHA</th>
                                    <th style="padding: 6px 8px; text-align: left; font-size: 11px;">INQUILINO</th>
                                    <th style="padding: 6px 8px; text-align: left; font-size: 11px;">UNIDAD</th>
                                    <th style="padding: 6px 8px; text-align: right; font-size: 11px;">MONTO ($)</th>
                                    <th style="padding: 6px 8px; text-align: right; font-size: 11px;">MONTO (Bs)</th>
                                </tr>
                            </thead>
                            <tbody>${paymentRows}</tbody>
                        </table>
                    ` : ''}

                    ${ownerData.expenses.length > 0 ? `
                        <h3 style="color: #1f2937; font-size: 14px; margin-top: 24px;">Detalle de Egresos</h3>
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db;">
                            <thead>
                                <tr style="background: #1f2937; color: white;">
                                    <th style="padding: 6px 8px; text-align: left; font-size: 11px;">FECHA</th>
                                    <th style="padding: 6px 8px; text-align: left; font-size: 11px;">CATEGORÍA</th>
                                    <th style="padding: 6px 8px; text-align: left; font-size: 11px;">DETALLE</th>
                                    <th style="padding: 6px 8px; text-align: right; font-size: 11px;">MONTO ($)</th>
                                    <th style="padding: 6px 8px; text-align: right; font-size: 11px;">MONTO (Bs)</th>
                                </tr>
                            </thead>
                            <tbody>${expenseRows}</tbody>
                        </table>
                    ` : ''}
                </div>
            `;

            const response = await fetch('/api/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: [{ email: ownerData.ownerEmail, name: ownerData.ownerName }],
                    subject: `Reporte Financiero - ${period}`,
                    message: html
                })
            });

            if (!response.ok) throw new Error('Error al enviar correo');

            toast.success(`Reporte enviado a ${ownerData.ownerEmail}`);
            return true;
        } catch (err) {
            console.error('Error sending owner report email:', err);
            toast.error('Error al enviar el reporte por correo');
            return false;
        }
    }, []);

    return {
        loading,
        reportData,
        ownersList,
        filters,
        setFilters,
        generateReport,
        sendReportEmail
    };
}
