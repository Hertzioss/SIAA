import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Tenant } from '@/types/tenant'
import { toast } from 'sonner'

export function useCurrentTenant() {
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCurrentTenant = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            // 1. Get authenticated user
            const { data: { user }, error: authError } = await supabase.auth.getUser()

            if (authError) throw authError
            if (!user) {
                // Not logged in or session expired
                setLoading(false)
                return
            }

            // 2. Fetch tenant linked to this user
            const { data: tenant, error: fetchError } = await supabase
                .from('tenants')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (fetchError) {
                // If code is PGRST116, it means no rows returned => User is not a tenant or not linked
                if (fetchError.code === 'PGRST116') {
                    // Not found - silent fail or handle as null
                    console.warn('User is authenticated but has no linked Tenant record.')
                } else {
                    throw fetchError
                }
            }

            if (tenant) {
                setCurrentTenant(tenant as Tenant)
            }

        } catch (err: any) {
            console.error('Error fetching current tenant:', err)
            setError(err.message)
            // Optional: don't toast here to avoid spamming if used in many places, 
            // but for payment form it's useful to know why it failed.
            // toast.error('No se pudo identificar la cuenta de inquilino asociada.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCurrentTenant()
    }, [fetchCurrentTenant])

    return {
        currentTenant,
        loading,
        error,
        refreshTenant: fetchCurrentTenant
    }
}
