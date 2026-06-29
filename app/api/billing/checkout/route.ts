import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getStripe } from '@/lib/stripe'
import { SELF_SERVE_TIERS } from '@/lib/subscriptionTiers'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

export async function POST(request: Request) {
    try {
        // Always act on the authenticated user's own company — never trust a
        // company_id supplied by the client, which would let anyone start
        // checkout (and attach a Stripe customer) on someone else's account.
        const company = await getCurrentCompany()
        const supabase = await createClient()
        const { tier: rawTier } = await request.json()

        if (!(rawTier === 'starter' || rawTier === 'growth' || rawTier === 'pro')) {
            return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
        }

        const tier = rawTier as 'starter' | 'growth' | 'pro'
        const stripe = getStripe()

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
