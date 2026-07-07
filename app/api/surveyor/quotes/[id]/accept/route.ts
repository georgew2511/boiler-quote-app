import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const DEFAULT_TEMPLATE = `Hi {customer_name},

Thank you for accepting your boiler installation quote with {company_name}!

You have chosen the {boiler_name} — your total is {total} (inc. 20% VAT).

A member of our team will be in touch shortly to arrange a convenient installation date.

If you have any questions in the meantime, please don't hesitate to contact us:
📞 {phone}
✉ {email}

Thank you for choosing {company_name}.`

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { optionLabel, boilerName, total } = await req.json()

    const supabase = createAdminClient()

    const { data: quote } = await supabase
        .from('surveyor_quotes')
        .select('*')
        .eq('id', id)
        .single()

    if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    await supabase
        .from('surveyor_quotes')
        .update({
            // accepted_tier historically stored LOW/MID/HIGH; now stores the
            // option's friendly label directly (e.g. "Better", "Premium").
            accepted_tier: optionLabel,
            accepted_at: new Date().toISOString(),
            status: 'ACCEPTED',
        })
        .eq('id', id)

    const { data: settings } = await supabase
        .from('company_settings')
        .select('company_name, phone_number, email_address, from_email, reply_to_email')
        .eq('company_id', quote.company_id)
        .maybeSingle()

    const { data: company } = await supabase
        .from('companies')
        .select('company_name')
        .eq('id', quote.company_id)
        .single()

    const companyName = settings?.company_name ?? company?.company_name ?? 'Your Company'
    const companyPhone = settings?.phone_number ?? ''
    const companyEmail = settings?.email_address ?? ''
    const fromEmail = settings?.from_email ?? process.env.RESEND_FROM_EMAIL ?? 'noreply@relode.io'
    const replyTo = (settings?.reply_to_email ?? companyEmail) || undefined

    const quoteRef = id.slice(-8).toUpperCase()
    const tierLabel = optionLabel || 'selected'

    const customerName = quote.customer_name
    const customerEmail = quote.customer_email
    const customerPhone = quote.customer_phone
    const postcode = quote.postcode

    const companyHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);margin:0 auto;">
    <tr><td style="background:#16a34a;padding:28px 36px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Quote Accepted ✓</h1>
      <p style="color:#bbf7d0;margin:6px 0 0;font-size:13px;">Ref: ${quoteRef}</p>
    </td></tr>
    <tr><td style="padding:32px 36px;">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">A customer has accepted their quote. Details below:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${[
            ['Customer', customerName],
            ['Email', customerEmail],
            ['Phone', customerPhone],
            ['Postcode', postcode],
            ['Boiler chosen', boilerName],
            ['Option', tierLabel],
            ['Total (inc. VAT)', `£${Number(total).toFixed(2)}`],
        ].map(([label, value], i) => `
        <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
          <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#6b7280;width:140px;">${label}</td>
          <td style="padding:10px 12px;font-size:14px;color:#111827;font-weight:600;">${value}</td>
        </tr>`).join('')}
      </table>
    </td></tr>
  </table>
</body></html>`

    const customerBody = DEFAULT_TEMPLATE
        .replace(/\{customer_name\}/g, customerName)
        .replace(/\{boiler_name\}/g, boilerName)
        .replace(/\{total\}/g, `£${Number(total).toFixed(2)}`)
        .replace(/\{company_name\}/g, companyName)
        .replace(/\{phone\}/g, companyPhone)
        .replace(/\{email\}/g, companyEmail)
        .replace(/\{quote_ref\}/g, quoteRef)

    const customerHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);margin:0 auto;">
    <tr><td style="background:#1d4ed8;padding:28px 36px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Quote Accepted — ${companyName}</h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Ref: ${quoteRef}</p>
    </td></tr>
    <tr><td style="padding:32px 36px;">
      <div style="font-size:15px;color:#374151;line-height:1.7;white-space:pre-line;">${customerBody}</div>
    </td></tr>
    <tr><td style="padding:16px 36px 28px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">${companyName}</p>
      ${companyPhone ? `<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">${companyPhone}</p>` : ''}
      ${companyEmail ? `<p style="margin:0;font-size:13px;color:#6b7280;">${companyEmail}</p>` : ''}
    </td></tr>
  </table>
</body></html>`

    const errors: string[] = []

    if (companyEmail) {
        try {
            await resend.emails.send({
                from: fromEmail,
                to: companyEmail,
                subject: `Quote accepted — ${customerName}, ${postcode} (${tierLabel})`,
                html: companyHtml,
            })
        } catch (e) {
            console.error('Company notification email failed:', e)
            errors.push('company')
        }
    }

    try {
        await resend.emails.send({
            from: fromEmail,
            to: customerEmail,
            replyTo: replyTo,
            subject: `Your quote confirmation — ${companyName}`,
            html: customerHtml,
        })
    } catch (e) {
        console.error('Customer confirmation email failed:', e)
        errors.push('customer')
    }

    return NextResponse.json({ ok: true, errors })
}
