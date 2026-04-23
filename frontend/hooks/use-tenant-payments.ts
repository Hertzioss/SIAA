import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { useSystemConfig } from '@/hooks/use-system-config'

import { PaymentInsert, PaymentWithDetails, MonthlyBalance } from '@/types/payment'

export type { PaymentInsert, PaymentWithDetails, MonthlyBalance }

export function useTenantPayments() {
    const { config } = useSystemConfig()
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState<PaymentWithDetails[]>([])

    const registerPayment = useCallback(async (data: PaymentInsert | PaymentInsert[]) => {
        setIsLoading(true)
        try {
            const payments = Array.isArray(data) ? data : [data]
            if (payments.length === 0) return false

            let proof_url = null
            const firstPayment = payments[0]

            // 1. Upload Proof if exists (only once, using the first file found)
            if (firstPayment.proof_file) {
                const fileExt = firstPayment.proof_file.name.split('.').pop()
                const fileName = `${uuidv4()}.${fileExt}`
                const filePath = `proofs/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('payment-proofs')
                    .upload(filePath, firstPayment.proof_file)

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    toast.error('Error al subir el comprobante')
                    throw uploadError
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('payment-proofs')
                    .getPublicUrl(filePath)

                proof_url = publicUrl
            }

            // 2. Insert Payment Records
            const insertPromises = payments.map(p =>
                supabase
                    .from('payments')
                    .insert({
                        contract_id: p.contract_id,
                        tenant_id: p.tenant_id,
                        date: p.date,
                        amount: p.amount,
                        currency: p.currency,
                        exchange_rate: p.exchange_rate,
                        concept: p.concept,
                        payment_method: p.payment_method,
                        reference_number: p.reference_number,
                        notes: p.notes,
                        proof_url: proof_url, // Shared URL
                        status: p.status || 'pending',
                        owner_bank_account_id: p.owner_bank_account_id,
                        metadata: p.metadata,
                        billing_period: p.billing_period,
                        registration_source: p.registration_source || 'tenant'
                    })
                    .select('id')
            )

            const results = await Promise.all(insertPromises)
            const errors = results.filter(r => r.error)

            if (errors.length > 0) {
                console.error('Errors inserting payments:', JSON.stringify(errors, null, 2))
                throw errors[0].error
            }

            // 3. Send Emails if requested
            // We reuse the update-status API for this since it encapsulates the email logic.
            // We only do this if status is approved and sendEmail is true.
            const successfulPayments = results.map(r => r.data?.[0]).filter((p): p is { id: string } => !!p)

            if (payments[0]?.sendEmail && payments[0]?.status === 'approved') {
                await Promise.all(successfulPayments.map(async (payment) => {
                    if (!payment?.id) return
                    try {
                        let pdfBase64 = undefined;

                        // Fetch full payment details to generate PDF
                        const { data: fullPayment } = await supabase
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
                            .eq('id', payment.id)
                            .single();
                            
                        if (fullPayment) {
                            const contractData = Array.isArray(fullPayment.contracts) ? fullPayment.contracts[0] : fullPayment.contracts;
                            const unitData = Array.isArray(contractData?.units) ? contractData?.units[0] : contractData?.units;
                            const propertyData = Array.isArray(unitData?.properties) ? unitData?.properties[0] : unitData?.properties;
                            
                            let ownersList: any[] = [];
                            let ownerLogo: string | null = null;
                            const propertyOwners = propertyData?.property_owners;
                            if (Array.isArray(propertyOwners)) {
                                ownersList = propertyOwners.map((po: any) => {
                                    const logo = po.owners?.logo_url;
                                    if (logo && !ownerLogo) ownerLogo = logo;
                                    return {
                                        name: po.owners?.name,
                                        docId: po.owners?.doc_id
                                    };
                                }).filter((o: any) => o.name);
                            }

                            const finalLogo = ownerLogo || config?.logo_url || null;

                            const tenantData = Array.isArray(fullPayment.tenants) ? fullPayment.tenants[0] : fullPayment.tenants;

                            const pdfData = {
                                payment: {
                                    date: fullPayment.date,
                                    amount: fullPayment.amount,
                                    id: fullPayment.id,
                                    concept: (fullPayment.concept || 'PAGO').replace(/Renta/gi, 'Canon'),
                                    status: 'approved',
                                    reference: fullPayment.reference_number || undefined,
                                    rate: fullPayment.exchange_rate || undefined,
                                    currency: fullPayment.currency || undefined
                                },
                                tenant: {
                                    name: tenantData?.name || 'Inquilino',
                                    docId: tenantData?.doc_id || '',
                                    property: `${propertyData?.name || ''} - ${unitData?.name || ''}`.trim() || 'Inmueble',
                                    propertyType: unitData?.type
                                },
                                company: {
                                    name: config?.name || 'Escritorio Legal',
                                    rif: config?.rif,
                                    phone: config?.phone,
                                    email: config?.email
                                },
                                owners: ownersList.length > 0 ? ownersList : undefined,
                                logoSrc: finalLogo,
                                timezone: config?.timezone
                            };

                            const { generatePaymentReceiptPDF } = await import('@/lib/payment-pdf-generator');
                            pdfBase64 = await generatePaymentReceiptPDF(pdfData);
                        }

                        await fetch('/api/payments/update-status', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: payment.id,
                                status: 'approved',
                                notes: payments[0].notes,
                                sendEmail: true,
                                pdfBase64
                            })
                        })
                    } catch (e) {
                        console.error("Failed to trigger email for payment", payment.id, e)
                    }
                }))
            }

            toast.success('Pago(s) registrado(s) exitosamente')
            return true

        } catch (error) {
            console.error('Error registering payment:', error)
            const message = error instanceof Error ? error.message : 'Unknown error'
            toast.error('Error al registrar el pago: ' + message)
            return false
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchPaymentHistory = useCallback(async (tenantId?: string, page: number = 1, pageSize: number = 50) => {
        setIsLoading(true)
        try {
            let contractIds: string[] = []
            if (tenantId) {
                const { data: contracts } = await supabase.from('contracts').select('id').eq('tenant_id', tenantId)
                if (contracts) contractIds = contracts.map(c => c.id)
            }

            // We will fetch payments in two safe queries to avoid any PostgREST OR/IN syntax bugs
            let allPayments: any[] = []

            // Query 1: Payments explicitly linked to the tenant
            if (tenantId) {
                const { data: tenantPayments, error: err1 } = await supabase
                    .from('payments')
                    .select('*, tenants(name, doc_id), contracts(id)')
                    .eq('tenant_id', tenantId)
                    .order('date', { ascending: false })
                    .order('created_at', { ascending: false })
                
                if (err1) throw err1
                if (tenantPayments) allPayments = [...tenantPayments]
            }

            // Query 2: Payments linked to their contracts (where tenant_id might be missing or different)
            if (contractIds.length > 0) {
                // Fetch in smaller chunks if there are many contracts, but usually it's 1-3
                const { data: contractPayments, error: err2 } = await supabase
                    .from('payments')
                    .select('*, tenants(name, doc_id), contracts(id)')
                    .in('contract_id', contractIds)
                    .order('date', { ascending: false })
                    .order('created_at', { ascending: false })
                
                if (err2) throw err2

                // Add only if they aren't already in the list
                if (contractPayments) {
                    const existingIds = new Set(allPayments.map(p => p.id))
                    const newPayments = contractPayments.filter(p => !existingIds.has(p.id))
                    allPayments = [...allPayments, ...newPayments]
                }
            }

            // Sort merged array
            allPayments.sort((a, b) => {
                const dateA = new Date(a.date).getTime()
                const dateB = new Date(b.date).getTime()
                if (dateA !== dateB) return dateB - dateA
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })

            const count = allPayments.length

            // Pagination in memory
            const from = (page - 1) * pageSize
            const to = from + pageSize
            const paginatedData = allPayments.slice(from, to)

            const formattedData = paginatedData.map(p => {
                const metadata = p.metadata as Record<string, any> | null;
                const tenantFromMetadata = metadata?.tenant_name ? {
                    name: metadata.tenant_name as string,
                    doc_id: (metadata.tenant_doc_id as string) || "",
                    email: (Array.isArray(p.tenants) ? p.tenants[0]?.email : p.tenants?.email) || undefined
                } : null;

                return {
                    ...p,
                    tenants: tenantFromMetadata || (Array.isArray(p.tenants) ? p.tenants[0] : p.tenants) || undefined,
                    // For consistency with Payment interface if needed elsewhere
                    tenant: tenantFromMetadata || (Array.isArray(p.tenants) ? p.tenants[0] : p.tenants) || undefined
                };
            });

            setHistory(formattedData || [])
            return {
                data: formattedData,
                count: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize)
            }
        } catch (err: any) {
            console.error('Error fetching history detailed:', err.message || err.details || err, JSON.stringify(err))
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

    const getMonthlyBalance = useCallback(async (tenantId: string, month?: number, year?: number): Promise<MonthlyBalance | null> => {
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

            // 2. Format Target Billing Period
            const targetDate = new Date()
            if (month) targetDate.setMonth(month - 1) // 0-indexed
            if (year) targetDate.setFullYear(year)
            
            const billingPeriod = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-01`

            // Date fallback range
            const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString().split('T')[0]
            const endOfMonthDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1)
            const endOfMonth = endOfMonthDate.toISOString().split('T')[0]

            // 3. Fetch potentially relevant payments
            // We fetch payments that match the billing period OR are in the date range (for fallback)
            // To be safe and simple given Supabase OR syntax limitations with filters, we can fetch by contract
            // and filter in memory. Assuming < 1000 payments per contract.
            const { data: payments, error: paymentsError } = await supabase
                .from('payments')
                .select('amount, exchange_rate, currency, status, billing_period, date')
                .eq('contract_id', contract.id)
                .in('status', ['approved', 'paid', 'pending']) 

            if (paymentsError) throw paymentsError

            // 4. Calculate Totals
            let paid = 0
            let pending = 0

            payments?.forEach(p => {
                // Determine if this payment belongs to the target month
                let isMatch = false
                if (p.billing_period) {
                    isMatch = p.billing_period === billingPeriod
                } else {
                    // Fallback to Date
                    isMatch = p.date >= startOfMonth && p.date < endOfMonth
                }

                if (!isMatch) return

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
                isPartial: totalCovered > 0 && totalCovered < rent - 0.01,
                isCompete: totalCovered >= rent - 0.01 
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

    /**
     * Calculates how a total payment amount splits across multiple months based on rent.
     */
    const calculatePaymentDistribution = useCallback((totalAmount: number, startMonth: number, startYear: number, rentAmount: number) => {
        if (totalAmount <= 0 || rentAmount <= 0) return []

        const distribution: { month: number, year: number, amount: number, isFull: boolean }[] = []
        let remaining = totalAmount
        let currentMonth = startMonth // 1-indexed (1 = Jan)
        let currentYear = startYear

        while (remaining > 0.01) {
            // How much does this month "need" to be full? 
            // In a more complex system, we'd check if this specific month already has partial payments.
            // For MVP, we assume we are paying "forward" into empty slots or filling the "current" slot.
            // If the user selects "January", we assume they want to pay Jan, then Feb, etc.
            
            const allocatable = Math.min(remaining, rentAmount)
            
            distribution.push({
                month: currentMonth,
                year: currentYear,
                amount: parseFloat(allocatable.toFixed(2)),
                isFull: allocatable >= (rentAmount - 0.01)
            })

            remaining -= allocatable
            
            // Move to next month
            currentMonth++
            if (currentMonth > 12) {
                currentMonth = 1
                currentYear++
            }
        }

        return distribution
    }, [])

    return {
        isLoading,
        history,
        registerPayment,
        fetchPaymentHistory,
        getMonthlyBalance,
        getNextPaymentDate,
        getPaidMonths,
        calculatePaymentDistribution
    }
}
