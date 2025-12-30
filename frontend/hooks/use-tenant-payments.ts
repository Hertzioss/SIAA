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

    const registerPayment = useCallback(async (data: PaymentInsert) => {
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
    }, [])

    const fetchPaymentHistory = useCallback(async (tenantId?: string, page: number = 1, pageSize: number = 5) => {
        setIsLoading(true)
        try {
            let query = supabase
                .from('payments')
                .select('*, tenants(name, doc_id), contracts(units(name, properties(name, property_owners(owners(name, doc_id)))))', { count: 'exact' })
                .order('date', { ascending: false })

            if (tenantId) {
                query = query.eq('tenant_id', tenantId)
            }

            // Pagination
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            query = query.range(from, to)

            const { data, count, error } = await query
            if (error) throw error

            setHistory(data || [])
            return {
                data,
                count: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize)
            }
        } catch (err: any) {
            console.error('Error fetching history:', err)
            return { data: [], count: 0, totalPages: 0 }
        } finally {
            setIsLoading(false)
        }
    }, [])

    const getNextPaymentDate = useCallback(async (tenantId: string) => {
        try {
            // 1. Get active contract
            const { data: contract } = await supabase
                .from('contracts')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('status', 'active')
                .single()

            if (!contract) return null

            // 2. Get last approved payment date to calculate next
            // We assume payments cover sequential months or we find the "latest covered period"
            // For MVP: Find the latest payment date and add 1 month
            const { data: lastPayment } = await supabase
                .from('payments')
                .select('date')
                .eq('contract_id', contract.id)
                .in('status', ['approved', 'paid'])
                .order('date', { ascending: false })
                .limit(1)
                .single()

            let nextDate = new Date(contract.start_date)
            // If we have payments, next date is month after last payment? 
            // Or should we calculate "paid until"? 
            // Simple logic: If last payment was for "March", next is "April".
            // We can infer this from payment.date roughly.

            if (lastPayment) {
                const lastDate = new Date(lastPayment.date)
                nextDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, new Date(contract.start_date).getDate())
            } else {
                // If no payments, next is start date or current month if start date passed?
                // Let's stick to start date logic if it's in future, or "catch up" logic?
                // Default: Next due is just contract start
            }

            return nextDate
        } catch (err) {
            console.error('Error getting next date:', err)
            return null
        }
    }, [])

    const getMonthlyBalance = useCallback(async (tenantId: string, month?: number, year?: number) => {
        try {
            // 1. Get active contract
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('status', 'active')
                .single()

            if (contractError || !contract) return null

            const rent = contract.rent_amount

            // 2. Get payments for target month (or current)
            const targetDate = new Date()
            if (month) targetDate.setMonth(month - 1) // 0-indexed
            if (year) targetDate.setFullYear(year)

            const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString().split('T')[0]
            // Safe month addition
            const endOfMonthDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1)
            const endOfMonth = endOfMonthDate.toISOString().split('T')[0]

            const { data: payments, error: paymentsError } = await supabase
                .from('payments')
                .select('amount, exchange_rate, currency, status')
                .eq('contract_id', contract.id)
                .gte('date', startOfMonth)
                .lt('date', endOfMonth)
                .in('status', ['approved', 'paid', 'pending']) // Include pending

            if (paymentsError) throw paymentsError

            // 3. Sum payments (Normalizing to USD)
            let paid = 0
            let pending = 0

            payments?.forEach(p => {
                let amountUSD = 0
                if (p.currency === 'USD') {
                    amountUSD = p.amount
                } else if (p.currency === 'VES' && p.exchange_rate) {
                    amountUSD = (p.amount / p.exchange_rate)
                }

                if (p.status === 'pending') {
                    pending += amountUSD
                } else {
                    paid += amountUSD
                }
            })

            const totalCovered = paid + pending

            return {
                rentAmount: rent,
                paidAmount: paid,
                pendingPayments: pending,
                totalCovered: totalCovered,
                remainingDebt: Math.max(0, rent - totalCovered),
                isPartial: totalCovered > 0 && totalCovered < rent,
                isCompete: totalCovered >= rent
            }
        } catch (err) {
            console.error('Error fetching balance:', err)
            return null
        }
    }, [])

    const getPaidMonths = useCallback(async (tenantId: string) => {
        try {
            const { data: contract } = await supabase
                .from('contracts')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('status', 'active')
                .single()

            if (!contract) return 0

            const { data: payments } = await supabase
                .from('payments')
                .select('amount, exchange_rate, currency')
                .eq('contract_id', contract.id)
                .in('status', ['approved', 'paid'])

            let totalPaid = 0
            payments?.forEach(p => {
                if (p.currency === 'USD') {
                    totalPaid += p.amount
                } else if (p.currency === 'VES' && p.exchange_rate) {
                    totalPaid += (p.amount / p.exchange_rate)
                }
            })

            // Calculate full months paid (floor)
            // We use a small epsilon for float precision if needed, but floor is safer for "fully paid"
            return Math.floor(totalPaid / contract.rent_amount)
        } catch (err) {
            console.error('Error getting paid months:', err)
            return 0
        }
    }, [])

    return {
        isLoading,
        history,
        registerPayment,
        fetchPaymentHistory,
        getMonthlyBalance,
        getNextPaymentDate,
        getPaidMonths
    }
}
