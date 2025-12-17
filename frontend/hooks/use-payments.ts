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
    // Relations joined
    tenant?: {
        name: string;
        doc_id: string;
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

            // Pagination ranges
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, count, error } = await query
                .order('date', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // Transform data
            const formatted = data?.map((p: any) => ({
                ...p,
                tenant: p.tenant, // Direct fetch
                unit: {
                    name: p.contract?.unit?.name,
                    property_name: p.contract?.unit?.property?.name
                }
            })) || [];

            setPayments(formatted);
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
