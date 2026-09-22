'use server'

import { redirect } from 'next/navigation'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createAdminClient } from '@/utils/supabase/admin'
import { parseMarkupOverride } from '@/lib/boilerMarkup'
import type { ImportBoiler } from '@/lib/supplierImport'

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

const CATEGORIES = ['combi', 'system', 'regular']
const TIERS = ['Good', 'Better', 'Best']
// Stock photos must come from our own bucket, never an arbitrary URL.
const PHOTO_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/boiler-images/`

// Adds a boiler the owner found on a supplier quote but didn't have in their
// catalogue. The review screen then matches the quote line to it like any
// other boiler, so the price and the supplier alias are saved on "Update".
export async function addBoilerFromImport(formData: FormData): Promise<{ boiler: ImportBoiler } | { error: string }> {
    const company = await getCurrentCompany()
    const supabase = createAdminClient()

    const text = (key: string) => String(formData.get(key) ?? '').trim()
    const name = text('name')
    const manufacturer = text('manufacturer')
    const category = text('category')
    const tier = text('tier')
    const output = Number(formData.get('output'))
    const price = Number(formData.get('price'))
    const warranty = Number(formData.get('warranty'))

    if (!name || !manufacturer) return { error: 'Enter a name and manufacturer' }
    if (!CATEGORIES.includes(category)) return { error: 'Choose combi, system or regular' }
    if (!TIERS.includes(tier)) return { error: 'Choose a tier' }
    if (!(output > 0)) return { error: 'Enter the output in kW' }
    if (!(price > 0)) return { error: 'Enter a trade price' }
    if (!(warranty >= 0)) return { error: 'Enter the warranty in years' }

    const { data: sameName } = await supabase
        .from('boilers')
        .select('id')
        .eq('company_id', company.id)
        .ilike('name', name.replace(/[%_]/g, '\\$&'))
        .limit(1)
    if (sameName?.length) return { error: `You already have a boiler called "${name}". Pick it from the list instead.` }

    let image = ''
    const upload = formData.get('image')
    const photoUrl = text('image_url')
    if (upload instanceof File && upload.size > 0) {
        const ext = upload.type === 'image/png' ? 'png' : upload.type === 'image/jpeg' ? 'jpg' : 'webp'
        const fileName = `boilers/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
            .from('boiler-images')
            .upload(fileName, upload, { contentType: upload.type })
        if (uploadError) {
            console.error('addBoilerFromImport: image upload failed:', uploadError.message)
            return { error: 'The photo failed to upload. Try again, or add the boiler without one.' }
        }
        image = supabase.storage.from('boiler-images').getPublicUrl(fileName).data.publicUrl
    } else if (photoUrl.startsWith(PHOTO_PREFIX)) {
        image = photoUrl
    }

    const { data: boiler, error } = await supabase
        .from('boilers')
        .insert({
            company_id: company.id,
            name,
            manufacturer,
            category,
            tier,
            output,
            price: Math.round(price * 100) / 100,
            markup_percent: parseMarkupOverride(formData.get('markup_percent')),
            warranty,
            status: formData.get('active') === 'on' ? 'Active' : 'Inactive',
            image,
        })
        .select('id, name, manufacturer, output, category, price, markup_percent')
        .single()

    if (error || !boiler) {
        console.error('addBoilerFromImport: insert failed:', error?.message)
        return { error: 'The boiler could not be added. Try again.' }
    }

    return {
        boiler: {
            id: Number(boiler.id),
            name: boiler.name,
            manufacturer: boiler.manufacturer,
            output: Number(boiler.output),
            category: boiler.category,
            price: Number(boiler.price) || 0,
            markup_percent: boiler.markup_percent === null ? null : Number(boiler.markup_percent),
        },
    }
}
