'use client'

import { useState } from 'react'

export function UpgradeButton({
    companyId,
    tier,
    label,
    isCurrent,
}: {
    companyId: string
    tier: 'starter' | 'growth' | 'pro'
    label: string
    isCurrent: boolean
}) {
    const [loading, setLoading] = useState(false)

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
                window.location.href = data.url
            } else {
                alert(data.error || 'Failed to start checkout')
                setLoading(false)
            }
        } catch {
            alert('Failed to start checkout')
            setLoading(false)
        }
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
            {isCurrent ? 'Current Plan' : loading ? 'Redirecting...' : label}
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
