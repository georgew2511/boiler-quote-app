import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createAdminClient } from '@/utils/supabase/admin'
import { MARGIN_CATEGORIES, loadCategoryMargins } from '@/lib/surveyor/margins'

// Human-readable labels + display order for the surveyor pricing categories.
// Keys match the `category` column on surveyor_pricing_items (see the seed in
// app/api/surveyor/pricing/route.ts and lib/surveyor/pricing.ts).
const CATEGORY_LABELS: Record<string, string> = {
    BOILER: 'Boiler',
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
    searchParams: Promise<{ saved?: string; error?: string }>
}) {
    const { saved, error: saveError } = await searchParams
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

    // Per-category margin percentages, applied on top of the cost prices below
    // when a surveyor builds a quote. `margins[category]` is undefined until set.
    const margins = await loadCategoryMargins(supabase, company.id)

    const pricing: PricingRow[] = (rawPricing ?? []).map((r: any) => ({
        id: r.id,
        category: r.category,
        name: r.name,
        key: r.key,
        price: Number(r.price),
        unit: r.unit,
        active: r.active,
    }))

    async function addPricingItem(formData: FormData) {
        'use server'
        const supabase = createAdminClient()
        const admin = await getCurrentCompany()

        // Server-side gate — the UI already hides this form from everyone
        // else, but a submitted form action must never trust that alone.
        if (!admin.isPlatformAdmin) {
            throw new Error('Only the platform admin can add new pricing items.')
        }

        const category = (formData.get('new_category')?.toString() || '').trim().toUpperCase()
        const name = (formData.get('new_name')?.toString() || '').trim()
        const key = (formData.get('new_key')?.toString() || '').trim().toLowerCase()
        const unit = (formData.get('new_unit')?.toString() || 'each').trim()
        const price = Number(formData.get('new_price') ?? 0) || 0

        if (!category || !name || !key) {
            redirect('/admin/surveyor-pricing?error=missing_fields')
        }

        const { error: masterError } = await supabase.from('surveyor_pricing_master_items').insert({
            category,
            name,
            key,
            price,
            unit,
            created_by: admin.userId,
        })
        if (masterError) {
            console.error('Failed to save master pricing item:', masterError.message)
            redirect('/admin/surveyor-pricing?error=save_failed')
        }

        // Roll the new item out to every company so it appears in everyone's
        // pricing editor and quote calculator, each with its own editable price.
        const { data: allCompanies, error: companiesError } = await supabase.from('companies').select('id')
        if (companiesError) console.error('Failed to load companies for rollout:', companiesError.message)

        const rows = (allCompanies ?? []).map((c: { id: string }) => ({
            company_id: c.id,
            category,
            name,
            key,
            price,
            unit,
            active: true,
        }))

        if (rows.length > 0) {
            const { error: rolloutError } = await supabase
                .from('surveyor_pricing_items')
                .upsert(rows, { onConflict: 'company_id,key', ignoreDuplicates: true })
            if (rolloutError) console.error('Failed to roll out new pricing item:', rolloutError.message)
        }

        redirect('/admin/surveyor-pricing?saved=1')
    }

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

        // Persist per-category margin percentages. Missing/blank fields save as 0.
        const marginRows = MARGIN_CATEGORIES.map((category) => ({
            company_id: company.id,
            category,
            margin_percent: Math.max(0, Number(formData.get(`margin_${category}`) ?? 0) || 0),
        }))
        const { error: marginError } = await supabase
            .from('surveyor_category_margins')
            .upsert(marginRows, { onConflict: 'company_id,category' })
        if (marginError) console.error('Failed to save margins:', marginError.message)

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

                {saveError === 'missing_fields' && (
                    <div className="mt-6 rounded-2xl bg-red-50 px-5 py-3 text-sm font-medium text-red-800">
                        Category, item name, and key are all required to add a new pricing item.
                    </div>
                )}

                {saveError === 'save_failed' && (
                    <div className="mt-6 rounded-2xl bg-red-50 px-5 py-3 text-sm font-medium text-red-800">
                        Couldn&apos;t save that pricing item — the key may already be in use. Check the console/logs
                        for details.
                    </div>
                )}

                {company.isPlatformAdmin && (
                    <div className="mt-6 rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-indigo-900">Add a new pricing item</h2>
                        <p className="mt-1 mb-4 text-sm text-indigo-800">
                            Only your account can do this. New items are rolled out to every company&apos;s pricing
                            editor and quote calculator immediately — each company then sets its own price.
                        </p>
                        <form action={addPricingItem} className="grid grid-cols-2 gap-4 md:grid-cols-6">
                            <label className="col-span-2 text-sm font-medium text-indigo-900 md:col-span-1">
                                Category
                                <input
                                    type="text"
                                    name="new_category"
                                    list="category-options"
                                    placeholder="GAS"
                                    className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    required
                                />
                                <datalist id="category-options">
                                    {Object.keys(CATEGORY_LABELS).map((c) => (
                                        <option key={c} value={c}>
                                            {CATEGORY_LABELS[c]}
                                        </option>
                                    ))}
                                </datalist>
                            </label>
                            <label className="col-span-2 text-sm font-medium text-indigo-900 md:col-span-2">
                                Item name
                                <input
                                    type="text"
                                    name="new_name"
                                    placeholder="e.g. 15mm Gas Tee"
                                    className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    required
                                />
                            </label>
                            <label className="col-span-2 text-sm font-medium text-indigo-900 md:col-span-1">
                                Key
                                <input
                                    type="text"
                                    name="new_key"
                                    placeholder="gas_15mm_tee"
                                    className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    required
                                />
                            </label>
                            <label className="text-sm font-medium text-indigo-900">
                                Unit
                                <input
                                    type="text"
                                    name="new_unit"
                                    defaultValue="each"
                                    className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    required
                                />
                            </label>
                            <label className="text-sm font-medium text-indigo-900">
                                Default price (£)
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="new_price"
                                    defaultValue={0}
                                    className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                            </label>
                            <div className="col-span-2 flex items-end md:col-span-6">
                                <button
                                    type="submit"
                                    className="rounded-xl border border-indigo-700 bg-indigo-700 px-6 py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-indigo-800"
                                >
                                    Add item to every company
                                </button>
                            </div>
                        </form>
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

                <div className="mt-4 rounded-2xl bg-amber-50 px-5 py-3 text-sm text-amber-800">
                    <strong>Material margin.</strong> Enter the <strong>cost prices</strong> above, then set a{' '}
                    <strong>margin %</strong> per category to mark them up automatically on every surveyor quote. The
                    margin is applied before VAT and is baked into each line item — customers never see it as a separate
                    charge. Labour is never marked up. Leave a category at 0% to charge the cost price as-is.
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

                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Boiler</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Margin added to each boiler&apos;s trade price (set the trade prices in{' '}
                                        <Link href="/admin/boilers" className="text-blue-600 hover:underline">
                                            Boilers
                                        </Link>
                                        ).
                                    </p>
                                </div>
                                <MarginField category="BOILER" value={margins.BOILER} />
                            </div>
                        </div>

                        {orderedCategories.map((category) => (
                            <div key={category} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <h2 className="text-lg font-bold text-slate-800">
                                        {CATEGORY_LABELS[category] || category}
                                    </h2>
                                    {category !== 'LABOUR' && (
                                        <MarginField category={category} value={margins[category]} />
                                    )}
                                </div>
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

function MarginField({ category, value }: { category: string; value?: number }) {
    return (
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-600">
            Margin
            <span className="relative">
                <input
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={value ?? 0}
                    name={`margin_${category}`}
                    className="w-24 rounded-2xl border border-slate-300 bg-white py-2 pl-3 pr-7 text-right shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </span>
        </label>
    )
}
