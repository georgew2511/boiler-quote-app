import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { getInactivityEmailSettings, renderInactivityEmail } from '@/lib/systemSettings'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.INACTIVITY_EMAIL_FROM || 'Relode <hello@relode.io>'
const LOGIN_URL = 'https://portal.relode.io/login'

// Triggered daily by Vercel Cron (see vercel.json). Vercel automatically
// sends `Authorization: Bearer ${CRON_SECRET}` for scheduled invocations —
// set CRON_SECRET in the project's env vars to match.
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getInactivityEmailSettings()

    if (!settings.enabled) {
        return NextResponse.json({ skipped: true, reason: 'Inactivity emails disabled' })
    }

    const adminClient = createAdminClient()
    const cutoff = new Date(Date.now() - settings.daysInactive * 24 * 60 * 60 * 1000).toISOString()

    const { data: companies, error } = await adminClient
        .from('companies')
        .select('id, company_name, owner_user_id, last_seen_at, last_inactivity_email_sent_at, subscription_status')
        .lt('last_seen_at', cutoff)
        .not('subscription_status', 'in', '("cancelled")')

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const dueCompanies = (companies || []).filter((c) => {
        // Only send once per inactive stretch — skip if we've already
        // emailed them since their last visit (i.e. they haven't been back
        // and triggered a fresh last_seen_at since that email went out).
        if (!c.last_inactivity_email_sent_at) return true
        return new Date(c.last_inactivity_email_sent_at) < new Date(c.last_seen_at)
    })

    const results: Array<{ company_id: string; sent: boolean; error?: string }> = []

    for (const c of dueCompanies) {
        if (!c.owner_user_id) {
            results.push({ company_id: c.id, sent: false, error: 'No owner_user_id' })
            continue
        }

        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(c.owner_user_id)
        const ownerEmail = userData?.user?.email

        if (userError || !ownerEmail) {
            results.push({ company_id: c.id, sent: false, error: userError?.message || 'No email found' })
            continue
        }

        const { subject, body } = renderInactivityEmail(settings, {
            company_name: c.company_name,
            login_url: LOGIN_URL,
        })

        const { error: sendError } = await resend.emails.send({
            from: FROM_EMAIL,
            to: ownerEmail,
            subject,
            // Plain text body with line breaks preserved — keeps this simple
            // and easy to edit from the admin area without an HTML editor.
            html: body.split('\n').map((line) => `<p style="margin:0 0 12px 0;">${line || '&nbsp;'}</p>`).join(''),
        })

        if (sendError) {
            results.push({ company_id: c.id, sent: false, error: sendError.message })
            continue
        }

        await adminClient
            .from('companies')
            .update({ last_inactivity_email_sent_at: new Date().toISOString() })
            .eq('id', c.id)

        results.push({ company_id: c.id, sent: true })
    }

    return NextResponse.json({
        checked: companies?.length || 0,
        due: dueCompanies.length,
        results,
    })
}
