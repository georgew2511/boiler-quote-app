import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getEntitledTier } from '@/lib/subscriptionTiers'

// Public, unauthenticated: the quote calculator is embedded on customers'
// own websites via ?company_id=, so it has no session to authenticate with.
// Deliberately returns only the two booleans the calculator branches on —
// never the tier name, price, status or anything else billing-related.
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')

    if (!companyId) {
        return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: company, error } = await supabase
        .from('companies')
        .select('id, subscription_tier, subscription_status')
        .eq('id', companyId)
        .maybeSingle()

    if (error) {
        console.error('Failed to load company features:', error.message)
        return NextResponse.json({ error: 'Failed to load features' }, { status: 500 })
    }

    const tier = getEntitledTier(company ?? {})

    return NextResponse.json({
        surveyBooking: tier?.features.surveyBooking ?? false,
        photoSurveys: tier?.features.photoSurveys ?? false,
    })
}
