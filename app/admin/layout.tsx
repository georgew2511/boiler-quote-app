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
