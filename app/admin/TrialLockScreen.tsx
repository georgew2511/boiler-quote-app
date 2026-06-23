'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { SELF_SERVE_TIERS } from '@/lib/subscriptionTiers'
import { UpgradeButton } from './billing/BillingActions'

export default function TrialLockScreen({
    companyId,
    companyName,
    reason,
}: {
    companyId: string
    companyName: string
    reason: 'trial_ended' | 'past_due' | 'cancelled'
}) {
    const [signingOut, setSigningOut] = useState(false)
    const router = useRouter()

    async function handleSignOut() {
        setSigningOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
    }

    const heading =
        reason === 'trial_ended'
            ? 'Your 14-day free trial has ended'
            : reason === 'past_due'
                ? 'There was a problem with your last payment'
                : 'Your subscription has been cancelled'

    const subheading =
        reason === 'trial_ended'
            ? `Pick a plan to keep using ${companyName}'s dashboard, calculator and leads.`
            : 'Update your payment details or pick a plan to regain access.'

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-8">
            <div className="w-full max-w-4xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900">{heading}</h1>
                    <p className="mt-3 text-slate-600">{subheading}</p>
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-3">
                    {Object.values(SELF_SERVE_TIERS).map((tier) => (
                        <div key={tier.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="text-sm font-medium text-slate-500 uppercase">{tier.name}</div>
                            <div className="mt-2 text-4xl font-bold">£{(tier.priceMonthlyPence / 100).toFixed(0)}</div>
                            <div className="text-sm text-slate-500">per month</div>
                            <div className="mt-2 text-sm text-slate-600">Up to {tier.leadLimit} leads/month</div>

                            <UpgradeButton
                                companyId={companyId}
                                tier={tier.id as 'starter' | 'growth' | 'pro'}
                                label={`Choose ${tier.name}`}
                                isCurrent={false}
                            />
                        </div>
                    ))}
                </div>

                <p className="mt-8 text-center text-sm text-slate-400">
                    Need more than 200 leads/month? Get in touch about a Scale plan.
                </p>

                <div className="mt-6 text-center">
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="text-sm text-slate-400 underline hover:text-slate-600"
                    >
                        {signingOut ? 'Signing out...' : 'Log out'}
                    </button>
                </div>
            </div>
        </main>
    )
}
