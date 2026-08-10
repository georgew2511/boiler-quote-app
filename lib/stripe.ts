import Stripe from 'stripe'
import { SELF_SERVE_TIERS } from './subscriptionTiers'

// Requires STRIPE_SECRET_KEY in env vars — from the Stripe dashboard under
// Developers > API keys. Use the test key while building, swap to the live
// key when ready to actually take payments.
//
// Constructed lazily (not at module load) so the build doesn't fail before
// the env var is set in the deployment environment — the SDK throws
// immediately on construction if given an empty key.
let cachedClient: Stripe | null = null

export function getStripe(): Stripe {
    if (!cachedClient) {
        const apiKey = process.env.STRIPE_SECRET_KEY
        if (!apiKey) {
            throw new Error('STRIPE_SECRET_KEY is not set')
        }
        cachedClient = new Stripe(apiKey, {
            apiVersion: '2026-05-27.dahlia',
        })
    }
    return cachedClient
}

// Checkout can invent a product inline from `product_data`, but swapping the
// price on an existing subscription can't — subscription items need a real
// product ID. Stripe lets you choose that ID at creation time, so each tier
// gets a deterministic one and we look it up (creating it once, on first use)
// rather than making anyone set products up in the dashboard by hand.
//
// Deliberately not using products.search() for this: the search index lags
// writes by up to a minute, which would happily create duplicate products for
// two upgrades in quick succession.
export async function getTierProductId(tier: 'starter' | 'growth' | 'pro'): Promise<string> {
    const stripe = getStripe()
    const productId = `relode_${tier}`
    const name = `Relode — ${SELF_SERVE_TIERS[tier].name} Plan`

    try {
        await stripe.products.retrieve(productId)
    } catch (error) {
        if ((error as Stripe.errors.StripeError)?.code !== 'resource_missing') {
            throw error
        }
        await stripe.products.create({ id: productId, name })
    }

    return productId
}
