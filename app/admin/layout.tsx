import Link from 'next/link'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { supabase } from '@/lib/supabase'
import { getTierDefinition } from '@/lib/subscriptionTiers'
import TrialLockScreen from './TrialLockScreen'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const company = await getCurrentCompany()

    // Hard lock: no active paid subscription and the 14-day trial has run
    // out (or a paid subscription lapsed/failed). Grandfathered legacy
    // companies and the super-admin account itself are never locked.
    const hasActivePaidPlan =
        ['starter', 'growth', 'pro'].includes(company.subscription_tier || '') &&
        company.subscription_status === 'active'
    const isGrandfathered = company.subscription_tier === 'grandfathered'
    const trialExpired = company.trial_ends_at && new Date(company.trial_ends_at) < new Date()

    let lockReason: 'trial_ended' | 'past_due' | 'cancelled' | null = null

    if (!company.isSuperAdmin && !isGrandfathered && !hasActivePaidPlan) {
        if (company.subscription_status === 'past_due') {
            lockReason = 'past_due'
        } else if (company.subscription_status === 'cancelled') {
            lockReason = 'cancelled'
        } else if (trialExpired) {
            lockReason = 'trial_ended'
        }
    }

    if (lockReason) {
        return (
            <TrialLockScreen
                companyId={company.id}
                companyName={company.company_name}
                reason={lockReason}
            />
        )
    }

    const tier = getTierDefinition(company.subscription_tier)
    let overCap = false

    if (tier.leadLimit !== null) {
        const periodStart = company.billing_period_start || company.created_at
        const { count } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .gte('created_at', periodStart)

        overCap = (count || 0) > tier.leadLimit
    }

    return (
        <div className="flex min-h-screen bg-[#f5f7fb]">
            <aside className="flex w-72 flex-col bg-slate-950 text-white">
                <div className="border-b border-slate-800 p-8">
                    {company.logo_url ? (
                        <img
                            src={company.logo_url}
                            alt={company.company_name}
                            className="h-16 w-auto"
                        />
                    ) : (
                        <h1 className="text-3xl font-bold">
                            {company.company_name}
                        </h1>
                    )}

                    <p className="mt-2 text-sm text-slate-400">
                        Admin Portal
                    </p>
                </div>

                <nav className="flex-1 space-y-2 p-6">
                    <Link
                        href="/admin"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Dashboard
                    </Link>

                    <Link
                        href="/admin/leads"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Leads
                    </Link>

                    <Link
                        href="/admin/boilers"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Boilers
                    </Link>

                    <Link
                        href="/admin/pricing"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Pricing
                    </Link>

                    <Link
                        href="/admin/service-plans"
                        className="flex items-center justify-between rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Service Plans
                        {!company.service_plans_addon && (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                                Add-on
                            </span>
                        )}
                    </Link>

                    <Link
                        href="/admin/test-quote"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Test Quote
                    </Link>

                    <Link
                        href="/admin/embed-code"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Embed Calculator
                    </Link>

                    <Link
                        href="/admin/settings"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Settings
                    </Link>

                    <Link
                        href="/admin/help"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Help &amp; Guide
                    </Link>

                    <Link
                        href="/admin/billing"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Billing &amp; Plan
                    </Link>

                    {company.isSuperAdmin && (
                        <Link
                            href="/admin/companies"
                            className="block rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-amber-300 transition hover:bg-amber-500/20"
                        >
                            All Companies
                        </Link>
                    )}
                </nav>

                <div className="mt-auto border-t border-slate-800 p-6">
                    <img
                        src="/relode-logo-white.png"
                        alt="Relode"
                        className="mx-auto h-10 w-auto opacity-80"
                    />
                </div>
            </aside>

            <section className="flex-1 bg-[#f5f7fb]">
                {company.isImpersonating && (
                    <div className="flex items-center justify-between bg-amber-500 px-6 py-3 text-sm font-medium text-amber-950">
                        <span>Viewing as {company.company_name} (logged in as platform admin)</span>
                        <Link href="/admin/companies" className="underline">
                            Switch company
                        </Link>
                    </div>
                )}
                {overCap && !company.isImpersonating && (
                    <div className="flex items-center justify-between bg-amber-100 px-6 py-3 text-sm font-medium text-amber-800">
                        <span>You've used more leads than your {tier.name} plan includes this month — your calculator keeps working as normal.</span>
                        <Link href="/admin/billing" className="underline">
                            View plans
                        </Link>
                    </div>
                )}
                <div className="min-h-screen p-6">
                    {children}
                </div>
            </section>
        </div>
    )
}
