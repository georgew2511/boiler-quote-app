import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createClient } from '@/utils/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
    try {
        const company = await getCurrentCompany()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email) {
            return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
        }

        const { message, pageUrl } = await req.json()

        if (!message || typeof message !== 'string' || message.trim().length < 10) {
            return NextResponse.json({ error: 'Please describe the problem in a bit more detail.' }, { status: 400 })
        }

        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? 'noreply@relode.io',
            to: 'support@relode.io',
            replyTo: user.email,
            subject: `Bug report from ${company.company_name}`,
            html: `
                <h2>Bug report</h2>
                <p><strong>Company:</strong> ${escapeHtml(company.company_name)} (${company.id})</p>
                <p><strong>Account email:</strong> ${escapeHtml(user.email)}</p>
                <p><strong>Page:</strong> ${escapeHtml(pageUrl ?? 'unknown')}</p>
                <p><strong>Reported at:</strong> ${new Date().toISOString()}</p>
                <hr />
                <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
            `,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('report-problem failed:', error)
        return NextResponse.json({ error: 'Failed to send report' }, { status: 500 })
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
