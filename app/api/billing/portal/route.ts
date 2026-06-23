import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
    try {
        const { company_id } = await request.json()

        const { data: company } = await supabase
            .from('companies')
            .select('stripe_customer_id')
            .eq('id', company_id)
            .single()

        if (!company?.stripe_customer_id) {
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
