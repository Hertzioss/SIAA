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
                            name
                        )
                    ),
                    tenants (
                        name
                    )
                `)
                .order('start_date', { ascending: false, nullsFirst: false })

            if (error) throw error

            setContracts(data as Contract[])
        } catch (err: any) {
            console.error('Error fetching contracts:', err)
            setError(err.message)
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
                            name
                        )
                    )
                `)
                .eq('tenant_id', tenantId)
                .order('start_date', { ascending: false })

            if (error) throw error
            setContracts(data as Contract[])
        } catch (err: any) {
            console.error('Error fetching tenant contracts:', err)
            setError(err.message)
            toast.error('Error al cargar contratos del inquilino')
        } finally {
            setIsLoading(false)
        }
    }, [])

    const createContract = async (contract: ContractInsert) => {
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
            if ((contract as any).file) {
                const file = (contract as any).file;
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
            delete (payload as any).file;

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
        } catch (err: any) {
            console.error('Error creating contract:', err)
            toast.error(err.message || 'Error al crear el contrato')
            throw err
        }
    }

    const updateContract = async (id: string, updates: ContractUpdate) => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            setContracts((prev) =>
                prev.map((c) => (c.id === id ? { ...c, ...data } : c))
            )
            toast.success('Contrato actualizado exitosamente')
            fetchContracts() // Refresh to get joined data
            return data
        } catch (err: any) {
            console.error('Error updating contract:', err)
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
            toast.success('Contrato eliminado exitosamente')
        } catch (err: any) {
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
