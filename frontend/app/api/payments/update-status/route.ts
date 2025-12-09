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

        // Debug Log
        console.log(`Updating payment ${id} to status: ${status}. Current valid statuses should be: pending, approved, rejected.`);

        // 1. Update Payment Status in DB
        const { data: payment, error: updateError } = await supabaseAdmin
            .from('payments')
            .update({ status, notes })
            .eq('id', id)
            .select('*, tenant:tenants(email, name)')
            .single()

        if (updateError) {
            console.error('Supabase Update Error:', JSON.stringify(updateError));
            return NextResponse.json(
                { error: 'Failed to update payment', details: updateError.message, code: updateError.code, hint: updateError.hint },
                { status: 500 }
            )
        }

        // 2. Send Email if requested
        if (shouldSendEmail) {
            if (payment?.tenant?.email) {
                const tenant = payment.tenant
                const subject = status === 'approved'
                    ? 'Recibo de Pago - Escritorio Legal'
                    : 'Problema con su Pago - Escritorio Legal'

                let message = ""
                if (status === 'approved') {
                    message = `
RECIBO DE PAGO

Estimado(a) ${tenant.name},

Su pago ha sido VALIDADO y APROBADO exitosamente.

Detalles de la Transacción:
------------------------------------------------
Fecha: ${payment.date}
Monto: $${payment.amount} ${payment.currency}
Concepto: ${payment.concept}
Referencia: ${payment.reference_number || 'N/A'}
Notas: ${notes || 'Gracias por su pago.'}
------------------------------------------------

Puede descargar su recibo formal en PDF ingresando a su portal de inquilino:
${process.env.NEXT_PUBLIC_APP_URL || 'https://escritorio.legal'}

Atentamente,
Administración
`
                } else {
                    message = `
NOTIFICACIÓN DE PAGO RECHAZADO

Estimado(a) ${tenant.name},

Su pago por $${payment.amount} ha sido marcado como RECHAZADO.

Motivo: ${notes || 'Por favor contacte a administración para más detalles.'}

Por favor ingrese al portal para corregir o reenviar su comprobante.
`
                }

                // Use simple text-to-html for now or keep utilizing generateEmailHtml but with pre-formatted text
                const html = generateEmailHtml(subject, message.replace(/\n/g, '<br/>'), tenant.name)

                try {
                    console.log(`Attempting to send email to ${tenant.email} via nodemailer...`)
                    await sendEmail({
                        to: tenant.email,
                        subject,
                        html
                    })
                    console.log(`Email sent successfully to ${tenant.email}`)
                } catch (emailError: any) {
                    console.error("Error sending payment notification:", emailError)
                    console.error("Stack:", emailError.stack)
                }
            } else {
                console.warn(`Skipping email: Payment ${id} updated, but tenant email is missing or join failed. Payment data:`, JSON.stringify(payment))
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
