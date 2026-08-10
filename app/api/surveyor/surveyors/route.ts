import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getAuthedCompanyId } from '@/lib/authedCompany'
import { getEntitledTier } from '@/lib/subscriptionTiers'

export async function GET() {
    const companyId = await getAuthedCompanyId()
    if (!companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('surveyors')
        .select('id, name, email, token, active, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
    const companyId = await getAuthedCompanyId()
    if (!companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email } = await req.json().catch(() => ({}))
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // "Multiple engineer diaries" is a Pro line item — lower plans get one
    // surveyor. Checked here rather than only in the UI because this endpoint
    // is reachable directly.
    const { data: company } = await supabase
        .from('companies')
        .select('id, subscription_tier, subscription_status')
        .eq('id', companyId)
        .maybeSingle()

    const entitledTier = getEntitledTier(company ?? {})

    if (!entitledTier) {
        return NextResponse.json({ error: 'No active subscription' }, { status: 403 })
    }

    const limit = entitledTier.surveyorLimit

    if (limit !== null) {
        const { count } = await supabase
            .from('surveyors')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)

        if ((count ?? 0) >= limit) {
            return NextResponse.json(
                {
                    error: `Your plan includes ${limit} surveyor${limit === 1 ? '' : 's'}. Upgrade to Pro to add more.`,
                    upgradeRequired: true,
                },
                { status: 403 }
            )
        }
    }

    const { data, error } = await supabase
        .from('surveyors')
        .insert({
            company_id: companyId,
            name: trimmedName,
            email: typeof email === 'string' && email.trim() ? email.trim() : null,
        })
        .select('id, name, email, token, active, created_at')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
