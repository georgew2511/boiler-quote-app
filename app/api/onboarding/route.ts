import { NextRequest, NextResponse } from 'next/server'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createAdminClient } from '@/utils/supabase/admin'
import { ONBOARDING_STEPS } from '@/lib/onboardingSteps'

export async function POST(req: NextRequest) {
    try {
        const company = await getCurrentCompany()
        const { step, dismissed } = await req.json()

        const update: { onboarding_step?: number; onboarding_dismissed?: boolean } = {}

        if (typeof step === 'number') {
            update.onboarding_step = Math.max(0, Math.min(step, ONBOARDING_STEPS.length))
        }

        if (typeof dismissed === 'boolean') {
            update.onboarding_dismissed = dismissed
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const { error } = await supabase
            .from('companies')
            .update(update)
            .eq('id', company.id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('onboarding update failed:', error)
        return NextResponse.json({ error: 'Failed to update onboarding progress' }, { status: 500 })
    }
}
