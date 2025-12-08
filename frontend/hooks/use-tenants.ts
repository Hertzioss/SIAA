import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tenant } from '@/types/tenant';
import { toast } from 'sonner';

export interface ContractData {
    unit_id: string;
    start_date: string;
    end_date: string;
    rent_amount: number;
    type: 'residential' | 'commercial';
}

export function useTenants() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTenants = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('tenants')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setTenants(data || []);
        } catch (err: any) {
            console.error('Error fetching tenants:', err);
            setError(err.message);
            toast.error('Error al cargar inquilinos');
        } finally {
            setLoading(false);
        }
    }, []);

    const createTenant = async (
        tenantData: Omit<Tenant, 'id' | 'created_at'>,
        contractData?: ContractData
    ) => {
        try {
            // 1. Create Tenant
            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .insert(tenantData)
                .select()
                .single();

            if (tenantError) throw tenantError;

            // 2. Create Contract if data provided
            if (contractData && tenant) {
                const { error: contractError } = await supabase
                    .from('contracts')
                    .insert({
                        tenant_id: tenant.id,
                        unit_id: contractData.unit_id,
                        start_date: contractData.start_date,
                        end_date: contractData.end_date,
                        rent_amount: contractData.rent_amount,
                        type: contractData.type,
                        status: 'active'
                    });

                if (contractError) {
                    console.error('Error creating contract:', contractError);
                    toast.error('Inquilino creado, pero hubo un error al crear el contrato.');
                    // Consider whether to rollback tenant creation here, 
                    // but for now we'll just notify the user.
                } else {
                    // Update unit status to occupied
                    await supabase
                        .from('units')
                        .update({ status: 'occupied' })
                        .eq('id', contractData.unit_id);

                    // Create Welcome Notification for Admins
                    await supabase
                        .from('notifications')
                        .insert({
                            title: 'Nuevo Inquilino Registrado',
                            message: `Se ha registrado al inquilino ${tenant.name} en la unidad ${contractData.unit_id} (referencia interna).`,
                            type: 'info',
                            tenant_id: tenant.id
                        });
                }
            } else if (tenant) {
                // Create Welcome Notification for Admins (No Contract)
                await supabase
                    .from('notifications')
                    .insert({
                        title: 'Nuevo Inquilino Registrado',
                        message: `Se ha registrado al inquilino ${tenant.name} sin contrato inicial.`,
                        type: 'info',
                        tenant_id: tenant.id
                    });
            }

            toast.success('Inquilino registrado exitosamente');

            // Create User Account & Send Email (Async)
            if (tenant.email) {
                try {
                    await fetch('/api/tenants/create-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: tenant.email,
                            name: tenant.name,
                            tenantId: tenant.id
                        })
                    });
                    toast.success('Cuenta de usuario creada y credenciales enviadas');
                } catch (userErr) {
                    console.error("Failed to create user account:", userErr);
                    toast.warning('Inquilino creado, pero hubo un error creando su cuenta de acceso.');
                }
            }

            fetchTenants();
            return tenant;


        } catch (err: any) {
            console.error('Error creating tenant:', err);
            toast.error(`Error al registrar inquilino: ${err.message}`);
            throw err;
        }
    };

    const updateTenant = async (id: string, tenantData: Partial<Omit<Tenant, 'id' | 'created_at'>>) => {
        try {
            const { error } = await supabase
                .from('tenants')
                .update(tenantData)
                .eq('id', id);

            if (error) throw error;

            toast.success('Inquilino actualizado exitosamente');
            fetchTenants();
        } catch (err: any) {
            console.error('Error updating tenant:', err);
            toast.error(`Error al actualizar inquilino: ${err.message}`);
            throw err;
        }
    };

    const deleteTenant = async (id: string) => {
        try {
            const { error } = await supabase
                .from('tenants')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Inquilino eliminado');
            setTenants(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
            console.error('Error deleting tenant:', err);
            toast.error('Error al eliminar inquilino');
            throw err;
        }
    };

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    return {
        tenants,
        loading,
        error,
        fetchTenants,
        createTenant,
        updateTenant,
        deleteTenant
    };
}
