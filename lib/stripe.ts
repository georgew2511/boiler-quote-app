import Stripe from 'stripe'

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
