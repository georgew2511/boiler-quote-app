import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createAdminClient } from '@/utils/supabase/admin'

// Human-readable labels + display order for the surveyor pricing categories.
// Keys match the `category` column on surveyor_pricing_items (see the seed in
// app/api/surveyor/pricing/route.ts and lib/surveyor/pricing.ts).
const CATEGORY_LABELS: Record<string, string> = {
    LABOUR: 'Labour',
    FLUE: 'Flue',
    CYLINDER: 'Cylinder',
    SYSTEM: 'System Components',
    CONTROLS: 'Controls',
    FILTER: 'Magnetic Filters',
    GAS: 'Gas',
    COPPER: 'Copper Pipe',
    FITTINGS: 'Fittings Packs',
    LAGGING: 'Lagging',
    RAD_VALVES: 'Radiator Valves',
    RADIATORS: 'Radiators',
    CLEAN: 'System Cleanse',
    ELECTRICAL: 'Electrical',
    CONDENSATE: 'Condensate',
    INHIBITOR: 'Inhibitor',
}

const CATEGORY_ORDER = [
    'LABOUR',
    'FLUE',
    'CYLINDER',
    'SYSTEM',
    'CONTROLS',
    'FILTER',
    'GAS',
    'COPPER',
    'FITTINGS',
    'LAGGING',
    'RAD_VALVES',
    'RADIATORS',
    'CLEAN',
    'ELECTRICAL',
    'CONDENSATE',
    'INHIBITOR',
]

interface PricingRow {
    id: string
    category: string
    name: string
    key: string
    price: number
    unit: string
    active: boolean
}

export default async function SurveyorPricingPage({
    searchParams,
}: {
    searchParams: Promise<{ saved?: string }>
}) {
    const { saved } = await searchParams
    const company = await getCurrentCompany()
    // surveyor_pricing_items has owner-only RLS, but the surveyor tool is used by
    // team members too, so we read/write with the admin client scoped to the
    // company (mirrors app/admin/survey/page.tsx).
    const supabase = createAdminClient()

    const { data: companySettings } = await supabase
        .from('company_settings')
        .select('vat_registered')
        .eq('company_id', company.id)
        .maybeSingle()

    const vatRegistered = !!companySettings?.vat_registered

    const { data: rawPricing, error } = await supabase
        .from('surveyor_pricing_items')
        .select('id, category, name, key, price, unit, active')
        .eq('company_id', company.id)
        .order('category')
        .order('name')

    if (error) console.error(error)

    const pricing: PricingRow[] = (rawPricing ?? []).map((r: any) => ({
        id: r.id,
        category: r.category,
        name: r.name,
        key: r.key,
        price: Number(r.price),
        unit: r.unit,
        active: r.active,
    }))

    async function savePricing(formData: FormData) {
        'use server'
        const supabase = createAdminClient()
        const company = await getCurrentCompany()

        const ids = formData.getAll('item_id').map((v) => v.toString())

        await Promise.all(
            ids.map((id) =>
                supabase
                    .from('surveyor_pricing_items')
                    .update({
                        price: Number(formData.get(`price_${id}`) ?? 0),
                        active: formData.get(`active_${id}`) === 'on',
                    })
                    .eq('id', id)
                    .eq('company_id', company.id),
            ),
        )

        redirect('/admin/surveyor-pricing?saved=1')
    }

    // Group rows by category, preserving CATEGORY_ORDER then any unknown ones.
    const byCategory = pricing.reduce<Record<string, PricingRow[]>>((acc, row) => {
        ;(acc[row.category] ??= []).push(row)
        return acc
    }, {})
    const orderedCategories = [
        ...CATEGORY_ORDER.filter((c) => byCategory[c]),
        ...Object.keys(byCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
    ]

    const hasPricing = pricing.length > 0

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-7xl">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        ← Admin Panel
                    </Link>

                    <div>
                        <h1 className="text-4xl font-bold">Surveyor Pricing</h1>
                        <p className="mt-2 text-gray-600">
                            The price of every item a surveyor can add during an on-site survey. These feed the
                            line-by-line totals on{' '}
                            <Link href="/admin/survey" className="text-blue-600 hover:underline">
                                New Survey Quote
                            </Link>
                            .
                        </p>
                    </div>
                </div>

                {saved && (
                    <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">
                        Pricing saved.
                    </div>
                )}

                <div className="mt-4 rounded-2xl bg-blue-50 px-5 py-3 text-sm text-blue-800">
                    All prices below are entered <strong>excluding VAT</strong>.{' '}
                    {vatRegistered
                        ? 'Your company is set to VAT registered, so 20% VAT is added on top when the quote is shown to the customer.'
                        : 'Your company is set to not VAT registered, so customers see these prices exactly as entered.'}{' '}
                    Change this in{' '}
                    <Link href="/admin/settings" className="underline">
                        Settings → VAT
                    </Link>
                    . Untick an item to hide it from the surveyor tool without deleting its price.
                </div>

                {!hasPricing && (
                    <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                        <h2 className="mb-1 text-lg font-semibold text-amber-800">No pricing items yet</h2>
                        <p className="mb-4 text-sm text-amber-700">
                            Load the full default price list to get started. You can then edit every item below.
                        </p>
                        <form action="/api/surveyor/pricing" method="POST">
                            <input type="hidden" name="company_id" value={company.id} />
                            <button
                                type="submit"
                                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                            >
                                Load default pricing
                            </button>
                        </form>
                    </div>
                )}

                {hasPricing && (
                    <form action={savePricing} className="mt-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Missing an item that was recently added? Use{' '}
                                <span className="font-medium">Restore missing defaults</span> below — it adds any new
                                default items without overwriting the prices you&apos;ve set.
                            </p>
                            <button className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md">
                                Save Changes
                            </button>
                        </div>

                        {orderedCategories.map((category) => (
                            <div key={category} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="mb-4 text-lg font-bold text-slate-800">
                                    {CATEGORY_LABELS[category] || category}
                                </h2>
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                                            <th className="pb-3 font-medium">Item</th>
                                            <th className="pb-3 font-medium">Unit</th>
                                            <th className="pb-3 text-right font-medium">Price (£)</th>
                                            <th className="pb-3 pl-4 text-center font-medium">Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {byCategory[category].map((item) => (
                                            <tr
                                                key={item.id}
                                                className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="py-3 font-medium text-slate-700">{item.name}</td>
                                                <td className="py-3 text-slate-500">{item.unit}</td>
                                                <td className="py-3 text-right">
                                                    <input type="hidden" name="item_id" value={item.id} />
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        defaultValue={item.price}
                                                        name={`price_${item.id}`}
                                                        className="w-36 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-right shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                    />
                                                </td>
                                                <td className="py-3 pl-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        defaultChecked={item.active}
                                                        name={`active_${item.id}`}
                                                        className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}

                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}

                {hasPricing && (
                    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-800">Restore missing defaults</h2>
                        <p className="mt-1 mb-4 text-sm text-gray-500">
                            Adds any default items that aren&apos;t in your list yet. Existing items and their prices are
                            left untouched.
                        </p>
                        <form action="/api/surveyor/pricing" method="POST">
                            <input type="hidden" name="company_id" value={company.id} />
                            <button
                                type="submit"
                                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                            >
                                Restore missing defaults
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </main>
    )
}
