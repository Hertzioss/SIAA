import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tenant } from '@/types/tenant';
import { toast } from 'sonner';


interface DbError {
    code?: string;
    message?: string;
    details?: string;
}

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
            const { data, error: fetchError } = await supabase
                .from('tenants')
                .select(`
                    *,
                    contracts (
                        status,
                        unit:units (
                            property:properties (
                                id,
                                name
                            )
                        )
                    ),
                    contacts:tenant_contacts (*)
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            // Post-process to attach "currentProperty" for easier UI handling if needed
            // But raw structure is fine if we filter carefully.
            setTenants((data as Tenant[]) || []);
        } catch (err: unknown) {
            console.error('Error fetching tenants:', err);
            const message = err instanceof Error ? err.message : (err as { message: string })?.message || 'Error desconocido';
            setError(message);
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
            // 0. CHECK AVAILABILITY if contract is requested
            if (contractData) {
                const { data: existingContract, error: checkError } = await supabase
                    .from('contracts')
                    .select('id')
                    .eq('unit_id', contractData.unit_id)
                    .eq('status', 'active')
                    .maybeSingle();

                if (checkError) throw checkError;

                if (existingContract) {
                    throw new Error("La unidad seleccionada ya tiene un contrato activo.");
                }
            }

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

                    // Fetch unit name for the notification
                    const { data: unitData } = await supabase
                        .from('units')
                        .select('name')
                        .eq('id', contractData.unit_id)
                        .single();
                    const unitName = unitData?.name || contractData.unit_id;

                    // Create Welcome Notification for Admins
                    await supabase
                        .from('notifications')
                        .insert({
                            title: 'Nuevo Inquilino Registrado',
                            message: `Se ha registrado al inquilino ${tenant.name} en la unidad ${unitName}.`,
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

            toast.success(`Inquilino ${tenant.name} registrado`, {
                description: contractData 
                    ? 'Se ha creado el inquilino y su contrato activo.'
                    : 'Inquilino registrado correctamente (sin contrato).',
                duration: 5000,
            });

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
                    toast.info('Cuenta de usuario creada', {
                         description: 'Se han enviado las credenciales al correo del inquilino.',
                         duration: 5000
                    });
                } catch (userErr) {
                    console.error("Failed to create user account:", userErr);
                    toast.warning('Advertencia de Cuenta', {
                        description: 'Inquilino creado, pero hubo un error generando su acceso al sistema.',
                        duration: 6000
                    });
                }
            }

            fetchTenants();
            return tenant;


        } catch (error: unknown) {
            const err = error as DbError;
            const errorString = JSON.stringify(err);
            
            // Comprehensive duplicate detection
            const isDocDuplicate = 
                err.code === '23505' && (
                    err.message?.includes('tenants_doc_id_key') || 
                    errorString.includes('tenants_doc_id_key') ||
                    errorString.includes('doc_id')
                );

            const isEmailDuplicate = 
                err.code === '23505' && (
                    err.message?.includes('tenants_email_key') || 
                    errorString.includes('tenants_email_key') ||
                    errorString.includes('email')
                );

            if (isDocDuplicate) {
                console.warn('Duplicate doc_id handled:', err.message);
                toast.error('Cédula/RIF Duplicado', {
                    description: 'El número de cédula o RIF ya está registrado para otro inquilino.',
                    duration: 6000,
                });
            } else if (isEmailDuplicate) {
                console.warn('Duplicate email handled:', err.message);
                toast.error('Correo Duplicado', {
                    description: 'El correo electrónico ya está asociado a otro inquilino.',
                    duration: 6000,
                });
            } else if (err.code === '23503') { // Foreign Key Violation
                console.error('Foreign key violation:', errorString);
                 toast.error('Referencia Inválida', {
                    description: 'Se intentó asignar una propiedad o unidad que no existe.',
                    duration: 6000,
                });
            } else if (err.code === '23502') { // Not Null Violation
                console.error('Not null violation:', errorString);
                 toast.error('Datos Incompletos', {
                    description: 'Faltan campos obligatorios por completar.',
                    duration: 6000,
                });
            } else {
                console.error('Error creating tenant:', errorString);
                toast.error('Error al registrar inquilino', {
                    description: err.message || 'Ocurrió un error inesperado. Intente nuevamente.',
                    duration: 5000,
                });
            }
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
        } catch (error: unknown) {
            const err = error as DbError;
            console.error('Error updating tenant:', err);
            toast.error(`Error al actualizar inquilino: ${err.message}`);
            throw err;
        }
    };

    const deleteTenant = async (id: string) => {
        try {
            // 0. Fetch tenant to get user_id
            const { data: tenantData, error: fetchError } = await supabase
                .from('tenants')
                .select('user_id')
                .eq('id', id)
                .single();

            if (fetchError) {
                console.error("Error fetching tenant details before deletion:", fetchError);
                // We continue to try to delete the DB records even if fetch fails, 
                // though it might mean we miss deleting the user.
            }

            // 1. Get all contracts to delete their payments ensuring no orphans
            const { data: tenantContracts } = await supabase
                .from('contracts')
                .select('id')
                .eq('tenant_id', id);

            const contractIds = tenantContracts?.map(c => c.id) || [];

            // 2. Delete all payments associated with these contracts
            if (contractIds.length > 0) {
                const { error: paymentsContractError } = await supabase
                    .from('payments')
                    .delete()
                    .in('contract_id', contractIds);

                if (paymentsContractError) throw paymentsContractError;
            }

            // 3. Delete any remaining payments directly linked to the tenant
            const { error: paymentsError } = await supabase
                .from('payments')
                .delete()
                .eq('tenant_id', id);

            if (paymentsError) throw paymentsError;

            // 4. Delete associated contracts
            const { error: contractsError } = await supabase
                .from('contracts')
                .delete()
                .eq('tenant_id', id);

            if (contractsError) throw contractsError;

            // 5. Delete the tenant
            const { error } = await supabase
                .from('tenants')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // 6. Delete Auth User (if exists)
            if (tenantData?.user_id) {
                try {
                    await fetch('/api/tenants/delete-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: tenantData.user_id })
                    });
                } catch (authErr) {
                    console.error('Failed to delete auth user:', authErr);
                    // We don't throw here to avoid showing an error if the DB delete was successful
                    // but maybe we should toast a warning?
                    toast.warning('Inquilino eliminado, pero hubo un error eliminando su cuenta de usuario.');
                }
            }

            toast.success('Inquilino y sus registros asociados eliminados');
            setTenants(prev => prev.filter(t => t.id !== id));
        } catch (error: unknown) {
            const err = error as DbError;
            console.error('Error deleting tenant:', err);
            // Supabase errors usually have a details or message field
            const errorMessage = err?.message || err?.details || JSON.stringify(err);
            toast.error(`Error al eliminar inquilino: ${errorMessage}`);
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
