// Single source of truth for plan pricing/lead caps, matching the public
// pricing page on the marketing site. Keep these in sync if pricing changes.
export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'grandfathered'

export interface TierDefinition {
    id: SubscriptionTier
    name: string
    priceMonthlyPence: number
    leadLimit: number | null // null = unlimited
}

export const SELF_SERVE_TIERS: Record<'starter' | 'growth' | 'pro', TierDefinition> = {
    starter: { id: 'starter', name: 'Starter', priceMonthlyPence: 2900, leadLimit: 30 },
    growth: { id: 'growth', name: 'Growth', priceMonthlyPence: 4900, leadLimit: 75 },
    pro: { id: 'pro', name: 'Pro', priceMonthlyPence: 7900, leadLimit: 200 },
}

// Legacy companies that existed before billing was wired up — unlimited
// leads, no Stripe subscription required, set manually via SQL migration.
export const GRANDFATHERED_TIER: TierDefinition = {
    id: 'grandfathered',
    name: 'Legacy (Free)',
    priceMonthlyPence: 0,
    leadLimit: null,
}

export function getTierDefinition(tier: string | null | undefined): TierDefinition {
    if (tier === 'starter' || tier === 'growth' || tier === 'pro') {
        return SELF_SERVE_TIERS[tier]
    }
    return GRANDFATHERED_TIER
}
