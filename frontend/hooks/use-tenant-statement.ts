'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'

export interface StatementPayment {
    date: string
    concept: string
    property: string
    unit: string
    amount: number
    method: string
    reference: string
    currency: string
    exchangeRate: number | null
    amountOriginal: number
    billingPeriod: string | null
    status: string
}

export interface TenantStatementData {
    tenantId: string
    tenantName: string
    tenantDocId: string
    tenantEmail: string | null
    tenantPhone: string | null
    contractInfo: {
        unitName: string
        propertyName: string
        rentAmount: number
        startDate: string
    } | null
    payments: StatementPayment[]
    totalPaid: number
    period: string
}

export function useTenantStatement() {
    const [loading, setLoading] = useState(false)
    const [statementData, setStatementData] = useState<TenantStatementData | null>(null)
    const [filters, setFilters] = useState({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
        tenantId: ''
    })

    const generateStatement = useCallback(async () => {
        if (!filters.tenantId) {
            toast.error('Seleccione un inquilino')
            return null
        }
        setLoading(true)
        try {
            const startStr = format(filters.startDate, 'yyyy-MM-dd')
            const endStr = format(filters.endDate, 'yyyy-MM-dd')

            // 1. Fetch tenant info
            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .select('id, name, doc_id, email, phone')
                .eq('id', filters.tenantId)
                .single()

            if (tenantError || !tenant) throw tenantError || new Error('Inquilino no encontrado')

            // 2. Fetch active contract with unit & property
            const { data: contracts } = await supabase
                .from('contracts')
                .select('id, rent_amount, start_date, units(name, properties(name))')
                .eq('tenant_id', filters.tenantId)
                .eq('status', 'active')

            const contract = contracts?.[0]
            const contractInfo = contract ? {
                unitName: (contract.units as any)?.name || 'N/A',
                propertyName: (contract.units as any)?.properties?.name || 'N/A',
                rentAmount: contract.rent_amount || 0,
                startDate: contract.start_date
            } : null

            // 3. Fetch all payments in range (approved or paid)
            const { data: payments, error: payError } = await supabase
                .from('payments')
                .select('id, date, amount, currency, exchange_rate, concept, payment_method, reference_number, billing_period, status, contracts(units(name, properties(name)))')
                .eq('tenant_id', filters.tenantId)
                .in('status', ['approved', 'paid'])
                .gte('date', startStr)
                .lte('date', endStr)
                .order('date', { ascending: true })

            if (payError) throw payError

            // 4. Build payment list
            const statementPayments: StatementPayment[] = (payments || []).map((p: any) => ({
                date: p.date,
                concept: p.concept || 'Pago de alquiler',
                property: p.contracts?.units?.properties?.name || contractInfo?.propertyName || '',
                unit: p.contracts?.units?.name || contractInfo?.unitName || '',
                amount: p.currency === 'USD' ? p.amount : (p.exchange_rate ? p.amount / p.exchange_rate : p.amount),
                method: p.payment_method || '-',
                reference: p.reference_number || '-',
                currency: p.currency || 'USD',
                exchangeRate: p.exchange_rate,
                amountOriginal: p.amount,
                billingPeriod: p.billing_period,
                status: p.status
            }))

            const totalPaid = statementPayments.reduce((acc, p) => acc + p.amount, 0)
            const periodStr = `${format(filters.startDate, 'dd/MM/yyyy')} - ${format(filters.endDate, 'dd/MM/yyyy')}`

            const result: TenantStatementData = {
                tenantId: tenant.id,
                tenantName: tenant.name,
                tenantDocId: tenant.doc_id,
                tenantEmail: tenant.email,
                tenantPhone: tenant.phone,
                contractInfo,
                payments: statementPayments,
                totalPaid: parseFloat(totalPaid.toFixed(2)),
                period: periodStr
            }

            setStatementData(result)
            return result
        } catch (err: any) {
            console.error('Error generating statement:', err)
            toast.error('Error al generar el estado de cuenta')
            return null
        } finally {
            setLoading(false)
        }
    }, [filters])

    const sendStatementEmail = useCallback(async (data: TenantStatementData) => {
        if (!data.tenantEmail) {
            toast.error('El inquilino no tiene correo electrónico registrado')
            return false
        }

        try {
            const rowsHtml = data.payments.map(p => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px; font-size: 13px;">${p.date}</td>
                    <td style="padding: 8px; font-size: 13px;">${p.concept}</td>
                    <td style="padding: 8px; font-size: 13px;">${p.method}</td>
                    <td style="padding: 8px; font-size: 13px;">${p.reference}</td>
                    <td style="padding: 8px; font-size: 13px; text-align: right;">$${p.amount.toFixed(2)}</td>
                    ${p.currency === 'VES' ? `<td style="padding: 8px; font-size: 13px; text-align: right;">Bs ${p.amountOriginal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>` : `<td style="padding: 8px; font-size: 13px; text-align: right;">-</td>`}
                </tr>
            `).join('')

            const statementHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
                    <h2 style="text-align: center; color: #1f2937;">Estado de Cuenta</h2>
                    <p style="text-align: center; color: #6b7280; font-size: 14px;">Período: ${data.period}</p>
                    
                    <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 16px 0;">
                        <p style="margin: 4px 0; font-size: 14px;"><strong>Inquilino:</strong> ${data.tenantName}</p>
                        <p style="margin: 4px 0; font-size: 14px;"><strong>Cédula/RIF:</strong> ${data.tenantDocId}</p>
                        ${data.contractInfo ? `
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Propiedad:</strong> ${data.contractInfo.propertyName}</p>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Unidad:</strong> ${data.contractInfo.unitName}</p>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Canon:</strong> $${data.contractInfo.rentAmount.toFixed(2)}</p>
                        ` : ''}
                    </div>

                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db;">
                        <thead>
                            <tr style="background: #1f2937; color: white;">
                                <th style="padding: 8px; text-align: left; font-size: 12px;">FECHA</th>
                                <th style="padding: 8px; text-align: left; font-size: 12px;">CONCEPTO</th>
                                <th style="padding: 8px; text-align: left; font-size: 12px;">MÉTODO</th>
                                <th style="padding: 8px; text-align: left; font-size: 12px;">REFERENCIA</th>
                                <th style="padding: 8px; text-align: right; font-size: 12px;">MONTO ($)</th>
                                <th style="padding: 8px; text-align: right; font-size: 12px;">MONTO (Bs)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f9fafb; font-weight: bold;">
                                <td colspan="4" style="padding: 8px; font-size: 13px;">TOTAL PAGADO</td>
                                <td style="padding: 8px; text-align: right; font-size: 13px;">$${data.totalPaid.toFixed(2)}</td>
                                <td style="padding: 8px;"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `

            const response = await fetch('/api/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: [{ email: data.tenantEmail, name: data.tenantName }],
                    subject: `Estado de Cuenta - ${data.period}`,
                    message: statementHtml
                })
            })

            if (!response.ok) throw new Error('Error al enviar correo')

            toast.success(`Estado de cuenta enviado a ${data.tenantEmail}`)
            return true
        } catch (err: any) {
            console.error('Error sending statement:', err)
            toast.error('Error al enviar el estado de cuenta por correo')
            return false
        }
    }, [])

    return {
        loading,
        statementData,
        filters,
        setFilters,
        generateStatement,
        sendStatementEmail
    }
}
