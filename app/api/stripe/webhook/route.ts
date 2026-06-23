import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

// Configure this URL (https://yourdomain.com/api/stripe/webhook) in the
// Stripe dashboard under Developers > Webhooks, and put the signing secret
// it gives you into STRIPE_WEBHOOK_SECRET.
export async function POST(request: Request) {
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    let event
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET || '')
    } catch (error) {
        console.error('Invalid Stripe webhook signature:', error)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

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
                const subscriptionId = invoice.subscription
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

async function syncSubscription(companyId: string, subscriptionId: string, tier?: string, subscriptionObj?: any) {
    const subscription = subscriptionObj || (await stripe.subscriptions.retrieve(subscriptionId))

    // Stripe moved current_period_start/end onto subscription items in newer
    // API versions — fall back to the first item if the top-level field isn't there.
    const firstItem = subscription.items?.data?.[0]
    const periodStart = subscription.current_period_start ?? firstItem?.current_period_start
    const periodEnd = subscription.current_period_end ?? firstItem?.current_period_end

    await supabase
        .from('companies')
        .update({
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
            subscription_tier: tier || subscription.metadata?.tier || null,
            billing_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            billing_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        })
        .eq('id', companyId)
}
