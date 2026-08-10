import { SUPER_ADMIN_COMPANY_ID } from './superAdmin'

// Single source of truth for plan pricing, lead caps and feature access,
// matching the public pricing page on the marketing site. Keep these in sync
// if pricing changes.
export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'grandfathered'

// Everything the plan tiers actually gate. Named after what the marketing site
// calls them so the two stay comparable at a glance:
//   analytics      → "Business insights & analytics"   (Growth)
//   surveyBooking  → "Self-service survey booking"     (Growth)
//   photoSurveys   → "Photo surveys"                   (Growth)
//   branding       → "Branding & colour customisation" (Pro)
// Starter's "Online survey requests" is not a flag — every tier can take a
// survey request; Growth is what lets the customer pick their own slot.
export type FeatureKey = 'analytics' | 'surveyBooking' | 'photoSurveys' | 'branding'

export interface TierDefinition {
    id: SubscriptionTier
    name: string
    priceMonthlyPence: number
    leadLimit: number | null // null = unlimited
    // Higher rank = more expensive plan. Used to tell an upgrade (self-serve,
    // one click) from a downgrade (not self-serve).
    rank: number
    features: Record<FeatureKey, boolean>
    // "Multiple engineer diaries" is a Pro line item, so lower tiers get one
    // surveyor. null = unlimited.
    surveyorLimit: number | null
    // Word-for-word the bullets on the public pricing page, so what a company
    // sees before signing up is what they see inside the app.
    highlights: string[]
}

// Length of the free trial attached to a new subscription at checkout. Stripe
// owns the countdown from there — it holds the subscription in `trialing` and
// raises the first invoice automatically the day the trial ends.
export const TRIAL_DAYS = 14

export const SELF_SERVE_TIERS: Record<'starter' | 'growth' | 'pro', TierDefinition> = {
    starter: {
        id: 'starter',
        name: 'Starter',
        priceMonthlyPence: 2900,
        leadLimit: 30,
        rank: 1,
        features: { analytics: false, surveyBooking: false, photoSurveys: false, branding: false },
        surveyorLimit: 1,
        highlights: [
            'Instant online boiler quotes',
            'Online survey requests',
            'Lead pipeline & CRM',
            'Unlimited staff logins',
        ],
    },
    growth: {
        id: 'growth',
        name: 'Growth',
        priceMonthlyPence: 4900,
        leadLimit: 75,
        rank: 2,
        features: { analytics: true, surveyBooking: true, photoSurveys: true, branding: false },
        surveyorLimit: 1,
        highlights: [
            'Everything in Starter',
            'Self-service survey booking',
            'Photo surveys',
            'Business insights & analytics',
            'Priority support',
        ],
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        priceMonthlyPence: 7900,
        leadLimit: 200,
        rank: 3,
        features: { analytics: true, surveyBooking: true, photoSurveys: true, branding: true },
        surveyorLimit: null,
        highlights: [
            'Everything in Growth',
            'Multiple engineer diaries',
            'Branding & colour customisation',
            'Priority support',
        ],
    },
}

// Legacy companies that existed before billing was wired up — unlimited
// leads, no Stripe subscription required, set manually via SQL migration.
// Ranked above every paid tier so nothing reads as an upgrade for them.
export const GRANDFATHERED_TIER: TierDefinition = {
    id: 'grandfathered',
    name: 'Legacy (Free)',
    priceMonthlyPence: 0,
    leadLimit: null,
    rank: 99,
    features: { analytics: true, surveyBooking: true, photoSurveys: true, branding: true },
    surveyorLimit: null,
    highlights: ['Everything, unlimited'],
}

export function getTierDefinition(tier: string | null | undefined): TierDefinition {
    if (tier === 'starter' || tier === 'growth' || tier === 'pro') {
        return SELF_SERVE_TIERS[tier]
    }
    return GRANDFATHERED_TIER
}

// The tier a company's access should actually be computed from. A company with
// no live subscription has no tier at all — callers that gate features should
// treat a null here as "no access", not as a free-for-all.
export function getEntitledTier(company: {
    id?: string | null
    subscription_tier?: string | null
    subscription_status?: string | null
}): TierDefinition | null {
    // The super-admin account is never gated — it has to be able to see every
    // screen to support customers on any plan. Matches the lock-screen bypass
    // in app/admin/layout.tsx. Note this is the *effective* company, so while
    // impersonating, the impersonated company's own plan applies.
    if (company.id && company.id === SUPER_ADMIN_COMPANY_ID) return GRANDFATHERED_TIER

    const live = company.subscription_status === 'active' || company.subscription_status === 'trial'
    if (company.subscription_tier === 'grandfathered') return GRANDFATHERED_TIER
    if (!live) return null
    if (
        company.subscription_tier === 'starter' ||
        company.subscription_tier === 'growth' ||
        company.subscription_tier === 'pro'
    ) {
        return SELF_SERVE_TIERS[company.subscription_tier]
    }
    return null
}

export function hasFeature(
    company: { id?: string | null; subscription_tier?: string | null; subscription_status?: string | null },
    feature: FeatureKey
): boolean {
    return getEntitledTier(company)?.features[feature] ?? false
}
