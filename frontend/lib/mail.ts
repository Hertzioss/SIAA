import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: process.env.MAILRELAY_HOST,
    port: Number(process.env.MAILRELAY_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAILRELAY_USER,
        pass: process.env.MAILRELAY_PASS,
    },
    debug: true,
    logger: true,
})

export interface SendEmailData {
    to: string | string[]
    subject: string
    html: string
}

export const sendEmail = async ({ to, subject, html }: SendEmailData) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.MAILRELAY_FROM_EMAIL || '"Escritorio Legal Admin" <admin@siaa.com>',
            to: Array.isArray(to) ? to.join(', ') : to,
            subject,
            html,
        })

        console.log('Message sent: %s', info.messageId)
        return info
    } catch (error) {
        console.error('Error sending email:', error)
        throw error
    }
}
