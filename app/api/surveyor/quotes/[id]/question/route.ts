import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(s: string) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const question = typeof body.question === 'string' ? body.question.trim() : ''

    if (!question) {
        return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }
    if (question.length > 5000) {
        return NextResponse.json({ error: 'Question is too long' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Customer identity is taken from the stored quote, never trusted from the client.
    const { data: quote } = await supabase
        .from('surveyor_quotes')
        .select('*')
        .eq('id', id)
        .single()

    if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

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
    const companyEmail = settings?.email_address ?? ''
    const fromEmail = settings?.from_email ?? process.env.RESEND_FROM_EMAIL ?? 'noreply@relode.io'

    if (!companyEmail) {
        return NextResponse.json({ error: 'No company email configured' }, { status: 422 })
    }

    const quoteRef = id.slice(-8).toUpperCase()
    const customerName = quote.customer_name || 'Customer'
    const customerEmail = quote.customer_email || ''
    const customerPhone = quote.customer_phone || ''
    const postcode = quote.postcode || ''

    const rows: [string, string][] = [
        ['Customer', customerName],
        ['Email', customerEmail],
        ['Phone', customerPhone],
        ['Postcode', postcode],
        ['Quote ref', quoteRef],
    ]

    const companyHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);margin:0 auto;">
    <tr><td style="background:#1d4ed8;padding:28px 36px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">New question about a quote</h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Ref: ${quoteRef}</p>
    </td></tr>
    <tr><td style="padding:32px 36px;">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">A customer has a question about their quote:</p>
      <div style="background:#f1f5f9;border-left:4px solid #1d4ed8;border-radius:8px;padding:16px 18px;font-size:15px;color:#111827;line-height:1.6;white-space:pre-line;margin:0 0 24px;">${escapeHtml(question)}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows.map(([label, value], i) => `
        <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
          <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#6b7280;width:140px;">${label}</td>
          <td style="padding:10px 12px;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`).join('')}
      </table>
      ${customerEmail ? `<p style="margin:24px 0 0;font-size:13px;color:#6b7280;">Reply directly to this email to respond to ${escapeHtml(customerName)}.</p>` : ''}
    </td></tr>
  </table>
</body></html>`

    try {
        await resend.emails.send({
            from: fromEmail,
            to: companyEmail,
            // Replies go straight back to the customer where we have their email.
            replyTo: customerEmail || undefined,
            subject: `Question about quote ${quoteRef} — ${customerName}${postcode ? `, ${postcode}` : ''}`,
            html: companyHtml,
        })
    } catch (e) {
        console.error('Customer question email failed:', e)
        return NextResponse.json({ error: 'Failed to send question' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}
