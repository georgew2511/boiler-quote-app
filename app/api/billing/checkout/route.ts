import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { SELF_SERVE_TIERS } from '@/lib/subscriptionTiers'

export async function POST(request: Request) {
    try {
        const { company_id, tier: rawTier } = await request.json()

        if (!company_id || !(rawTier === 'starter' || rawTier === 'growth' || rawTier === 'pro')) {
            return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
        }

        const tier = rawTier as 'starter' | 'growth' | 'pro'
        const stripe = getStripe()

        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', company_id)
            .single()

        if (companyError || !company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        let stripeCustomerId = company.stripe_customer_id as string | null

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                name: company.company_name,
                metadata: { company_id: company.id },
            })
            stripeCustomerId = customer.id

            await supabase.from('companies').update({ stripe_customer_id: stripeCustomerId }).eq('id', company.id)
        }

        const definition = SELF_SERVE_TIERS[tier]
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || ''

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: { name: `Relode — ${definition.name} Plan` },
                        unit_amount: definition.priceMonthlyPence,
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                },
            ],
            metadata: { company_id: company.id, tier },
            subscription_data: {
                metadata: { company_id: company.id, tier },
            },
            success_url: `${origin}/admin/billing?success=1`,
            cancel_url: `${origin}/admin/billing`,
        })

        return NextResponse.json({ url: session.url })
    } catch (error: any) {
        console.error('Stripe checkout error:', error)
        return NextResponse.json({ error: error?.message || 'Failed to start checkout' }, { status: 500 })
    }
}
