import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner'

export type Contract = {
    id: string
    unit_id: string | null
    tenant_id: string | null
    contract_number: string | null
    start_date: string
    end_date: string | null
    rent_amount: number
    deposit_amount: number | null
    status: 'active' | 'expired' | 'cancelled'
    type: 'residential' | 'commercial' | null
    file_url: string | null
    // Joins
    units?: {
        name: string
        properties?: {
            name: string
        }
    }
    tenants?: {
        name: string
        email: string
    }
}

export type ContractInsert = Omit<Contract, 'id' | 'units' | 'tenants'>
export type ContractUpdate = Partial<ContractInsert>

export function useContracts() {
    const [contracts, setContracts] = useState<Contract[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchContracts = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    units (
                        name,
                        properties (
                            id,
                            name
                        )
                    ),
                    tenants (
                        name,
                        email
                    )
                `)
                .order('start_date', { ascending: false, nullsFirst: false })

            if (error) throw error

            setContracts(data as Contract[])
        } catch (err: unknown) {
            console.error('Error fetching contracts:', err)
            const message = (err as { message?: string })?.message || 'Error desconocido'
            setError(message)
            toast.error('Error al cargar contratos')
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    const fetchTenantContracts = useCallback(async (tenantId: string) => {
        setIsLoading(true)
        setError(null)
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    units (
                        name,
                        properties (
                            id,
                            name
                        )
                    ),
                    tenants (
                        name,
                        email
                    )
                `)
                .eq('tenant_id', tenantId)
                .order('start_date', { ascending: false })

            if (error) throw error
            setContracts(data as Contract[])
        } catch (err: unknown) {
            console.error('Error fetching tenant contracts:', err)
            const message = (err as { message?: string })?.message || 'Error desconocido'
            setError(message)
            toast.error('Error al cargar contratos del inquilino')
        } finally {
            setIsLoading(false)
        }
    }, [])

    const createContract = async (contract: ContractInsert & { file?: File | null }) => {
        try {
            // Validate availability
            if (contract.unit_id) {
                const { data: existing, error: checkError } = await supabase
                    .from('contracts')
                    .select('id')
                    .eq('unit_id', contract.unit_id)
                    .eq('status', 'active')
                    .maybeSingle(); // Use maybeSingle to avoid 406 on no rows

                if (checkError) throw checkError
                if (existing) {
                    throw new Error("La unidad seleccionada ya tiene un contrato activo.")
                }
            }

            // Upload File if provided
            let fileUrl = null;
            if (contract.file) {
                const file: File = contract.file;
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('contracts')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Error uploading contract:', uploadError);
                    toast.warning('Contrato creado, pero falló la carga del archivo.');
                } else {
                    // Get Public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('contracts')
                        .getPublicUrl(filePath);
                    fileUrl = publicUrl;
                }
            }

            const payload = {
                ...contract,
                file_url: fileUrl // Add URL to payload
            };
            // Remove file object from payload
            if ('file' in payload) {
                delete (payload as { file?: File }).file;
            }

            const { data, error } = await supabase
                .from('contracts')
                .insert(payload)
                .select()
                .single()

            if (error) throw error

            setContracts((prev) => [data as Contract, ...prev])
            toast.success('Contrato creado exitosamente')
            fetchContracts() // Refresh to get joined data/ensure consistency
            return data
        } catch (err: unknown) {
            console.error('Error creating contract:', err)
            const message = (err as { message?: string })?.message || 'Error al crear el contrato'
            toast.error(message)
            throw err
        }
    }

    const updateContract = async (id: string, updates: ContractUpdate & { file?: File }) => {
        try {
            const payload = { ...updates };

            // Handle File Upload if present
            if (updates.file) {
                const file: File = updates.file;
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('contracts')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Error uploading contract file:', uploadError);
                    toast.warning('Error al subir el archivo del contrato.');
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('contracts')
                        .getPublicUrl(filePath);

                    // Update file_url
                    payload.file_url = publicUrl;
                }
            }

            // Remove file object
            if ('file' in payload) {
                delete (payload as { file?: File }).file;
            }

            console.log("Updating contract with payload:", payload);

            const { data, error } = await supabase
                .from('contracts')
                .update(payload)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error("Supabase Update Error Detail:", error);
                throw error;
            }

            setContracts((prev) =>
                prev.map((c) => (c.id === id ? { ...c, ...data } : c))
            )
            toast.success('Contrato actualizado éxitosamente')
            fetchContracts() // Refresh to get joined data
            return data
        } catch (err: unknown) {
            console.error('Error updating contract:', err)
            // Log properties if it's an object
            if (typeof err === 'object' && err !== null) {
                console.error('Error properties:', JSON.stringify(err, null, 2));
            }
            toast.error('Error al actualizar el contrato')
            throw err
        }
    }

    const deleteContract = async (id: string) => {
        try {
            const { error } = await supabase
                .from('contracts')
                .delete()
                .eq('id', id)

            if (error) throw error

            setContracts((prev) => prev.filter((c) => c.id !== id))
            toast.success('Contrato eliminado éxitosamente')
        } catch (err: unknown) {
            console.error('Error deleting contract:', err)
            toast.error('Error al eliminar el contrato')
            throw err
        }
    }

    useEffect(() => {
        fetchContracts()
    }, [fetchContracts])

    return {
        contracts,
        isLoading,
        error,
        fetchContracts,
        fetchTenantContracts,
        createContract,
        updateContract,
        deleteContract,
    }
}
