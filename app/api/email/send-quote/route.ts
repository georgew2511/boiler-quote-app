import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

interface QuoteEmailRequest {
  customerEmail: string
  customerName: string
  companyId: string
  boilerName: string
  boilerPrice: number
  finalPrice: number
  surcharges: Array<{ name: string; price: number }>
  selectedAnswers: Record<string, string>
}

export async function POST(request: Request) {
  try {
    const {
      customerEmail,
      customerName,
      companyId,
      boilerName,
      boilerPrice,
      finalPrice,
      surcharges,
    }: QuoteEmailRequest = await request.json()

    // Fetch company settings to get the from_email
    const { data: company } = await supabase
      .from('company_settings')
      .select('from_email, company_name')
      .eq('company_id', companyId)
      .maybeSingle()

    if (!company?.from_email) {
      return NextResponse.json(
        { error: 'Company email not configured' },
        { status: 400 }
      )
    }

    const surchargesHtml = surcharges
      .map((s) => `<tr><td style="padding: 8px; text-align: left;">${s.name}</td><td style="padding: 8px; text-align: right;">£${s.price}</td></tr>`)
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f5f7fb; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0 0 10px 0; color: #1f2937; }
            .quote-box { background: #f9fafb; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .quote-box h2 { margin-top: 0; color: #16a34a; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
            .total-row { background: #16a34a; color: white; font-weight: 600; font-size: 18px; }
            .total-row td { padding: 12px; }
            .footer { color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Boiler Quote</h1>
              <p>Thank you ${customerName}, here's your personalised fixed price boiler quote from ${company.company_name}.</p>
            </div>

            <div class="quote-box">
              <h2>£${finalPrice.toLocaleString()}</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Guaranteed fixed price for installation</p>
            </div>

            <h3 style="margin-top: 30px;">Boiler Details</h3>
            <table>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Price</th>
              </tr>
              <tr>
                <td>${boilerName}</td>
                <td style="text-align: right;">£${boilerPrice.toLocaleString()}</td>
              </tr>
              ${surchargesHtml}
              <tr class="total-row">
                <td>Total</td>
                <td style="text-align: right;">£${finalPrice.toLocaleString()}</td>
              </tr>
            </table>

            <p style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; margin: 20px 0; font-size: 14px;">
              <strong>What happens next?</strong> If you're happy with this quote, you can proceed with booking. Our team will be in touch to arrange an installation date that suits you.
            </p>

            <div class="footer">
              <p>This is an automatically generated email. Please do not reply to this address. For queries, contact ${company.company_name} directly.</p>
              <p style="margin: 10px 0 0 0;">Powered by Relode</p>
            </div>
          </div>
        </body>
      </html>
    `

    const response = await resend.emails.send({
      from: company.from_email,
      to: customerEmail,
      subject: `Your boiler quote from ${company.company_name} — £${finalPrice.toLocaleString()}`,
      html,
    })

    if (response.error) {
      console.error('Resend error:', response.error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: response.data?.id })
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to send email' }, { status: 500 })
  }
}
