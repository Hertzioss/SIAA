import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

export interface PaymentInsert {
    contract_id: string
    tenant_id: string
    date: string
    amount: number
    currency: 'USD' | 'VES'
    exchange_rate?: number
    concept: string
    payment_method: string
    reference_number: string
    notes?: string
    proof_file?: File
    owner_bank_account_id?: string
}

export function useTenantPayments() {
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState<any[]>([])

    const registerPayment = async (data: PaymentInsert) => {
        setIsLoading(true)
        try {
            let proof_url = null

            // 1. Upload Proof if exists
            if (data.proof_file) {
                const fileExt = data.proof_file.name.split('.').pop()
                const fileName = `${uuidv4()}.${fileExt}`
                const filePath = `proofs/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('payment-proofs')
                    .upload(filePath, data.proof_file)

                if (uploadError) {
                    // Start buckets don't exist by default, warn user but continue? 
                    // ideally we should handle bucket creation orassume it exists.
                    // For now, let's log and throw/show error
                    console.error('Upload error:', uploadError)
                    toast.error('Error al subir el comprobante')
                    // Proceeding without file URL or returning? Let's stop to ensure data integrity perception
                    throw uploadError
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('payment-proofs')
                    .getPublicUrl(filePath)

                proof_url = publicUrl
            }

            // 2. Insert Payment Record
            const { error: insertError } = await supabase
                .from('payments')
                .insert({
                    contract_id: data.contract_id,
                    tenant_id: data.tenant_id,
                    date: data.date,
                    amount: data.amount,
                    currency: data.currency,
                    exchange_rate: data.exchange_rate,
                    concept: data.concept,
                    payment_method: data.payment_method,
                    reference_number: data.reference_number,
                    notes: data.notes,
                    proof_url: proof_url,
                    status: 'pending', // Default status
                    owner_bank_account_id: data.owner_bank_account_id
                })

            if (insertError) throw insertError

            toast.success('Pago registrado exitosamente')
            return true

        } catch (error: any) {
            console.error('Error registering payment:', error)
            toast.error('Error al registrar el pago: ' + error.message)
            return false
        } finally {
            setIsLoading(false)
        }
    }

    const fetchPaymentHistory = useCallback(async (tenantId?: string) => {
        // If no tenantId provided, maybe try to fetch for "current user" logic later
        // For now, we expect tenantId to be passed (e.g. from a selector or derived context)
        // In the "Tenant View" we might default to fetching all for now if we don't have auth context

        // MVP: Fetch all payments ordered by date
        setIsLoading(true)
        try {
            let query = supabase
                .from('payments')
                .select('*')
                .order('date', { ascending: false })

            if (tenantId) {
                query = query.eq('tenant_id', tenantId)
            }

            const { data, error } = await query
            if (error) throw error

            setHistory(data || [])
        } catch (err: any) {
            console.error('Error fetching history:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    return {
        isLoading,
        history,
        registerPayment,
        fetchPaymentHistory
    }
}
