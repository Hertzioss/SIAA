import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mail'
import { generateEmailHtml } from '@/lib/email-templates'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
    try {
        // Check if email sending is enabled in company settings
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('email_enabled')
            .single()

        if (company && company.email_enabled === false) {
            return NextResponse.json({
                success: true,
                skipped: true,
                reason: 'El envío de emails está desactivado en la configuración.'
            })
        }

        const body = await request.json()
        const { recipients, subject, message } = body

        if (!recipients || !Array.isArray(recipients) || !subject || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: recipients (array), subject, message' },
                { status: 400 }
            )
        }

        // Sequential processing with delay to avoid rate limits
        // The limit is 5 requests per second, so we add a delay between each send
        const results = []
        const today = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })

        console.log(`Iniciando envío masivo a ${recipients.length} destinatarios...`)

        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i]
            
            try {
                // Replace tags in message and subject
                const replacer = (text: string) => {
                    if (!text) return text
                    return text
                        .replace(/{inquilino}/g, recipient.name || 'Inquilino')
                        .replace(/{fecha}/g, today)
                        .replace(/{email}/g, recipient.email || '')
                        .replace(/{propiedad}/g, recipient.property || 'su propiedad')
                }

                const personalizedSubject = replacer(subject)
                const personalizedMessage = replacer(message)

                // Generate full HTML
                const html = generateEmailHtml(personalizedSubject, personalizedMessage, recipient.name)

                const res = await sendEmail({
                    to: recipient.email,
                    subject: personalizedSubject,
                    html
                })
                
                results.push({ status: 'fulfilled', value: res })
                console.log(`[${i + 1}/${recipients.length}] Email enviado a ${recipient.email}`)
            } catch (error: any) {
                console.error(`[${i + 1}/${recipients.length}] Error enviando a ${recipient.email}:`, error.message)
                results.push({ status: 'rejected', reason: error })
            }

            // Delay entre envíos para evitar límites del proveedor (ej. 5 req/seg)
            // 500ms de delay asegura que nos mantengamos bajo el límite (máx 2 req/seg)
            if (i < recipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 400))
            }
        }

        const failed = results.filter(r => r.status === 'rejected')

        if (failed.length > 0) {
            console.warn(`${failed.length} correos fallaron al enviarse`)
        }

        return NextResponse.json({
            success: true,
            sent: results.length - failed.length,
            failed: failed.length
        })
    } catch (error: any) {
        console.error('API Error sending email:', error)
        return NextResponse.json(
            { error: 'Failed to send email', details: error.message },
            { status: 500 }
        )
    }
}
