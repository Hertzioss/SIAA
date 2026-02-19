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

interface PropertyData {
    name: string;
}

interface UnitData {
    name: string;
    type?: string;
    properties: PropertyData | PropertyData[];
}

interface ContractData {
    id: string;
    units: UnitData | UnitData[];
}

interface PaymentQueryRow extends Pick<BasePayment, 
    'id' | 'amount' | 'date' | 'status' | 'currency' | 'method' | 'payment_method' | 
    'exchange_rate' | 'reference_number' | 'reference' | 'billing_period' | 'notes' | 
    'contract_id' | 'tenant_id' | 'created_at' | 'proof_url' | 'concept' | 'metadata'
> {
    tenants: {
        name: string;
        doc_id: string;
        email?: string;
    } | {
        name: string;
        doc_id: string;
        email?: string;
    }[] | null;
}

export function usePayments() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination & Filters State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('pending');
    const [searchTerm, setSearchTerm] = useState("");

    // Use server-side searching for better performance with large datasets

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('payments')
                .select(`
                    id, amount, date, status, currency, method, payment_method, exchange_rate, reference_number, reference, billing_period, notes, contract_id, tenant_id, created_at, proof_url, concept, metadata,
                    tenants(name, doc_id, email)
                `, { count: 'estimated' });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (searchTerm) {
                // To search by tenant name across relations in a single server-side query without a DB View,
                // we first fetch matching tenant IDs.
                const { data: matchingTenants } = await supabase
                    .from('tenants')
                    .select('id')
                    .ilike('name', `%${searchTerm}%`);
                
                const tenantIds = matchingTenants?.map(t => t.id) || [];
                
                // Build the OR filter string
                let orFilter = `reference_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`;
                if (tenantIds.length > 0) {
                    orFilter += `,tenant_id.in.(${tenantIds.map(id => `"${id}"`).join(',')})`;
                }
                
                query = query.or(orFilter);
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

            // 2. Fetch Contract Details (Batch) to avoid deep join timeout
            const contractIds = data?.map((p: PaymentQueryRow) => p.contract_id).filter(Boolean) || [];
            const contractsMap: Record<string, ContractData> = {};

            if (contractIds.length > 0) {
                const { data: contractsData } = await supabase
                    .from('contracts')
                    .select(`
                        id,
                        units (
                            name, type,
                            properties (
                                name
                            )
                        )
                    `)
                    .in('id', contractIds);
                
                contractsData?.forEach((c: ContractData) => {
                    // Force cast to ContractData as Supabase types might not perfectly align with our manual join shape without generics
                    contractsMap[c.id] = c;
                });
            }

            // Transform data
            const formatted: Payment[] = data?.map((p: PaymentQueryRow) => {
                try {
                    // Get contract from map instead of join
                    const contractData = contractsMap[p.contract_id || ''];
                    
                    // Handle relations without aliases (plural standard)
                    // const contractData = Array.isArray(p.contracts) ? p.contracts[0] : p.contracts; // OLD
                    
                    const unitData = Array.isArray(contractData?.units) ? contractData?.units[0] : contractData?.units;
                    
                    const propertyData = Array.isArray(unitData?.properties) ? unitData?.properties[0] : unitData?.properties;

                    const tenantFromMetadata = p.metadata?.tenant_name ? {
                        name: p.metadata.tenant_name as string,
                        doc_id: (p.metadata.tenant_doc_id as string) || "",
                        email: (Array.isArray(p.tenants) ? p.tenants[0]?.email : p.tenants?.email) || undefined
                    } : null;

                    const tenantData = tenantFromMetadata || (Array.isArray(p.tenants) ? p.tenants[0] : p.tenants) || undefined;

                    return {
                        ...p,
                        // Map DB columns to Frontend Interface
                        reference: p.reference || p.reference_number,
                        billing_period: p.billing_period,
                        tenants: tenantData, // mapped from 'tenants' relation
                        tenant: tenantData, // alias for frontend consistency
                        
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
            }).filter(Boolean) as Payment[] || []; // Filter out failed mappings

            // No client-side sort or slice needed anymore
            setPayments(formatted);
            setTotal(count || 0);
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error fetching payments details:', error.message, error.stack);
            toast.error('Error al cargar pagos', { description: error.message || 'Error desconocido' });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, statusFilter, searchTerm]);

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
            const tenantData = (Array.isArray(p.tenants) ? p.tenants[0] : p.tenants) || undefined;

            return {
                ...p,
                reference: p.reference || p.reference_number,
                billing_period: p.billing_period,
                tenants: tenantData,
                tenant: tenantData,
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
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error updating payment:', error);
             // Check for specific API errors
            const errorMessage = error.message || 'Error desconocido al procesar el pago';
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
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error updating payment details:', error)
            toast.error('No se pudo actualizar el pago', { description: error.message })
        }
    }
    const deletePayment = async (id: string) => {
        try {
            const { error } = await supabase
                .from('payments')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success("Pago eliminado correctamente")
            fetchPayments() // Refresh list
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error deleting payment:', error)
            toast.error('No se pudo eliminar el pago', { description: error.message })
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
        searchTerm,
        setSearchTerm,
        fetchPayments,
        fetchFullPayment,
        updatePaymentStatus,
        updatePayment,
        deletePayment,
        setPageSize
    };
}
