import Stripe from 'stripe'

// Requires STRIPE_SECRET_KEY in env vars — from the Stripe dashboard under
// Developers > API keys. Use the test key while building, swap to the live
// key when ready to actually take payments.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-05-27.dahlia',
})
