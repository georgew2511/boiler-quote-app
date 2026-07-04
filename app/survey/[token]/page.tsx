import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import SurveyWizard from '@/components/surveyor/survey/SurveyWizard'
import { mapSupabaseBoiler } from '@/lib/surveyor/types'
import type { Boiler, PricingItem } from '@/lib/surveyor/types'

export default async function PublicSurveyPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const supabase = createAdminClient()

    // Resolve surveyor from token
    const { data: surveyor } = await supabase
        .from('surveyors')
        .select('id, name, company_id, active')
        .eq('token', token)
        .maybeSingle()

    if (!surveyor || !surveyor.active) notFound()

    const companyId = surveyor.company_id

    const [{ data: rawBoilers }, { data: rawPricing }, { data: rawSettings }] = await Promise.all([
        supabase
            .from('boilers')
            .select('id, name, manufacturer, output, tier, category, price, warranty, image, status')
            .eq('company_id', companyId)
            .eq('status', 'Active'),
        supabase
            .from('surveyor_pricing_items')
            .select('id, category, name, key, price, unit, active')
            .eq('company_id', companyId)
            .eq('active', true),
        supabase
            .from('company_settings')
            .select('vat_registered, company_name, logo_url, primary_colour')
            .eq('company_id', companyId)
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

    if (pricingItems.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                    <p className="text-sm font-semibold text-amber-800">Survey tool not set up</p>
                    <p className="mt-2 text-sm text-amber-700">
                        Pricing items have not been seeded for this company. Ask your administrator to complete the setup.
                    </p>
                </div>
            </div>
        )
    }

    const companyName = rawSettings?.company_name ?? 'Your Company'
    const logoUrl = rawSettings?.logo_url ?? null
    const primaryColour = rawSettings?.primary_colour ?? '#1d4ed8'

    return (
        <SurveyWizard
            boilers={boilers}
            pricingItems={pricingItems}
            companyId={companyId}
            surveyorId={surveyor.id}
            surveyorName={surveyor.name}
            vatRegistered={!!rawSettings?.vat_registered}
            companyName={companyName}
            logoUrl={logoUrl}
            primaryColour={primaryColour}
        />
    )
}
