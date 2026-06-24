import Link from 'next/link'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { supabase } from '@/lib/supabase'
import { getTierDefinition } from '@/lib/subscriptionTiers'
import TrialLockScreen from './TrialLockScreen'
import SidebarNav from './SidebarNav'

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
        <div className="flex h-screen overflow-hidden bg-[#f5f7fb]">
            <aside className="flex h-screen w-72 flex-shrink-0 flex-col bg-slate-950 text-white">
                <div className="border-b border-slate-800 p-8">
                    {company.logo_url ? (
                        <img
                            src={company.logo_url}
                            alt={company.company_name}
                            className="h-16 w-full max-w-[180px] object-contain object-left"
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

                <nav className="admin-sidebar-nav flex flex-1 flex-col overflow-y-auto p-6">
                    <SidebarNav
                        serviceAddonEnabled={!!company.service_plans_addon}
                        isSuperAdmin={company.isSuperAdmin}
                    />
                </nav>

                <div className="relative mt-auto flex-shrink-0 border-t border-slate-800 bg-slate-950 p-6">
                    <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-b from-transparent to-slate-950" />
                    <img
                        src="/relode-logo-white.png"
                        alt="Relode"
                        className="mx-auto h-10 w-auto opacity-80"
                    />
                </div>
            </aside>

            <section className="min-w-0 flex-1 overflow-y-auto bg-[#f5f7fb]">
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
                <div className="p-6">
                    {children}
                </div>
            </section>
        </div>
    )
}
