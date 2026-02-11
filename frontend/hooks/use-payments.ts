import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Payment as BasePayment, PaymentStatus } from '@/types/payment';

export type PaymentStatusFilter = 'all' | PaymentStatus;

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
    // Structure needed for receipt printing
    contracts?: {
        units: {
            name: string;
            type?: string;
            properties: {
                name: string;
                property_owners: {
                    owners: {
                        name: string;
                        doc_id: string;
                        logo_url?: string;
                    }
                }[]
            }
        }
    };
    tenants?: {
        name: string;
        doc_id: string;
        email?: string;
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
                        unit:units(
                            name, type,
                            properties(
                                name,
                                property_owners(
                                    owners(name, doc_id, logo_url)
                                )
                            )
                        )
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
                // console.log("Raw Payment Data (First Item):", data[0]);
            }

            if (error) throw error;

            // Transform data
            const formatted: Payment[] = data?.map((p: any) => {
                const contractData = Array.isArray(p.contract) ? p.contract[0] : p.contract;
                const unitData = Array.isArray(contractData?.unit) ? contractData?.unit[0] : contractData?.unit;
                // Properties might be 'properties' or 'property' depending on alias. 
                // The query above allows implicit naming. usually 'units' -> 'properties' (FK unit.property_id)
                // In Supabase query above: unit:units(...) . Inside units: properties(...) (no alias).
                // So it will be unitData.properties
                const propertyData = Array.isArray(unitData?.properties) ? unitData?.properties[0] : unitData?.properties;

                return {
                    ...p,
                    // Map DB columns to Frontend Interface
                    reference: p.reference || p.reference_number, 
                    billing_period: p.billing_period, 
                    tenants: p.tenant, 
                    // Pass the raw nesting structure expected by PrintableReceiptHandler
                    contracts: {
                        units: {
                            name: unitData?.name,
                            type: unitData?.type,
                            properties: propertyData
                        }
                    },
                    
                    // Let's populate the base fields safely
                    method: p.method, 
                    payment_method: p.payment_method, 
                    
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

            toast.success(`Pago ${status === 'approved' ? 'conciliado' : 'rechazado'} correctamente`, {
                description: sendEmail 
                    ? 'Se ha notificado al inquilino por correo electrónico.'
                    : 'El estado del pago ha sido actualizado en el sistema.'
            });
            fetchPayments(); // Refresh list to update UI
        } catch (err: any) {
            console.error('Error updating payment:', err);
             // Check for specific API errors
            const errorMessage = err.message || 'Error desconocido al procesar el pago';
            toast.error(`No se pudo actualizar el pago`, { description: errorMessage });
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
        updatePaymentStatus,
        setPageSize
    };
}
