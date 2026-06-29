import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { getTierDefinition, SELF_SERVE_TIERS } from '@/lib/subscriptionTiers'
import { UpgradeButton, ManageBillingButton } from './BillingActions'

export default async function BillingPage({
    searchParams,
}: {
    searchParams: Promise<{ success?: string }>
}) {
    const { success } = await searchParams
    const company = await getCurrentCompany()
    const supabase = await createClient()

    const currentTier = getTierDefinition(company.subscription_tier)
    const periodStart = company.billing_period_start || company.created_at

    const { count: leadsThisPeriod } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .gte('created_at', periodStart)

    const used = leadsThisPeriod || 0
    const limit = currentTier.leadLimit
    const overCap = limit !== null && used > limit
    const nearCap = limit !== null && !overCap && used >= limit * 0.8

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-5xl">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        ← Admin Panel
                    </Link>
                    <div>
                        <h1 className="text-4xl font-bold">Billing &amp; Plan</h1>
                        <p className="text-sm text-gray-500">Manage your subscription and see how many leads you've used this month.</p>
                    </div>
                </div>

                {success && (
                    <div className="mt-6 rounded-2xl bg-green-50 px-5 py-3 text-sm text-green-800">
                        ✓ Subscription updated — thanks!
                    </div>
                )}

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="text-sm text-slate-500">Current Plan</div>
                            <div className="text-2xl font-bold">{currentTier.name}</div>
                        </div>
                        {company.stripe_customer_id && <ManageBillingButton companyId={company.id} />}
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">
                                Leads this month: <strong>{used}</strong>
                                {limit !== null ? ` / ${limit}` : ' (unlimited)'}
                            </span>
                            {overCap && <span className="font-semibold text-amber-600">Over your plan limit</span>}
                            {nearCap && !overCap && <span className="font-semibold text-amber-600">Approaching your limit</span>}
                        </div>

                        {limit !== null && (
                            <div className="mt-2 h-2 rounded-full bg-slate-100">
                                <div
                                    className={`h-2 rounded-full transition-all ${overCap ? 'bg-amber-500' : 'bg-[var(--brand,#16a34a)]'}`}
                                    style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                                />
                            </div>
                        )}

                        {overCap && (
                            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                You've gone over your plan's lead allowance — your calculator keeps working as
                                normal and nothing is cut off, but upgrading below keeps you comfortably within
                                your limit going forward.
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-8 grid gap-6 sm:grid-cols-3">
                    {Object.values(SELF_SERVE_TIERS).map((tier) => (
                        <div key={tier.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="text-sm font-medium text-slate-500 uppercase">{tier.name}</div>
                            <div className="mt-2 text-4xl font-bold">£{(tier.priceMonthlyPence / 100).toFixed(0)}</div>
                            <div className="text-sm text-slate-500">per month</div>
                            <div className="mt-2 text-sm text-slate-600">Up to {tier.leadLimit} leads/month</div>

                            <UpgradeButton
                                companyId={company.id}
                                tier={tier.id as 'starter' | 'growth' | 'pro'}
                                label={`Switch to ${tier.name}`}
                                isCurrent={company.subscription_tier === tier.id}
                            />
                        </div>
                    ))}
                </div>

                <p className="mt-6 text-center text-sm text-slate-400">
                    Need more than 200 leads/month or multiple engineer diaries? <Link href="/admin/help?section=support" className="underline">Get in touch</Link> about our Scale plan.
                </p>
            </div>
        </main>
    )
}
