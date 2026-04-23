import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/mail'
import { generateEmailHtml } from '@/lib/email-templates'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id, pdfBase64 } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Missing required field: id' },
                { status: 400 }
            )
        }

        // 1. Fetch Payment from DB
        const { data: payment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('*, tenant:tenants(email, name)')
            .eq('id', id)
            .single()

        if (fetchError || !payment) {
            console.error('Supabase Fetch Error:', JSON.stringify(fetchError));
            return NextResponse.json(
                { error: 'Failed to fetch payment', details: fetchError?.message },
                { status: 500 }
            )
        }

        // 2. Send Email
        if (payment?.tenant?.email) {
            const tenant = payment.tenant
            const subject = 'Recibo de Pago - Escritorio Legal'

            const message = `
RECIBO DE PAGO

Estimado(a) ${tenant.name},

Adjunto a este correo encontrará su recibo de pago formalizado en PDF, el cual ha sido VALIDADO y APROBADO exitosamente.

Detalles de la Transacción:
------------------------------------------------
Fecha: ${payment.date}
Monto: ${payment.currency === 'VES' ? 'Bs. ' : '$'}${payment.amount}
Concepto: ${payment.concept}
Referencia: ${payment.reference_number || 'N/A'}
Notas: ${payment.notes || 'Gracias por su pago.'}
------------------------------------------------

Puede descargar su recibo en cualquier momento ingresando a su portal de inquilino:
${process.env.NEXT_PUBLIC_APP_URL || 'https://escritorio.legal'}

Atentamente,
Administración
`

            const html = generateEmailHtml(subject, message.replace(/\n/g, '<br/>'), tenant.name)

            // Prepare Attachment if base64 provided
            const attachments = []
            if (pdfBase64) {
                // Remove the data URI part if present
                const base64Data = pdfBase64.replace(/^data:application\/pdf;filename=generated\.pdf;base64,/, '').replace(/^data:application\/pdf;base64,/, '')
                attachments.push({
                    filename: `Recibo_${tenant.name.replace(/\s+/g, '_')}_${payment.date}.pdf`,
                    content: base64Data,
                    encoding: 'base64',
                    contentType: 'application/pdf'
                })
            }

            try {
                await sendEmail({
                    to: tenant.email,
                    subject,
                    html,
                    attachments
                })
            } catch (emailError: any) {
                console.error("Error sending payment receipt:", emailError)
                return NextResponse.json(
                    { error: 'Failed to send email' },
                    { status: 500 }
                )
            }
        } else {
            return NextResponse.json(
                { error: 'Tenant email not found' },
                { status: 400 }
            )
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('API Error resending receipt:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
