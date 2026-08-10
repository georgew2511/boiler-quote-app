import Link from 'next/link'
import { SELF_SERVE_TIERS, type FeatureKey } from '@/lib/subscriptionTiers'

// Shown in place of a feature the company's plan doesn't include. Names the
// cheapest plan that unlocks it and links straight to Billing, where upgrading
// is one click on the card already on file.
export default function FeatureLock({
    feature,
    title,
    blurb,
}: {
    feature: FeatureKey
    title: string
    blurb: string
}) {
    const requiredTier =
        Object.values(SELF_SERVE_TIERS)
            .sort((a, b) => a.rank - b.rank)
            .find((tier) => tier.features[feature]) ?? SELF_SERVE_TIERS.pro

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-3xl">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        ← Admin Panel
                    </Link>
                    <h1 className="text-4xl font-bold">{title}</h1>
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="text-sm font-medium uppercase tracking-wide text-blue-600">
                        {requiredTier.name} plan
                    </div>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                        {title} is part of {requiredTier.name}
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-slate-600">{blurb}</p>

                    <Link
                        href="/admin/billing"
                        className="mt-6 inline-flex rounded-xl bg-[var(--brand,#16a34a)] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        Upgrade to {requiredTier.name} — £{(requiredTier.priceMonthlyPence / 100).toFixed(0)}/month
                    </Link>

                    <p className="mt-3 text-xs text-slate-400">
                        Takes effect immediately. No re-entering card details.
                    </p>
                </div>
            </div>
        </main>
    )
}
