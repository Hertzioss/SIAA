import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mail'
import { generateEmailHtml } from '@/lib/email-templates'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { recipients, subject, message } = body

        if (!recipients || !Array.isArray(recipients) || !subject || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: recipients (array), subject, message' },
                { status: 400 }
            )
        }

        // Parallel processing of emails (be mindful of rate limits)
        // For MailRelay SMTP, sequential or small batches is safer to avoid connection limits
        const results = await Promise.allSettled(recipients.map(async (recipient: { email: string, name: string }) => {
            // Replace tags in message
            const personalizedMessage = message.replace(/{inquilino}/g, recipient.name || 'Inquilino')

            // Generate full HTML
            const html = generateEmailHtml(subject, personalizedMessage, recipient.name)

            return sendEmail({
                to: recipient.email,
                subject,
                html
            })
        }))

        const failed = results.filter(r => r.status === 'rejected')

        if (failed.length > 0) {
            console.warn(`${failed.length} emails failed to send`)
            // We still return success if at least some worked, but maybe log details
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
