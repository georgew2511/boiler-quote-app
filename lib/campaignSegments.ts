import { createAdminClient } from '@/utils/supabase/admin'

export type CampaignSegment = 'all' | 'trial' | 'active' | 'past_due' | 'cancelled'

export const SEGMENT_LABELS: Record<CampaignSegment, string> = {
    all: 'All companies',
    trial: 'Trial',
    active: 'Active (paying)',
    past_due: 'Past due',
    cancelled: 'Cancelled',
}

export interface SegmentCompany {
    id: string
    company_name: string
    owner_user_id: string
    unsubscribe_token: string
}

// Companies eligible for a marketing send: matches the requested segment
// and hasn't unsubscribed. Mirrors the status filtering already used in
// the companies table (subscription_status breakdown).
export async function getSegmentCompanies(segment: CampaignSegment): Promise<SegmentCompany[]> {
    const adminClient = createAdminClient()

    let query = adminClient
        .from('companies')
        .select('id, company_name, owner_user_id, unsubscribe_token')
        .eq('marketing_unsubscribed', false)

    if (segment !== 'all') {
        query = query.eq('subscription_status', segment)
    }

    const { data, error } = await query

    if (error) {
        throw new Error(`Failed to resolve campaign segment: ${error.message}`)
    }

    return (data || []).filter((c) => !!c.owner_user_id)
}
