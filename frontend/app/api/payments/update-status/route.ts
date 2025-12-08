import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/mail'
import { generateEmailHtml } from '@/lib/email-templates'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id, status, notes, sendEmail: shouldSendEmail } = body

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields: id, status' },
                { status: 400 }
            )
        }

        // 1. Update Payment Status in DB
        const { data: payment, error: updateError } = await supabaseAdmin
            .from('payments')
            .update({ status, notes })
            .eq('id', id)
            .select('*, contract:contracts(tenant:tenants(email, name))')
            .single()

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to update payment', details: updateError.message },
                { status: 500 }
            )
        }

        // 2. Send Email if requested
        if (shouldSendEmail && payment?.contract?.tenant?.email) {
            const tenant = payment.contract.tenant
            const subject = status === 'approved'
                ? 'Pago Aprobado - Escritorio Legal'
                : 'Problema con su Pago - Escritorio Legal'

            const message = status === 'approved'
                ? `Su pago por $${payment.amount} ha sido validado y aprobado exitosamente.\n\nNota: ${notes || 'Gracias por su pago.'}`
                : `Su pago por $${payment.amount} ha sido marcado como RECHAZADO.\n\nMotivo: ${notes || 'Por favor contacte a administración.'}`

            const html = generateEmailHtml(subject, message, tenant.name)

            try {
                await sendEmail({
                    to: tenant.email,
                    subject,
                    html
                })
            } catch (emailError) {
                console.error("Error sending payment notification:", emailError)
                // We don't fail the request if email fails, just log it
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('API Error updating payment:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
