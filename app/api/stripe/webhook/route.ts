import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { getTierDefinition, TRIAL_DAYS } from '@/lib/subscriptionTiers'

// Configure this URL (https://yourdomain.com/api/stripe/webhook) in the
// Stripe dashboard under Developers > Webhooks, and put the signing secret
// it gives you into STRIPE_WEBHOOK_SECRET. Events this route needs enabled:
//   checkout.session.completed
//   customer.subscription.created / .updated / .deleted
//   customer.subscription.trial_will_end
//   invoice.payment_failed
//
// Writes go through the service-role client: a webhook arrives with no user
// session, so an RLS-scoped client would match zero rows and "succeed" without
// updating anything.
export async function POST(request: Request) {
    const stripe = getStripe()
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    let event
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET || '')
    } catch (error) {
        console.error('Invalid Stripe webhook signature:', error)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createAdminClient()

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any
                const companyId = session.metadata?.company_id
                const tier = session.metadata?.tier
                if (companyId && session.subscription) {
                    await syncSubscription(companyId, session.subscription as string, tier)
                }
                break
            }

            // Fires on trial start, on the trial→active flip when Stripe raises
            // the first invoice, and on any plan change or cancellation.
            case 'customer.subscription.updated':
            case 'customer.subscription.created': {
                const subscription = event.data.object as any
                const companyId = subscription.metadata?.company_id
                const tier = subscription.metadata?.tier
                if (companyId) {
                    await syncSubscription(companyId, subscription.id, tier, subscription)
                }
                break
            }

            // Stripe sends this three days before the card is charged for the
            // first time. Legally required warning in the UK/EU, and it heads
            // off the "I didn't know I'd be billed" chargebacks.
            case 'customer.subscription.trial_will_end': {
                const subscription = event.data.object as any
                const companyId = subscription.metadata?.company_id
                if (companyId) {
                    await sendTrialEndingEmail(companyId, subscription.trial_end)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any
                const companyId = subscription.metadata?.company_id
                if (companyId) {
                    await supabase
                        .from('companies')
                        .update({ subscription_status: 'cancelled' })
                        .eq('id', companyId)
                }
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as any
                // Newer API versions nest the subscription under `parent`; keep
                // reading the legacy top-level field as a fallback.
                const subscriptionId =
                    invoice.parent?.subscription_details?.subscription ?? invoice.subscription
                if (subscriptionId) {
                    const { data: company } = await supabase
                        .from('companies')
                        .select('id')
                        .eq('stripe_subscription_id', subscriptionId)
                        .maybeSingle()

                    if (company) {
                        await supabase
                            .from('companies')
                            .update({ subscription_status: 'past_due' })
                            .eq('id', company.id)
                    }
                }
                break
            }
        }
    } catch (error) {
        console.error('Failed to handle Stripe event:', event.type, error)
    }

    return NextResponse.json({ success: true })
}

// Stripe's subscription statuses don't match the vocabulary the app gates on
// (`app/page.tsx` login check, `app/admin/layout.tsx` lock screen, the
// superadmin dashboards). Translate once, here, so a trialing subscription
// reads as 'trial' everywhere downstream.
function mapStatus(stripeStatus: string): string {
    switch (stripeStatus) {
        case 'active':
            return 'active'
        case 'trialing':
            return 'trial'
        case 'past_due':
        case 'unpaid':
            return 'past_due'
        case 'canceled':
        case 'incomplete_expired':
            return 'cancelled'
        default:
            // incomplete, paused, and anything Stripe adds later — no access,
            // but not a hard "cancelled" either.
            return 'pending'
    }
}

async function syncSubscription(companyId: string, subscriptionId: string, tier?: string, subscriptionObj?: any) {
    const subscription = subscriptionObj || (await getStripe().subscriptions.retrieve(subscriptionId))

    // Stripe moved current_period_start/end onto subscription items in newer
    // API versions — fall back to the first item if the top-level field isn't there.
    const firstItem = subscription.items?.data?.[0]
    const periodStart = subscription.current_period_start ?? firstItem?.current_period_start
    const periodEnd = subscription.current_period_end ?? firstItem?.current_period_end

    const update: Record<string, any> = {
        stripe_subscription_id: subscription.id,
        subscription_status: mapStatus(subscription.status),
        subscription_tier: tier || subscription.metadata?.tier || null,
        billing_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        billing_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    }

    // Stripe owns the trial clock. Only ever write trial_ends_at from what it
    // reports, and never clear it once set — a null trial_ends_at is what marks
    // a company as still eligible for a first trial in the checkout route.
    if (subscription.trial_end) {
        update.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString()
    }

    const { error } = await createAdminClient()
        .from('companies')
        .update(update)
        .eq('id', companyId)

    if (error) {
        console.error('Failed to sync subscription for company', companyId, error.message)
    }
}

async function sendTrialEndingEmail(companyId: string, trialEnd: number | null) {
    const supabase = createAdminClient()

    const { data: company } = await supabase
        .from('companies')
        .select('company_name, owner_user_id, subscription_tier')
        .eq('id', companyId)
        .maybeSingle()

    if (!company?.owner_user_id) return

    const { data: owner } = await supabase.auth.admin.getUserById(company.owner_user_id)
    const email = owner?.user?.email
    if (!email) return

    const tier = getTierDefinition(company.subscription_tier)
    const chargeDate = trialEnd
        ? new Date(trialEnd * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'in three days'

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || '',
        to: email,
        subject: 'Your Relode free trial ends in 3 days',
        html: `
            <p>Hi,</p>
            <p>Your ${TRIAL_DAYS}-day free trial of Relode ends on <strong>${chargeDate}</strong>.</p>
            <p>Unless you cancel before then, the card you added at signup will be
            charged <strong>£${(tier.priceMonthlyPence / 100).toFixed(2)}</strong> for the
            ${tier.name} plan, and monthly from that date.</p>
            <p>You can change plan or cancel any time from
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/billing">Billing</a> in your dashboard.</p>
            <p>— Relode</p>
        `,
    })

    // Surfaced rather than swallowed: a missed trial-ending warning is the
    // difference between a renewal and a chargeback.
    if (error) {
        console.error('Failed to send trial-ending email to', email, error)
    }
}
