'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO, isValid } from 'date-fns'
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
    totalPaidBs: number
    pendingMonths: { month: string, year: number, amount: number }[]
    totalDebt: number
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
                date: p.date && isValid(parseISO(p.date)) ? format(parseISO(p.date), 'dd/MM/yyyy') : p.date,
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
            const totalPaidBs = statementPayments.reduce((acc, p) => acc + (p.amount * (p.exchangeRate || 0)), 0)
            
            // 5. Calculate pending months
            const pendingMonths: { month: string, year: number, amount: number }[] = []
            let totalDebt = 0
            
            if (contract && contract.start_date) {
                const startDate = parseISO(contract.start_date)
                const now = new Date()
                
                // Fetch ALL payments for this contract (not just in range) to know total paid months
                const { data: allPayments } = await supabase
                    .from('payments')
                    .select('id')
                    .eq('contract_id', contract.id)
                    .in('status', ['approved', 'paid'])
                
                const totalPaidMonths = allPayments?.length || 0
                
                // Calculate months passed between startDate and endRange
                // We use the report's start/end dates
                const reportStart = filters.startDate
                const reportEnd = filters.endDate
                
                const monthsInReportRange = (reportEnd.getFullYear() - reportStart.getFullYear()) * 12 + (reportEnd.getMonth() - reportStart.getMonth()) + 1
                
                // For each month in the report range, check if it was paid
                // This is a naive but effective way: 
                // We know totalPaidMonths from start of contract.
                // We need to know if a specific month in the report range is "covered" by those total payments.
                const monthsNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
                
                for (let i = 0; i < monthsInReportRange; i++) {
                    const currentMonthDate = new Date(reportStart.getFullYear(), reportStart.getMonth() + i, 1)
                    
                    // Months elapsed from contract start to this specific month in report
                    const elapsedSinceStart = (currentMonthDate.getFullYear() - startDate.getFullYear()) * 12 + (currentMonthDate.getMonth() - startDate.getMonth()) + 1
                    
                    if (elapsedSinceStart > totalPaidMonths) {
                        pendingMonths.push({
                            month: monthsNames[currentMonthDate.getMonth()],
                            year: currentMonthDate.getFullYear(),
                            amount: contract.rent_amount || 0
                        })
                    }
                }
                totalDebt = pendingMonths.reduce((sum, m) => sum + m.amount, 0)
            }

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
                totalPaidBs: parseFloat(totalPaidBs.toFixed(2)),
                pendingMonths,
                totalDebt,
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
                    <td style="padding: 8px; font-size: 13px; max-width: 200px; word-break: break-word; line-height: 1.2;">${p.concept}</td>
                    <td style="padding: 8px; font-size: 13px;">${p.method}</td>
                    <td style="padding: 8px; font-size: 13px;">${p.reference}</td>
                    <td style="padding: 8px; font-size: 13px; text-align: right; font-weight: bold;">
                        ${p.currency === 'VES' ? 'Bs' : '$'} 
                        ${Number(p.amountOriginal || p.amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </td>
                    <td style="padding: 8px; font-size: 13px; text-align: right; color: #6b7280; font-style: italic;">${p.exchangeRate ? p.exchangeRate.toFixed(2) : '-'}</td>
                    <td style="padding: 8px; font-size: 13px; text-align: right;">${p.exchangeRate && p.exchangeRate > 0 ? `Bs. ${(p.amount * p.exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '-'}</td>
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
                                <th style="padding: 8px; text-align: left; font-size: 12px; width: 200px;">CONCEPTO</th>
                                <th style="padding: 8px; text-align: left; font-size: 12px;">MÉTODO</th>
                                <th style="padding: 8px; text-align: left; font-size: 12px;">REFERENCIA</th>
                                <th style="padding: 8px; text-align: right; font-size: 12px;">MONTO ORIG.</th>
                                <th style="padding: 8px; text-align: right; font-size: 12px; color: #9ca3af;">TASA</th>
                                <th style="padding: 8px; text-align: right; font-size: 12px;">MONTO (Bs)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                        <tfoot style="background: #f9fafb; font-weight: bold;">
                            <tr>
                                <td colspan="6" style="padding: 8px; font-size: 13px;">TOTAL PAGADO</td>
                                <td style="padding: 8px; text-align: right; font-size: 13px;">$${data.totalPaid.toFixed(2)} / Bs. ${data.totalPaidBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
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
