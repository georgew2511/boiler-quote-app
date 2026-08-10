import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getLeadEmailSettings, sendLeadEmail, LEAD_DASHBOARD_URL } from '@/lib/systemSettings'

// Called by the public calculator right after a lead is inserted. The caller
// is an anonymous homeowner filling in the form, so this route is unauthenticated
// and takes ONLY a lead id — every address it sends to is looked up server-side.
// Never accept a recipient from the request body: that would turn this into an
// open relay for sending mail from our verified domain.
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => null)
        const leadId = body?.leadId

        if (!leadId || typeof leadId !== 'string') {
            return NextResponse.json({ error: 'leadId required' }, { status: 400 })
        }

        const supabase = createAdminClient()

        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('id, company_id, name, email, phone, postcode, boiler_name, quote_price, status, notification_sent_at')
            .eq('id', leadId)
            .maybeSingle()

        if (leadError) {
            console.error('notify-lead: failed to load lead:', leadError.message)
            return NextResponse.json({ error: 'lookup failed' }, { status: 500 })
        }
        if (!lead) {
            return NextResponse.json({ error: 'lead not found' }, { status: 404 })
        }

        // Preview/test leads come from a company trying out its own calculator —
        // notifying them every time they test would be noise.
        if (lead.status === 'Test') {
            return NextResponse.json({ skipped: 'test lead' })
        }
        if (lead.notification_sent_at) {
            return NextResponse.json({ skipped: 'already sent' })
        }

        const settings = await getLeadEmailSettings()
        if (!settings.enabled) {
            return NextResponse.json({ skipped: 'disabled' })
        }

        // Claim the lead before sending. Two rapid calls would otherwise both
        // read a null timestamp and send twice; the `is null` filter means only
        // one of them gets rows back and actually sends.
        const { data: claimed, error: claimError } = await supabase
            .from('leads')
            .update({ notification_sent_at: new Date().toISOString() })
            .eq('id', leadId)
            .is('notification_sent_at', null)
            .select('id')

        if (claimError) {
            console.error('notify-lead: failed to claim lead:', claimError.message)
            return NextResponse.json({ error: 'claim failed' }, { status: 500 })
        }
        if (!claimed || claimed.length === 0) {
            return NextResponse.json({ skipped: 'already sent' })
        }

        const { data: companySettings } = await supabase
            .from('company_settings')
            .select('company_name, lead_notification_email')
            .eq('company_id', lead.company_id)
            .maybeSingle()

        // A company_settings row is only created the first time someone saves
        // Admin → Settings, so plenty of companies have none at all. Always read
        // the companies row too, or the greeting falls back to a generic "there"
        // for exactly those companies.
        const { data: company } = await supabase
            .from('companies')
            .select('company_name, owner_user_id')
            .eq('id', lead.company_id)
            .maybeSingle()

        // Prefer the address the company chose in Settings; otherwise fall back
        // to the email the account signed up with.
        let recipient = (companySettings?.lead_notification_email || '').trim()

        if (!recipient && company?.owner_user_id) {
            const { data: owner, error: ownerError } = await supabase.auth.admin.getUserById(
                company.owner_user_id,
            )
            if (ownerError) console.error('notify-lead: failed to load owner:', ownerError.message)
            recipient = owner?.user?.email ?? ''
        }

        if (!recipient) {
            // Release the claim so a later retry can still deliver this one.
            await supabase.from('leads').update({ notification_sent_at: null }).eq('id', leadId)
            console.error(`notify-lead: no recipient for company ${lead.company_id}`)
            return NextResponse.json({ error: 'no recipient' }, { status: 422 })
        }

        const { error: sendError } = await sendLeadEmail(recipient, settings, {
            company_name: companySettings?.company_name || company?.company_name || 'there',
            lead_name: lead.name || 'Not given',
            lead_email: lead.email || 'Not given',
            lead_phone: lead.phone || 'Not given',
            lead_postcode: lead.postcode || 'Not given',
            lead_boiler: lead.boiler_name || 'Not selected',
            lead_price: lead.quote_price ? `£${lead.quote_price}` : 'Not quoted',
            dashboard_url: LEAD_DASHBOARD_URL,
        })

        if (sendError) {
            // Surfaced rather than swallowed: a silent failure here is
            // indistinguishable from "no leads came in", which is the worst
            // possible way for this to break.
            await supabase.from('leads').update({ notification_sent_at: null }).eq('id', leadId)
            console.error('notify-lead: Resend rejected the send:', sendError)
            return NextResponse.json({ error: 'send failed' }, { status: 502 })
        }

        return NextResponse.json({ sent: true })
    } catch (e) {
        console.error('notify-lead: unexpected error:', e)
        return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
    }
}
