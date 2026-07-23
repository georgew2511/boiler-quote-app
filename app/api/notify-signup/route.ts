import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
    try {
        const { companyName, ownerName, email, phone } = await req.json()

        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? 'support@relode.io',
            to: 'george@relode.io',
            replyTo: email || undefined,
            subject: `New free trial signup: ${companyName || 'Unnamed company'}`,
            html: `
                <h2>New free trial signup</h2>
                <p><strong>Company:</strong> ${escapeHtml(companyName || '-')}</p>
                <p><strong>Owner:</strong> ${escapeHtml(ownerName || '-')}</p>
                <p><strong>Email:</strong> ${escapeHtml(email || '-')}</p>
                <p><strong>Phone:</strong> ${escapeHtml(phone || '-')}</p>
                <p><strong>Signed up at:</strong> ${new Date().toISOString()}</p>
            `,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('signup notification failed:', error)
        // Best-effort notification — a failure here shouldn't be surfaced
        // to the new user, their account has already been created.
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
    }
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}
