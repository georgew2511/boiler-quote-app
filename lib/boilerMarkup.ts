import type { SupabaseClient } from '@supabase/supabase-js'

// boilers.price is the TRADE price. What the customer pays for the boiler
// itself (before surcharges and VAT) is that trade price marked up by the
// boiler's own markup_percent, or the company-wide BOILER margin when the
// boiler has no override. Every place that turns a trade price into a
// customer-facing price goes through here so the calculator, the surveyor
// tool and the admin screens can't drift apart.

/** Markup % for one boiler: its own override if set, else the company default. */
export function effectiveBoilerMarkup(
    boilerMarkup: number | string | null | undefined,
    companyDefault: number,
): number {
    if (boilerMarkup === null || boilerMarkup === undefined || boilerMarkup === '') {
        return companyDefault
    }
    const pct = Number(boilerMarkup)
    return Number.isFinite(pct) ? pct : companyDefault
}

/** Trade price marked up by a percentage, rounded to the penny. */
export function applyBoilerMarkup(tradePrice: number, markupPercent: number): number {
    if (!markupPercent) return tradePrice
    return Math.round(tradePrice * (1 + markupPercent / 100) * 100) / 100
}

/**
 * The company-wide boiler markup. Stored as the BOILER row of
 * surveyor_category_margins so the Surveyor Pricing page and the Pricing page
 * edit the same number. 0 if unset or the lookup fails.
 */
export async function loadDefaultBoilerMarkup(
    supabase: SupabaseClient,
    companyId: string,
): Promise<number> {
    const { data, error } = await supabase
        .from('surveyor_category_margins')
        .select('margin_percent')
        .eq('company_id', companyId)
        .eq('category', 'BOILER')
        .maybeSingle()

    if (error) {
        console.error('loadDefaultBoilerMarkup failed:', error.message)
        return 0
    }
    return Number(data?.margin_percent) || 0
}

export async function saveDefaultBoilerMarkup(
    supabase: SupabaseClient,
    companyId: string,
    percent: number,
) {
    const { error } = await supabase
        .from('surveyor_category_margins')
        .upsert(
            { company_id: companyId, category: 'BOILER', margin_percent: Math.max(0, percent) || 0 },
            { onConflict: 'company_id,category' },
        )
    if (error) console.error('saveDefaultBoilerMarkup failed:', error.message)
}

/**
 * Parses a markup override field from a form. Blank means "no override"
 * (null, so the boiler follows the company default); anything else is a
 * non-negative percentage.
 */
export function parseMarkupOverride(value: FormDataEntryValue | null): number | null {
    if (typeof value !== 'string' || value.trim() === '') return null
    const pct = Number(value)
    return Number.isFinite(pct) ? Math.max(0, pct) : null
}
