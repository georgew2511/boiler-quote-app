import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: NextRequest) {
    try {
        const { memberId, userId } = await req.json()
        if (!memberId || !userId) return NextResponse.json({ error: 'memberId and userId are required' }, { status: 400 })

        const supabase = createAdminClient()

        // Verify the invite exists and is unclaimed
        const { data: member } = await supabase
            .from('company_members')
            .select('id, accepted_at')
            .eq('id', memberId)
            .maybeSingle()

        if (!member) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
        if (member.accepted_at) return NextResponse.json({ error: 'Invite already claimed' }, { status: 409 })

        // Claim the invite
        const { error } = await supabase
            .from('company_members')
            .update({ user_id: userId, accepted_at: new Date().toISOString() })
            .eq('id', memberId)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'Failed to claim invite' }, { status: 500 })
    }
}
