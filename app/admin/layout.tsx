import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createClient } from '@/utils/supabase/server'
import { getTierDefinition } from '@/lib/subscriptionTiers'
import TrialLockScreen from './TrialLockScreen'
import AdminChrome from './AdminChrome'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const company = await getCurrentCompany()

    // Hard lock by default: access requires either a live paid subscription or
    // an unexpired trial, and nothing else counts. Written as an allowlist
    // deliberately — the old version only locked on three known-bad statuses,
    // so a company with no subscription at all (trial_ends_at still null) fell
    // through every branch and got the dashboard for free. Grandfathered legacy
    // companies and the super-admin account itself are never locked.
    const hasActivePaidPlan =
        ['starter', 'growth', 'pro'].includes(company.subscription_tier || '') &&
        company.subscription_status === 'active'
    const isGrandfathered = company.subscription_tier === 'grandfathered'
    const trialExpired = !!company.trial_ends_at && new Date(company.trial_ends_at) < new Date()
    const inActiveTrial = company.subscription_status === 'trial' && !trialExpired

    let lockReason: 'no_subscription' | 'trial_ended' | 'past_due' | 'cancelled' | null = null

    if (!company.isSuperAdmin && !isGrandfathered && !hasActivePaidPlan && !inActiveTrial) {
        if (company.subscription_status === 'past_due') {
            lockReason = 'past_due'
        } else if (company.subscription_status === 'cancelled') {
            lockReason = 'cancelled'
        } else if (trialExpired) {
            lockReason = 'trial_ended'
        } else {
            // Never subscribed — a fresh signup arriving for the first time.
            lockReason = 'no_subscription'
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
        const supabase = await createClient()
        const { count } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .gte('created_at', periodStart)

        overCap = (count || 0) > tier.leadLimit
    }

    return (
        <AdminChrome
            companyName={company.company_name}
            logoUrl={company.logo_url}
            logoSize={company.logo_size}
            serviceAddonEnabled={!!company.service_plans_addon}
            isSuperAdmin={company.isSuperAdmin}
            isImpersonating={company.isImpersonating}
            overCap={overCap}
            tierName={tier.name}
            onboardingStep={company.onboarding_step ?? 0}
            onboardingDismissed={!!company.onboarding_dismissed}
        >
            {children}
        </AdminChrome>
    )
}
