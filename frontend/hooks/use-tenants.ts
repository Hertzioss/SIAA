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
    end_date: string | null;
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
                        rent_amount,
                        unit:units (
                            id,
                            name,
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
                    // Update unit status to occupied and sync default rent amount
                    await supabase
                        .from('units')
                        .update({ status: 'occupied', default_rent_amount: contractData.rent_amount })
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
            // First, get the current tenant to know if they have a linked user account
            const { data: currentTenant, error: fetchError } = await supabase
                .from('tenants')
                .select('user_id')
                .eq('id', id)
                .single();

            if (fetchError) console.warn("Could not fetch tenant before update", fetchError);

            const { error } = await supabase
                .from('tenants')
                .update(tenantData)
                .eq('id', id);

            if (error) throw error;

            // Sync with auth system if the email or name changed
            if (currentTenant?.user_id && (tenantData.email || tenantData.name)) {
                try {
                    await fetch('/api/tenants/update-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: currentTenant.user_id,
                            email: tenantData.email,
                            name: tenantData.name
                        })
                    });
                } catch (syncError) {
                    console.error("Failed to sync tenant data to auth user:", syncError);
                    toast.warning("Inquilino actualizado, pero hubo un error sincronizando sus accesos.");
                }
            }

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

            // 1. Get all contracts of this tenant
            const { data: tenantContracts } = await supabase
                .from('contracts')
                .select('id, unit_id')
                .eq('tenant_id', id);

            const contractIds = tenantContracts?.map(c => c.id) || [];

            // 1.5 Protect historical accounting data: do not allow deleting a tenant with payments
            const { count: directPaymentsCount, error: directCountError } = await supabase
                .from('payments')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', id);
            if (directCountError) throw directCountError;

            let contractPaymentsCount = 0;
            if (contractIds.length > 0) {
                const { count, error: contractCountError } = await supabase
                    .from('payments')
                    .select('id', { count: 'exact', head: true })
                    .in('contract_id', contractIds);
                if (contractCountError) throw contractCountError;
                contractPaymentsCount = count || 0;
            }

            const totalPayments = Math.max(directPaymentsCount || 0, contractPaymentsCount);
            if (totalPayments > 0) {
                toast.error('No se puede eliminar este inquilino', {
                    description: `Tiene ${totalPayments} pago(s) registrado(s). Para cambiar de inquilino en una propiedad, finaliza su contrato para conservar todo su historial.`,
                    duration: 7000,
                });
                return false;
            }

            // 2. Delete associated contracts (safe since 0 payments exist)
            const { error: contractsError } = await supabase
                .from('contracts')
                .delete()
                .eq('tenant_id', id);

            if (contractsError) throw contractsError;

            // Free any units that were only linked to these contracts
            const affectedUnitIds = Array.from(new Set(tenantContracts?.map(c => c.unit_id).filter(Boolean) || []));
            for (const unitId of affectedUnitIds) {
                const { count: remainingActive } = await supabase
                    .from('contracts')
                    .select('id', { count: 'exact', head: true })
                    .eq('unit_id', unitId)
                    .eq('status', 'active');
                if ((remainingActive || 0) === 0) {
                    await supabase.from('units').update({ status: 'vacant' }).eq('id', unitId);
                }
            }

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
