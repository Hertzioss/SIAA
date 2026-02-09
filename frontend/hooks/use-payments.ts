import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Payment as BasePayment, PaymentStatus } from '@/types/payment';

export type PaymentStatusFilter = 'all' | PaymentStatus;

// Extend the base payment type with the flattened display fields used in the UI
export interface Payment extends BasePayment {
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
    const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');

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
            const formatted: Payment[] = data?.map((p: any) => {
                const contractData = Array.isArray(p.contract) ? p.contract[0] : p.contract;
                const unitData = Array.isArray(contractData?.unit) ? contractData?.unit[0] : contractData?.unit;
                const propertyData = Array.isArray(unitData?.property) ? unitData?.property[0] : unitData?.property;

                return {
                    ...p,
                    // Map DB columns to Frontend Interface
                    // Backend might have reference or reference_number. We map reference_number to reference for UI consistency if needed,
                    // but the new type has both. Let's populate specific fields if missing.
                    reference: p.reference || p.reference_number, 
                    billing_period: p.billing_period, // Ensure this is passed
                    tenants: p.tenant, // Direct fetch - Note: Shared type expects 'tenants' (plural) or 'tenant'?
                    // The shared type has `tenants?: { ... }`.
                    // The query returns `tenant:tenants(...)`. So `p.tenant` is the object.
                    // We need to map `p.tenant` to the property expected by consumers or conform to the type.
                    // The shared type `Payment` does NOT have `tenant` or `contracts`. `PaymentWithDetails` does.
                    // But this hook uses `Payment[]`. 
                    // Let's cast to `any` for the extra fields or extend the type locally if we want strictly typed extra fields not in the base interface?
                    // Actually, `PaymentWithDetails` from types seems appropriate here.
                    
                    // Let's populate the base fields safely
                    method: p.method, // Can be null
                    payment_method: p.payment_method, // Can be null
                    
                    unit: {
                        name: unitData?.name,
                        property_name: propertyData?.name
                    }
                };
            }) || [];

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
