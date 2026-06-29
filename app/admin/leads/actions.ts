'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

export async function updateLeadStage(
    leadId: number,
    stage: string,
    lostReason?: string
) {
    const company = await getCurrentCompany()
    const supabase = await createClient()

    const update: Record<string, any> = {
        pipeline_stage: stage,
        last_updated: new Date().toISOString(),
    }

    if (stage === 'Lost') {
        update.lost_reason = lostReason || null
    } else {
        update.lost_reason = null
    }

    const { error } = await supabase
        .from('leads')
        .update(update)
        .eq('id', leadId)
        .eq('company_id', company.id)

    if (error) {
        throw new Error(`Failed to update lead stage: ${error.message}`)
    }

    revalidatePath('/admin/leads')
    revalidatePath(`/admin/leads/${leadId}`)
}

export async function saveLeadNotesAndSource(leadId: number, notes: string) {
    const company = await getCurrentCompany()
    const supabase = await createClient()

    const { error } = await supabase
        .from('leads')
        .update({
            notes,
            last_updated: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('company_id', company.id)

    if (error) {
        throw new Error(`Failed to save notes: ${error.message}`)
    }

    revalidatePath(`/admin/leads/${leadId}`)
}
