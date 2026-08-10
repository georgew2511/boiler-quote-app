import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

// Seeds the company_settings row for a brand-new company. Without this the row
// is only created the first time someone saves Admin → Settings, so companies
// that never opened that page had none at all — leaving every setting on its
// default and no contact address for notification emails to fall back to.
// Runs with the service-role client: company_settings has no usable insert
// policy for the signing-up user, who may not even have a session yet when
// email confirmation is required.
async function createCompanySettings(companyId: string, companyName: string, email: string) {
    const supabase = createAdminClient()

    const { data: existing, error: readError } = await supabase
        .from('company_settings')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle()

    if (readError) {
        console.error('signup: failed to check for existing settings:', readError.message)
        return
    }
    if (existing) return

    const { error } = await supabase.from('company_settings').insert([
        {
            company_id: companyId,
            company_name: companyName || '',
            // Customer-facing contact address (shown in quote footers and used
            // as reply-to). Seeded from the signup email so quotes aren't
            // sent with a blank contact; the company can change it in Settings.
            email_address: email || '',
            // Internal only — where new-lead notifications are sent.
            lead_notification_email: email || '',
        },
    ])

    if (error) console.error('signup: failed to create company settings:', error.message)
}

export async function POST(req: NextRequest) {
    try {
        const { companyName, ownerName, email, phone, companyId } = await req.json()

        // Before the notification email: seeding the new company's settings
        // matters to the user, whereas the email below is just for us.
        if (companyId) {
            await createCompanySettings(companyId, companyName, email)
        } else {
            console.error('signup: no companyId supplied, settings row not created')
        }

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
