'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function UpgradeButton({
    companyId,
    tier,
    label,
    isCurrent,
    // Set for plans below the one they're on. These render as an inert
    // "Included in your plan" chip — truthful, since every tier is a superset
    // of the ones beneath it, and it keeps the card from looking like a
    // button that's broken.
    isIncluded = false,
}: {
    companyId: string
    tier: 'starter' | 'growth' | 'pro'
    label: string
    isCurrent: boolean
    isIncluded?: boolean
}) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleClick() {
        setLoading(true)
        try {
            const response = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_id: companyId, tier }),
            })
            const data = await response.json()

            if (data.url) {
                // New subscription — off to Stripe Checkout to take a card.
                window.location.href = data.url
            } else if (data.upgraded) {
                // Existing subscriber: the swap already happened on the card
                // Stripe holds, so there's nothing to redirect to.
                router.refresh()
                setLoading(false)
            } else {
                alert(data.error || 'Failed to change plan')
                setLoading(false)
            }
        } catch {
            alert('Failed to change plan')
            setLoading(false)
        }
    }

    if (isIncluded) {
        return (
            <div className="mt-6 w-full rounded-xl bg-slate-50 py-3 text-center font-semibold text-slate-400">
                Included in your plan
            </div>
        )
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading || isCurrent}
            className={`mt-6 w-full rounded-xl py-3 font-semibold transition-colors disabled:cursor-not-allowed ${isCurrent
                ? 'bg-slate-100 text-slate-400'
                : 'bg-[var(--brand,#16a34a)] text-white hover:opacity-90'
                }`}
        >
            {isCurrent ? 'Current Plan' : loading ? 'Working...' : label}
        </button>
    )
}

export function ManageBillingButton({ companyId }: { companyId: string }) {
    const [loading, setLoading] = useState(false)

    async function handleClick() {
        setLoading(true)
        try {
            const response = await fetch('/api/billing/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_id: companyId }),
            })
            const data = await response.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                alert(data.error || 'Failed to open billing portal')
                setLoading(false)
            }
        } catch {
            alert('Failed to open billing portal')
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
        >
            {loading ? 'Opening...' : 'Manage Billing & Invoices'}
        </button>
    )
}
