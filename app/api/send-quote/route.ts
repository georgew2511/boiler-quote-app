import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const data = await req.json()

    const { customer, boiler, companyId } = data

    if (companyId) {
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          name: customer.name,
          email: customer.email,
          phone: customer.phone || null,
          company_id: companyId,
          recommended_boilers: [boiler],
        })

      if (leadError) {
        console.error('Lead insert failed:', leadError)
      }
    }

    const result = await resend.emails.send({
      from: 'quotes@surrey-gas.com',
      to: customer.email,
      bcc: 'george@surrey-gas.com',
      subject: `Your Boiler Quote - ${boiler.name}`,
      html: `
        <h1>Your Boiler Quote</h1>

        <p>Hi ${customer.name},</p>

        <p>Thank you for requesting a boiler quote from Surrey Gas.</p>

        <h2>${boiler.name}</h2>

        <p>
          Fixed Price: <strong>£${Number(boiler.price).toLocaleString()}</strong>
        </p>

        <p>
          This price includes installation, commissioning and registration.
        </p>

        <p>
          Kind regards,<br />
          Surrey Gas
        </p>
      `,
    })

    return Response.json({ success: true, result })
  } catch (error) {
    console.error(error)

    return Response.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    )
  }
}