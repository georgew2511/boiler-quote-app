import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const DEFAULT_TEMPLATE = `Hi {customer_name},

Thank you for receiving your boiler installation quote from {company_name}!

You have been sent three options (Good, Better, Best) to review at your convenience. Simply click your preferred option to accept.

If you have any questions, please don't hesitate to contact us:
📞 {phone}
✉ {email}

Thank you for considering {company_name}.`

export async function POST(req: NextRequest) {
    try {
        const { survey, quoteResult, companyId } = await req.json()

        const supabase = createAdminClient()

        // Fetch company details for the email
        const { data: company } = await supabase
            .from('companies')
            .select('company_name')
            .eq('id', companyId)
            .single()

        const { data: settings } = await supabase
            .from('company_settings')
            .select('company_name, phone_number, email_address, from_email, reply_to_email')
            .eq('company_id', companyId)
            .maybeSingle()

        const { data: quote, error } = await supabase
            .from('surveyor_quotes')
            .insert({
                company_id: companyId,
                customer_name: survey.customerName,
                customer_email: survey.customerEmail,
                customer_phone: survey.customerPhone,
                postcode: survey.postcode,
                survey_data: survey,
                line_items: quoteResult,
                low_boiler_id: survey.lowBoilerId,
                mid_boiler_id: survey.midBoilerId,
                high_boiler_id: survey.highBoilerId,
                low_total: quoteResult.low.total,
                mid_total: quoteResult.mid.total,
                high_total: quoteResult.high.total,
                status: 'SENT',
                email_sent_at: new Date().toISOString(),
                notes: survey.specialNotes ?? '',
            })
            .select('id')
            .single()

        if (error) {
            console.error('Failed to create surveyor quote:', error)
            return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
        }

        const quoteId = quote.id
        const quoteRef = quoteId.slice(-8).toUpperCase()
        const companyName = settings?.company_name ?? company?.company_name ?? 'Your Company'
        const companyPhone = settings?.phone_number ?? ''
        const companyEmail = settings?.email_address ?? ''
        const fromEmail = settings?.from_email ?? process.env.RESEND_FROM_EMAIL ?? 'noreply@relode.io'
        const replyTo = (settings?.reply_to_email ?? companyEmail) || undefined

        const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal.relode.io'}/q/${quoteId}`

        const emailBody = DEFAULT_TEMPLATE
            .replace(/\{customer_name\}/g, survey.customerName)
            .replace(/\{company_name\}/g, companyName)
            .replace(/\{phone\}/g, companyPhone)
            .replace(/\{email\}/g, companyEmail)

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);margin:0 auto;">
    <tr><td style="background:#1d4ed8;padding:28px 36px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Your Boiler Quote — ${companyName}</h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Ref: ${quoteRef}</p>
    </td></tr>
    <tr><td style="padding:32px 36px;">
      <div style="font-size:15px;color:#374151;line-height:1.7;white-space:pre-line;">${emailBody}</div>
      <div style="margin-top:28px;text-align:center;">
        <a href="${quoteUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">
          View &amp; Accept Your Quote →
        </a>
      </div>
    </td></tr>
    <tr><td style="padding:16px 36px 28px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">${companyName}</p>
      ${companyPhone ? `<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">${companyPhone}</p>` : ''}
      ${companyEmail ? `<p style="margin:0;font-size:13px;color:#6b7280;">${companyEmail}</p>` : ''}
    </td></tr>
  </table>
</body></html>`

        try {
            await resend.emails.send({
                from: fromEmail,
                to: survey.customerEmail,
                replyTo: replyTo,
                subject: `Your boiler installation quote — ${companyName}`,
                html,
            })
        } catch (emailError) {
            console.error('Email send failed:', emailError)
            // Don't fail the whole request — quote was saved
        }

        return NextResponse.json({ id: quoteId })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        const supabase = createAdminClient()
        const { searchParams } = new URL(req.url)
        const companyId = searchParams.get('company_id')

        let query = supabase
            .from('surveyor_quotes')
            .select('id, created_at, customer_name, customer_email, customer_phone, postcode, low_total, mid_total, high_total, status, email_sent_at, accepted_tier, accepted_at, last_viewed_at, view_count, notes')
            .order('created_at', { ascending: false })

        if (companyId) {
            query = query.eq('company_id', companyId)
        }

        const { data, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }
}
