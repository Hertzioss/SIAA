export interface SendEmailData {
    to: string | string[]
    subject: string
    html: string
}

export const sendEmail = async ({ to, subject, html }: SendEmailData) => {
    const apiKey = process.env.RESEND_APIKEY
    const from = process.env.FROM_EMAIL || 'onboarding@resend.dev'

    if (!apiKey) {
        throw new Error('RESEND_APIKEY is not defined in environment variables')
    }

    const recipients = Array.isArray(to) ? to : [to]

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: recipients,
            subject,
            html,
        }),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }))
        console.error('Resend API error:', error)
        throw new Error(`Resend error: ${error?.message || response.statusText}`)
    }

    const data = await response.json()
    console.log('Email sent via Resend, id:', data.id)
    return data
}
