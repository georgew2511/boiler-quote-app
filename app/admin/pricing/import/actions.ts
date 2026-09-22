'use server'

import { redirect } from 'next/navigation'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createAdminClient } from '@/utils/supabase/admin'

export interface ApprovedPrice {
    boilerId: number
    price: number
    supplierText: string
    aliasKey: string
}

// Writes the prices the owner ticked on the review screen and remembers each
// supplier line → boiler pairing so the next import from that merchant
// matches exactly. Every write is scoped to the caller's company.
export async function applySupplierPrices(approved: ApprovedPrice[]): Promise<{ error: string } | void> {
    const company = await getCurrentCompany()
    const supabase = createAdminClient()

    const valid = approved.filter((a) => Number.isFinite(a.price) && a.price > 0)

    const { data: owned } = await supabase
        .from('boilers')
        .select('id')
        .eq('company_id', company.id)
        .in('id', valid.map((a) => a.boilerId))
    const ownedIds = new Set((owned ?? []).map((b) => Number(b.id)))
    const updates = valid.filter((a) => ownedIds.has(a.boilerId))

    const results = await Promise.all(
        updates.map((a) =>
            supabase
                .from('boilers')
                .update({ price: Math.round(a.price * 100) / 100 })
                .eq('id', a.boilerId)
                .eq('company_id', company.id)
        )
    )
    const failed = results.filter((r) => r.error)
    if (failed.length) {
        console.error('applySupplierPrices: some updates failed:', failed.map((r) => r.error?.message))
        return { error: `${failed.length} of ${updates.length} prices failed to save. Try again.` }
    }

    // Best-effort: a missed alias only means the next import falls back to
    // fuzzy matching for that line.
    if (updates.length) {
        const { error } = await supabase.from('boiler_supplier_aliases').upsert(
            updates.map((a) => ({
                company_id: company.id,
                boiler_id: a.boilerId,
                match_key: a.aliasKey,
                supplier_text: a.supplierText,
            })),
            { onConflict: 'company_id,match_key' }
        )
        if (error) console.error('applySupplierPrices: failed to save aliases:', error.message)
    }

    redirect(`/admin/pricing?tab=boilers&imported=${updates.length}`)
}
