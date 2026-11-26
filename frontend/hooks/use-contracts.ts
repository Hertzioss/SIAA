import { useState, useEffect, useCallback, useRef } from 'react'
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
    status: 'active' | 'expired' | 'cancelled' | 'terminated'
    type: 'residential' | 'commercial' | null
    file_url: string | null
    // Joins
    units?: {
        name: string
        properties?: {
            id?: string
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

export function useContracts({ autoFetch = true }: { autoFetch?: boolean } = {}) {
    const [contracts, setContracts] = useState<Contract[]>([])
    const [isLoading, setIsLoading] = useState(autoFetch)
    const [error, setError] = useState<string | null>(null)
    const activeTenantIdRef = useRef<string | null>(null)

    const fetchContracts = useCallback(async () => {
        activeTenantIdRef.current = null
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
    }, [])

    const fetchTenantContracts = useCallback(async (tenantId: string) => {
        activeTenantIdRef.current = tenantId
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

    const syncUnitOccupancy = async (unitId: string, rentAmount?: number | null) => {
        const { count } = await supabase
            .from('contracts')
            .select('id', { count: 'exact', head: true })
            .eq('unit_id', unitId)
            .eq('status', 'active')

        const hasActive = (count || 0) > 0
        const unitUpdate: { status: 'occupied' | 'vacant'; default_rent_amount?: number } = {
            status: hasActive ? 'occupied' : 'vacant'
        }
        if (hasActive && rentAmount != null) {
            unitUpdate.default_rent_amount = rentAmount
        }

        await supabase
            .from('units')
            .update(unitUpdate)
            .eq('id', unitId)
    }

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

            if (data?.unit_id) {
                await syncUnitOccupancy(data.unit_id, data.status === 'active' ? data.rent_amount : null)
            }

            setContracts((prev) => [data as Contract, ...prev])
            toast.success('Contrato creado exitosamente')
            if (activeTenantIdRef.current) {
                await fetchTenantContracts(activeTenantIdRef.current)
            } else if (autoFetch) {
                await fetchContracts()
            }
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
            // Fetch existing contract to prevent changing tenant/unit when payments exist
            const { data: existingContract } = await supabase
                .from('contracts')
                .select('unit_id, tenant_id')
                .eq('id', id)
                .single()

            const isChangingTenant =
                updates.tenant_id !== undefined &&
                existingContract?.tenant_id &&
                updates.tenant_id !== existingContract.tenant_id
            const isChangingUnit =
                updates.unit_id !== undefined &&
                existingContract?.unit_id &&
                updates.unit_id !== existingContract.unit_id

            if (isChangingTenant || isChangingUnit) {
                const { count: paymentCount } = await supabase
                    .from('payments')
                    .select('id', { count: 'exact', head: true })
                    .eq('contract_id', id)

                if ((paymentCount || 0) > 0) {
                    toast.error('No se puede cambiar el inquilino o la unidad de un contrato con pagos', {
                        description: 'Para relevar un inquilino conservando el historial, finaliza este contrato y crea uno nuevo.',
                        duration: 6000,
                    })
                    throw new Error('Cannot reassign tenant or unit on contract with existing payments')
                }
            }

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

            if (data?.unit_id) {
                await syncUnitOccupancy(data.unit_id, data.status === 'active' ? data.rent_amount : null)
            }

            setContracts((prev) =>
                prev.map((c) => (c.id === id ? { ...c, ...data } : c))
            )
            toast.success('Contrato actualizado éxitosamente')
            if (activeTenantIdRef.current) {
                await fetchTenantContracts(activeTenantIdRef.current)
            } else if (autoFetch) {
                await fetchContracts()
            }
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

    const renewContract = async (previousContractId: string, newContract: ContractInsert & { file?: File | null }) => {
        let previousStatus: Contract['status'] = 'active'
        try {
            // 1. Fetch previous contract status for safe rollback if insert fails
            const { data: prevData, error: prevFetchError } = await supabase
                .from('contracts')
                .select('status')
                .eq('id', previousContractId)
                .single()

            if (prevFetchError) throw prevFetchError
            previousStatus = (prevData?.status as Contract['status']) || 'active'

            // 2. Upload new PDF/image if provided
            let fileUrl = null
            if (newContract.file) {
                const file: File = newContract.file
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('contracts')
                    .upload(filePath, file)

                if (uploadError) {
                    console.error('Error uploading renewal contract file:', uploadError)
                    toast.warning('Contrato renovado, pero falló la carga del archivo.')
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('contracts')
                        .getPublicUrl(filePath)
                    fileUrl = publicUrl
                }
            }

            // 3. Mark previous contract as terminated (preserved in history)
            const { error: terminateError } = await supabase
                .from('contracts')
                .update({ status: 'terminated' })
                .eq('id', previousContractId)

            if (terminateError) throw terminateError

            // 4. Insert the renewed contract as active
            const payload = {
                ...newContract,
                status: 'active' as const,
                file_url: fileUrl,
            }
            if ('file' in payload) {
                delete (payload as { file?: File | null }).file
            }

            const { data, error: insertError } = await supabase
                .from('contracts')
                .insert(payload)
                .select()
                .single()

            if (insertError) {
                // Rollback previous contract status if creating the renewal fails
                await supabase
                    .from('contracts')
                    .update({ status: previousStatus })
                    .eq('id', previousContractId)
                throw insertError
            }

            // 5. Sync unit status and rent amount
            if (data?.unit_id && data?.rent_amount != null) {
                await supabase
                    .from('units')
                    .update({ status: 'occupied', default_rent_amount: data.rent_amount })
                    .eq('id', data.unit_id)
            }

            toast.success('Contrato renovado exitosamente', {
                description: 'El contrato anterior quedó guardado en el historial como finalizado.'
            })

            if (activeTenantIdRef.current) {
                await fetchTenantContracts(activeTenantIdRef.current)
            } else if (autoFetch) {
                await fetchContracts()
            }

            return data
        } catch (err: unknown) {
            console.error('Error renewing contract:', err)
            const message = (err as { message?: string })?.message || 'Error al renovar el contrato'
            toast.error(message)
            throw err
        }
    }

    const deleteContract = async (id: string) => {
        try {
            // Protect historical payment records from ON DELETE CASCADE
            const { count: paymentCount, error: countError } = await supabase
                .from('payments')
                .select('id', { count: 'exact', head: true })
                .eq('contract_id', id)

            if (countError) throw countError

            if ((paymentCount || 0) > 0) {
                toast.error('No se puede eliminar este contrato', {
                    description: `Tiene ${paymentCount} pago(s) registrado(s). Finaliza el contrato en su lugar para liberar la unidad y conservar el historial.`,
                    duration: 7000,
                })
                return false
            }

            const { data: existingContract } = await supabase
                .from('contracts')
                .select('unit_id')
                .eq('id', id)
                .single()

            const { error } = await supabase
                .from('contracts')
                .delete()
                .eq('id', id)

            if (error) throw error

            if (existingContract?.unit_id) {
                await syncUnitOccupancy(existingContract.unit_id)
            }

            setContracts((prev) => prev.filter((c) => c.id !== id))
            toast.success('Contrato eliminado exitosamente')
            return true
        } catch (err: unknown) {
            console.error('Error deleting contract:', err)
            toast.error('Error al eliminar el contrato')
            throw err
        }
    }

    useEffect(() => {
        if (autoFetch) {
            fetchContracts()
        }
    }, [fetchContracts, autoFetch])

    return {
        contracts,
        isLoading,
        error,
        fetchContracts,
        fetchTenantContracts,
        createContract,
        updateContract,
        renewContract,
        deleteContract,
    }
}
