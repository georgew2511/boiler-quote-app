import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getStripe, getTierProductId } from '@/lib/stripe'
import { SELF_SERVE_TIERS, TRIAL_DAYS, getTierDefinition } from '@/lib/subscriptionTiers'
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
        const definition = SELF_SERVE_TIERS[tier]
        const stripe = getStripe()

        // A subscription is only "live" while it's being paid for or trialled.
        // Anything else (cancelled, past_due, never subscribed) means the next
        // step is a fresh checkout, not a change to an existing plan.
        const hasLiveSubscription =
            !!company.stripe_subscription_id &&
            (company.subscription_status === 'active' || company.subscription_status === 'trial')

        // Downgrades aren't self-serve. Enforced here rather than only in the
        // UI, since the UI check is just a disabled button and this endpoint
        // takes a tier straight from the request body.
        if (hasLiveSubscription) {
            const currentRank = getTierDefinition(company.subscription_tier).rank
            if (definition.rank < currentRank) {
                return NextResponse.json(
                    { error: 'That plan change needs to be arranged with us — get in touch and we\'ll sort it.' },
                    { status: 403 }
                )
            }
            if (definition.rank === currentRank) {
                return NextResponse.json({ error: 'You are already on that plan' }, { status: 400 })
            }

            // Same-plan upgrade path: swap the price on the subscription they
            // already have. No second checkout, no re-entering card details —
            // the card Stripe already holds is reused and the change is live by
            // the time this responds.
            return await upgradeInPlace(company, tier)
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

        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || ''

        // One free trial per company, ever. trial_ends_at is only ever written
        // by the Stripe webhook once a trial actually starts, so a null here
        // means this company has never had one — anyone who cancels and comes
        // back gets billed immediately instead of a second free fortnight.
        const eligibleForTrial = !company.trial_ends_at && !company.stripe_subscription_id

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: stripeCustomerId,
            // Card details are taken up front even though £0 is due today —
            // that is the whole point of the trial flow, and without it the
            // subscription would have no payment method to charge on day 15.
            payment_method_collection: 'always',
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product: await getTierProductId(tier),
                        unit_amount: definition.priceMonthlyPence,
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                },
            ],
            metadata: { company_id: company.id, tier },
            subscription_data: {
                metadata: { company_id: company.id, tier },
                ...(eligibleForTrial
                    ? {
                        trial_period_days: TRIAL_DAYS,
                        trial_settings: {
                            end_behavior: { missing_payment_method: 'cancel' as const },
                        },
                    }
                    : {}),
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

async function upgradeInPlace(company: any, tier: 'starter' | 'growth' | 'pro') {
    const stripe = getStripe()
    const definition = SELF_SERVE_TIERS[tier]

    const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id)
    const item = subscription.items.data[0]

    if (!item) {
        return NextResponse.json({ error: 'Subscription has no billable item' }, { status: 500 })
    }

    const onTrial = subscription.status === 'trialing'

    await stripe.subscriptions.update(subscription.id, {
        items: [
            {
                id: item.id,
                price_data: {
                    currency: 'gbp',
                    product: await getTierProductId(tier),
                    unit_amount: definition.priceMonthlyPence,
                    recurring: { interval: 'month' },
                },
                quantity: 1,
            },
        ],
        // Mid-trial upgrades stay free: the trial runs to its original end date
        // and the first invoice is simply raised at the new price. Upgrading a
        // paying customer bills the pro-rata difference right away, so the
        // bigger lead allowance is paid for from the moment it takes effect.
        proration_behavior: onTrial ? 'none' : 'always_invoice',
        metadata: { ...subscription.metadata, company_id: company.id, tier },
    })

    // The customer.subscription.updated webhook writes the new tier too, but
    // that can land after the redirect. Writing it here means the billing page
    // already shows the new plan when they get back to it.
    const supabase = await createClient()
    const { error } = await supabase
        .from('companies')
        .update({ subscription_tier: tier })
        .eq('id', company.id)

    if (error) {
        console.error('Upgrade succeeded in Stripe but failed to write tier locally:', error.message)
    }

    return NextResponse.json({ upgraded: true, tier })
}
