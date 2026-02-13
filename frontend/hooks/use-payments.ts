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
                    id, amount, date, status, currency, method, payment_method, exchange_rate, reference_number, reference, billing_period, notes, contract_id, tenant_id, created_at, proof_url,
                    tenants(name, doc_id, email),
                    contracts(
                        units(
                            name, type,
                            properties(
                                name
                            )
                        )
                    )
                `, { count: 'estimated' });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // Server-side Pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // Sort by Date Descending (Newest first) is the most performant default
            // The previous "Pending first" client-sort is too expensive for large datasets
            const { data, count, error } = await query
                .order('date', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // Transform data
            const formatted: Payment[] = data?.map((p: any) => {
                try {
                    // Handle relations without aliases (plural standard)
                    const contractData = Array.isArray(p.contracts) ? p.contracts[0] : p.contracts;
                    const unitData = Array.isArray(contractData?.units) ? contractData?.units[0] : contractData?.units;
                    
                    const propertyData = Array.isArray(unitData?.properties) ? unitData?.properties[0] : unitData?.properties;

                    return {
                        ...p,
                        // Map DB columns to Frontend Interface
                        reference: p.reference || p.reference_number,
                        billing_period: p.billing_period,
                        tenants: p.tenants, // mapped from 'tenants' relation
                        tenant: p.tenants, // alias for frontend consistency
                        
                        // Main list doesn't need deep owner structure, just basics for table
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
                } catch (mapErr) {
                    console.error("Error mapping payment item:", p, mapErr);
                    return null;
                }
            }).filter(Boolean) || []; // Filter out failed mappings

            // No client-side sort or slice needed anymore
            setPayments(formatted);
            setTotal(count || 0);

        } catch (err: any) {
            console.error('Error fetching payments details:', err.message, err.stack);
            toast.error('Error al cargar pagos', { description: err.message || 'Error desconocido' });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, statusFilter]);

    // Fetch single payment with full details (for receipt)
    const fetchFullPayment = async (id: string): Promise<Payment | null> => {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    tenants(name, doc_id, email),
                    contracts(
                        units(
                            name, type,
                            properties(
                                name,
                                property_owners(
                                    owners(name, doc_id, logo_url)
                                )
                            )
                        )
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return null;

            // Transform single item
            const p = data;
            const contractData = Array.isArray(p.contracts) ? p.contracts[0] : p.contracts;
            const unitData = Array.isArray(contractData?.units) ? contractData?.units[0] : contractData?.units;
            const propertyData = Array.isArray(unitData?.properties) ? unitData?.properties[0] : unitData?.properties;

            return {
                ...p,
                reference: p.reference || p.reference_number,
                billing_period: p.billing_period,
                tenants: p.tenants,
                tenant: p.tenants,
                contracts: {
                    units: {
                        name: unitData?.name,
                        type: unitData?.type,
                        properties: propertyData
                    }
                },
                method: p.method,
                payment_method: p.payment_method,
                unit: {
                    name: unitData?.name,
                    property_name: propertyData?.name
                }
            };

        } catch (err) {
            console.error("Error fetching full payment:", err);
            toast.error("Error cargando detalles del recibo");
            return null;
        }
    }

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

    const updatePayment = async (id: string, updates: Partial<Payment>) => {
        try {
            const { error } = await supabase
                .from('payments')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            toast.success("Pago actualizado correctamente")
            fetchPayments() // Refresh list
        } catch (err: any) {
            console.error('Error updating payment details:', err)
            toast.error('No se pudo actualizar el pago', { description: err.message })
        }
    }

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
        fetchFullPayment,
        updatePaymentStatus,
        updatePayment,
        setPageSize
    };
}
