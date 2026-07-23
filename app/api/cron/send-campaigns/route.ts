import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { executeCampaignSend } from '@/lib/campaigns'

// Triggered every 15 minutes by Vercel Cron (see vercel.json), same
// Authorization: Bearer ${CRON_SECRET} guard as /api/cron/inactivity-email.
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: dueCampaigns, error } = await adminClient
        .from('campaigns')
        .select('id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString())

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results: Array<{ campaign_id: string; sentCount?: number; error?: string }> = []

    for (const c of dueCampaigns || []) {
        try {
            const { sentCount } = await executeCampaignSend(c.id)
            results.push({ campaign_id: c.id, sentCount })
        } catch (err: any) {
            results.push({ campaign_id: c.id, error: err.message })
        }
    }

    return NextResponse.json({ due: dueCampaigns?.length || 0, results })
}
