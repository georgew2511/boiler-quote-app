import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createAdminClient } from '@/utils/supabase/admin'
import SurveyWizard from '@/components/surveyor/survey/SurveyWizard'
import { mapSupabaseBoiler } from '@/lib/surveyor/types'
import type { Boiler, PricingItem } from '@/lib/surveyor/types'

export default async function SurveyPage() {
    const company = await getCurrentCompany()
    const supabase = createAdminClient()

    const [{ data: rawBoilers }, { data: rawPricing }, { data: rawSettings }] = await Promise.all([
        supabase
            .from('boilers')
            .select('id, name, manufacturer, output, tier, category, price, warranty, image, status')
            .eq('company_id', company.id)
            .eq('status', 'Active'),
        supabase
            .from('surveyor_pricing_items')
            .select('id, category, name, key, price, unit, active')
            .eq('company_id', company.id)
            .eq('active', true),
        supabase
            .from('company_settings')
            .select('vat_registered')
            .eq('company_id', company.id)
            .maybeSingle(),
    ])

    const boilers: Boiler[] = (rawBoilers ?? []).map(mapSupabaseBoiler)
    const pricingItems: PricingItem[] = (rawPricing ?? []).map((r: any) => ({
        id: r.id,
        category: r.category,
        name: r.name,
        key: r.key,
        price: Number(r.price),
        unit: r.unit,
        active: r.active,
    }))

    const hasPricing = pricingItems.length > 0

    return (
        <div>
            {!hasPricing && (
                <div className="mx-auto max-w-2xl p-6">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                        <h2 className="mb-1 text-sm font-semibold text-amber-800">No pricing items found</h2>
                        <p className="mb-3 text-sm text-amber-700">
                            You need to seed default pricing items before creating a survey quote.
                        </p>
                        <SeedPricingButton companyId={company.id} />
                    </div>
                </div>
            )}
            {hasPricing && (
                <SurveyWizard boilers={boilers} pricingItems={pricingItems} companyId={company.id} vatRegistered={!!rawSettings?.vat_registered} />
            )}
        </div>
    )
}

function SeedPricingButton({ companyId }: { companyId: string }) {
    return (
        <form action="/api/surveyor/pricing" method="POST">
            <input type="hidden" name="company_id" value={companyId} />
            <button
                type="submit"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
                Seed default pricing
            </button>
        </form>
    )
}
