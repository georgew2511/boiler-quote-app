'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { SELF_SERVE_TIERS, TRIAL_DAYS } from '@/lib/subscriptionTiers'
import { UpgradeButton } from './billing/BillingActions'

export default function TrialLockScreen({
    companyId,
    companyName,
    reason,
}: {
    companyId: string
    companyName: string
    reason: 'no_subscription' | 'trial_ended' | 'past_due' | 'cancelled'
}) {
    const [signingOut, setSigningOut] = useState(false)
    const router = useRouter()

    async function handleSignOut() {
        setSigningOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
    }

    const isTrialOffer = reason === 'no_subscription'

    const heading =
        reason === 'no_subscription'
            ? `Start your ${TRIAL_DAYS}-day free trial`
            : reason === 'trial_ended'
                ? `Your ${TRIAL_DAYS}-day free trial has ended`
                : reason === 'past_due'
                    ? 'There was a problem with your last payment'
                    : 'Your subscription has been cancelled'

    const subheading =
        reason === 'no_subscription'
            ? `Pick a plan to unlock ${companyName}'s dashboard, calculator and leads. You won't be charged today.`
            : reason === 'trial_ended'
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

                            {isTrialOffer && (
                                <div className="mt-2 text-sm font-medium text-blue-600">
                                    Free for {TRIAL_DAYS} days
                                </div>
                            )}

                            <ul className="mt-4 space-y-1.5 text-left text-sm text-slate-600">
                                {tier.highlights.map((line) => (
                                    <li key={line}>✓ {line}</li>
                                ))}
                            </ul>

                            <UpgradeButton
                                companyId={companyId}
                                tier={tier.id as 'starter' | 'growth' | 'pro'}
                                label={isTrialOffer ? `Start trial — ${tier.name}` : `Choose ${tier.name}`}
                                isCurrent={false}
                            />
                        </div>
                    ))}
                </div>

                {isTrialOffer && (
                    // Required disclosure for a card-up-front trial: the amount,
                    // the date, and how to get out of it, before they enter card
                    // details rather than after.
                    <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500">
                        We&apos;ll take your card details to start the trial, but you won&apos;t be charged
                        for {TRIAL_DAYS} days. We&apos;ll email you 3 days before the first payment, and you
                        can cancel any time from Billing — cancel before day {TRIAL_DAYS} and you pay nothing.
                    </p>
                )}

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
