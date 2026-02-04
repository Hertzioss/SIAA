import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Payment {
    id: string;
    contract_id: string;
    amount: number;
    date: string;
    method: 'transfer' | 'cash' | 'zelle' | 'pago_movil';
    reference?: string;
    status: 'pending' | 'approved' | 'rejected';
    notes?: string;
    proof_url?: string;
    created_at: string;
    currency?: 'USD' | 'VES';
    exchange_rate?: number;
    billing_period: string; // YYYY-MM-DD (First day of month)
    // Relations joined
    tenant?: {
        name: string;
        doc_id: string;
        email?: string;
    };
    unit?: {
        name: string;
        property_name?: string;
    };
}

export function usePayments() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination & Filters State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    // We can't search text easily on joined relations server-side with standard Supabase client in one go without complex RPC or multiple queries.
    // For simplicity/speed in this MVP, let's keep client-side filtering for search text, but server-side for status/pagination?
    // Actually, mixing is hard. Let's do simple pagination on the result.
    // OPTION B: Fetch based on filters.

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('payments')
                .select(`
                    *,
                    tenant:tenants(name, doc_id, email),
                    contract:contracts(
                        unit:units(name, property:properties(name))
                    )
                `, { count: 'exact' });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // Fetch more items to allow client-side sorting
            const { data, count, error } = await query
                .order('date', { ascending: false })
                .limit(1000);

            if (data && data.length > 0) {
                console.log("Raw Payment Data (First Item):", data[0]);
            }

            if (error) throw error;

            // Transform data
            const formatted = data?.map((p: any) => ({
                ...p,
                // Map DB columns to Frontend Interface
                reference: p.reference_number,
                billing_period: p.billing_period, // Ensure this is passed
                tenant: p.tenant, // Direct fetch
                unit: {
                    name: p.contract?.unit?.name,
                    property_name: p.contract?.unit?.property?.name
                }
            })) || [];

            // Client-side Sort: Pending first, then Date Descending
            formatted.sort((a: any, b: any) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });

            // Client-side Pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize;
            const paginated = formatted.slice(from, to);

            setPayments(paginated);
            setTotal(count || 0);

        } catch (err: any) {
            console.error('Error fetching payments:', err);
            toast.error('Error al cargar pagos');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, statusFilter]);

    const updatePaymentStatus = async (id: string, status: 'approved' | 'rejected', notes?: string, sendEmail: boolean = false) => {
        try {
            const res = await fetch('/api/payments/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status, notes, sendEmail })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error);

            toast.success(`Pago ${status === 'approved' ? 'conciliado' : 'rechazado'} correctamente`);
            fetchPayments(); // Refresh list to update UI
        } catch (err: any) {
            console.error('Error updating payment:', err);
            toast.error(`Error: ${err.message}`);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    return {
        payments,
        loading,
        total,
        page,
        setPage,
        pageSize,
        statusFilter,
        setStatusFilter,
        fetchPayments,
        updatePaymentStatus
    };
}
