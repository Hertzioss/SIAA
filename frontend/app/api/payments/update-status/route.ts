import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/mail'
import { generateEmailHtml } from '@/lib/email-templates'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id, status, notes, sendEmail: shouldSendEmail, pdfBase64 } = body

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields: id, status' },
                { status: 400 }
            )
        }

        // Debug Log
        // console.log(`Updating payment ${id} to status: ${status}. Current valid statuses should be: pending, approved, rejected.`);

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

        // 2. Check if email is enabled in system config
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('email_enabled')
            .single()
        
        const isEmailSystemEnabled = company?.email_enabled ?? true
        let emailSent = false
        let emailError = null

        // 3. Send Email if requested
        if (shouldSendEmail) {
            if (!isEmailSystemEnabled) {
                emailError = 'El envío de correos está desactivado globalmente en la configuración del sistema.'
                console.warn('Email skipped: System email is disabled.')
            } else if (payment?.tenant?.email) {
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
Monto: ${payment.currency === 'VES' ? 'Bs. ' : '$'}${payment.amount}
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

                // Prepare Attachment if base64 provided
                const attachments = []
                if (pdfBase64) {
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
                    emailSent = true
                } catch (err: any) {
                    console.error("Error sending payment notification:", err)
                    emailError = err.message || "Error al enviar el correo"
                }
            } else {
                emailError = 'El inquilino no tiene un correo electrónico configurado.'
                console.warn(`Skipping email: Payment ${id} updated, but tenant email is missing.`)
            }
        }

        return NextResponse.json({ 
            success: true, 
            emailSent, 
            emailError,
            emailSystemDisabled: !isEmailSystemEnabled
        })

    } catch (error: any) {
        console.error('API Error updating payment:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
