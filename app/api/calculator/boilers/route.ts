import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { applyBoilerMarkup, effectiveBoilerMarkup, loadDefaultBoilerMarkup } from '@/lib/boilerMarkup'

// Active boilers for the public quote calculator, with `price` already turned
// into the customer's ex-VAT boiler price. Done server-side so the trade price
// and markup never reach the customer's browser; the calculator adds
// surcharges and VAT on top exactly as before.
export async function GET(request: NextRequest) {
    const companyId = request.nextUrl.searchParams.get('company_id')
    if (!companyId) {
        return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const loadBoilers = (columns: string) =>
        supabase.from('boilers').select(columns).eq('company_id', companyId).eq('status', 'Active')

    const [boilersResult, { data: company }, defaultMarkup] = await Promise.all([
        loadBoilers('id, name, manufacturer, tier, category, output, price, markup_percent, warranty, image, status'),
        supabase
            .from('companies')
            .select('calculator_applies_boiler_markup')
            .eq('id', companyId)
            .maybeSingle(),
        loadDefaultBoilerMarkup(supabase, companyId),
    ])

    // markup_percent is a newer column: if migration 20240116 hasn't been
    // applied yet, keep serving prices as entered rather than breaking the
    // calculator. (company is null in that case too, so no markup is applied.)
    const { data: boilers, error } =
        boilersResult.error?.code === '42703'
            ? await loadBoilers('id, name, manufacturer, tier, category, output, price, warranty, image, status')
            : boilersResult

    if (error) {
        console.error('calculator/boilers: failed to load boilers:', error.message)
        return NextResponse.json({ error: 'Failed to load boilers' }, { status: 500 })
    }

    // Companies that haven't confirmed their Boilers prices are trade prices
    // keep seeing them exactly as entered (see migration 20240116).
    const applyMarkup = !!company?.calculator_applies_boiler_markup

    const rows = (boilers ?? []) as unknown as Array<Record<string, unknown> & { price: unknown; markup_percent?: unknown }>
    const priced = rows
        .map(({ markup_percent, price, ...boiler }) => ({
            ...boiler,
            price: applyMarkup
                ? applyBoilerMarkup(Number(price) || 0, effectiveBoilerMarkup(markup_percent as number | null | undefined, defaultMarkup))
                : Number(price) || 0,
        }))
        .sort((a, b) => a.price - b.price)

    return NextResponse.json({ boilers: priced })
}
