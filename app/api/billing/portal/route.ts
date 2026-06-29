import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

export async function POST(request: Request) {
    try {
        // Always use the authenticated user's own company — never the
        // company_id from the request body, which would let anyone open a
        // billing portal session (invoices, payment methods, cancellation)
        // for any other tenant.
        const company = await getCurrentCompany()
        const stripe = getStripe()

        if (!company.stripe_customer_id) {
            return NextResponse.json({ error: 'No billing account found yet' }, { status: 404 })
        }

        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || ''

        const session = await stripe.billingPortal.sessions.create({
            customer: company.stripe_customer_id,
            return_url: `${origin}/admin/billing`,
        })

        return NextResponse.json({ url: session.url })
    } catch (error: any) {
        console.error('Stripe portal error:', error)
        return NextResponse.json({ error: error?.message || 'Failed to open billing portal' }, { status: 500 })
    }
}
