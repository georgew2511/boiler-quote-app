import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { loadDefaultBoilerMarkup, parseMarkupOverride, saveDefaultBoilerMarkup } from '@/lib/boilerMarkup'
import BoilerPricesEditor from './BoilerPricesEditor'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { PRICING_CATEGORY_LABELS, PricingCategory } from '@/lib/pricingKeys'

export default async function PricingPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; imported?: string }>
}) {
    const { tab, imported } = await searchParams
    const activeTab = tab === 'surcharges' ? 'surcharges' : 'boilers'

    const company = await getCurrentCompany()
    const supabase = await createClient()

    const { data: companySettings } = await supabase
        .from('company_settings')
        .select('vat_registered')
        .eq('company_id', company.id)
        .maybeSingle()

    const vatRegistered = !!companySettings?.vat_registered

    const { data: boilers, error: boilersError } = await supabase
        .from('boilers')
        .select('*')
        .eq('company_id', company.id)
        .order('category')
        .order('price')

    const { data: pricing, error: pricingError } = await supabase
        .from('pricing')
        .select('*')
        .eq('company_id', company.id)
        .order('id')

    const defaultMarkup = await loadDefaultBoilerMarkup(createAdminClient(), company.id)
    const calculatorAppliesMarkup = !!company.calculator_applies_boiler_markup

    if (boilersError) console.error(boilersError)
    if (pricingError) console.error(pricingError)

    async function saveBoilerPrices(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const company = await getCurrentCompany()

        await saveDefaultBoilerMarkup(createAdminClient(), company.id, Number(formData.get('default_markup')))

        const boilerIds = formData.getAll('boiler_id')

        await Promise.all(
            boilerIds.map((id) =>
                supabase
                    .from('boilers')
                    .update({
                        price: Number(formData.get(`price_${id}`)),
                        markup_percent: parseMarkupOverride(formData.get(`markup_${id}`)),
                    })
                    .eq('id', id)
                    .eq('company_id', company.id)
            )
        )

        redirect('/admin/pricing?tab=boilers')
    }

    async function setCalculatorMarkup(formData: FormData) {
        'use server'
        const company = await getCurrentCompany()
        const { error } = await createAdminClient()
            .from('companies')
            .update({ calculator_applies_boiler_markup: formData.get('enabled') === 'true' })
            .eq('id', company.id)
        if (error) console.error('Failed to update calculator_applies_boiler_markup:', error.message)
        redirect('/admin/pricing?tab=boilers')
    }

    async function saveSurcharges(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const company = await getCurrentCompany()

        const pricingIds = formData.getAll('pricing_id')

        for (const id of pricingIds) {
            const value = formData.get(`value_${id}`)
            await supabase
                .from('pricing')
                .update({ value: Number(value) })
                .eq('id', id)
                .eq('company_id', company.id)
        }

        redirect('/admin/pricing?tab=surcharges')
    }

    const surchargesByCategory = (pricing ?? []).reduce<Record<string, typeof pricing>>((acc, row: any) => {
        const category: string = row.category || 'fuel'
        acc[category] = acc[category] ? [...acc[category], row] : [row]
        return acc
    }, {})

    const categoryOrder: PricingCategory[] = ['swap', 'flue', 'condensate', 'fuel', 'sundries']
    const orderedCategories = [
        ...categoryOrder.filter((c) => surchargesByCategory[c]),
        ...Object.keys(surchargesByCategory).filter((c) => !categoryOrder.includes(c as PricingCategory)),
    ]

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-7xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin"
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                        >
                            ← Admin Panel
                        </Link>

                        <div>
                            <h1 className="text-4xl font-bold">Pricing</h1>
                            <p className="mt-2 text-gray-600">
                                Everything that affects what a customer is quoted lives here — boiler prices and installation surcharges.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl bg-blue-50 px-5 py-3 text-sm text-blue-800">
                    All prices below are entered <strong>excluding VAT</strong>.{' '}
                    {vatRegistered
                        ? 'Your company is set to VAT registered, so 20% VAT is automatically added on top of these prices when shown to customers on the quote calculator.'
                        : "Your company is set to not VAT registered, so customers see these prices exactly as entered, with no VAT added."}{' '}
                    Change this in{' '}
                    <Link href="/admin/settings" className="underline">
                        Settings → VAT
                    </Link>
                    .
                </div>

                <div className="mt-6 flex gap-2 border-b border-slate-200">
                    <Link
                        href="/admin/pricing?tab=boilers"
                        className={`rounded-t-xl px-5 py-3 font-medium transition-colors ${activeTab === 'boilers'
                            ? 'border-b-2 border-emerald-700 text-emerald-700'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Boiler Prices
                    </Link>
                    <Link
                        href="/admin/pricing?tab=surcharges"
                        className={`rounded-t-xl px-5 py-3 font-medium transition-colors ${activeTab === 'surcharges'
                            ? 'border-b-2 border-emerald-700 text-emerald-700'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Installation &amp; Surcharges
                    </Link>
                </div>

                {activeTab === 'boilers' && (
                    <>
                        {imported && (
                            <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
                                Updated {imported} boiler {imported === '1' ? 'price' : 'prices'} from your supplier quote.
                            </div>
                        )}

                        {calculatorAppliesMarkup ? (
                            <form action={setCalculatorMarkup} className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100 px-5 py-3 text-sm text-slate-700">
                                <input type="hidden" name="enabled" value="false" />
                                <span>
                                    Boiler prices below are <strong>trade prices</strong>. Customers see them with your markup
                                    added, on the online quote calculator and on surveyor quotes.
                                </span>
                                <button className="text-slate-500 underline hover:text-slate-700">
                                    Stop adding markup on the calculator
                                </button>
                            </form>
                        ) : (
                            <form action={setCalculatorMarkup} className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                                <input type="hidden" name="enabled" value="true" />
                                <p className="font-semibold">Your online calculator isn&apos;t adding boiler markup yet</p>
                                <p className="mt-1">
                                    Surveyor quotes already treat these prices as trade prices and add your markup, but the online
                                    quote calculator still shows them to customers exactly as entered. If the prices below are what
                                    you pay your supplier, turn markup on so online quotes match. If you&apos;ve entered selling
                                    prices, change them to trade prices first.
                                </p>
                                <button className="mt-3 rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700">
                                    These are trade prices: add markup on the calculator
                                </button>
                            </form>
                        )}

                        <form action={saveBoilerPrices} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <p className="text-sm text-gray-500">
                                    Enter trade prices ex VAT. Need to change a name, image or tier instead?{' '}
                                    <Link href="/admin/boilers" className="text-blue-600 hover:underline">
                                        Open the boiler catalogue
                                    </Link>
                                    .
                                </p>
                                <div className="flex shrink-0 items-center gap-3">
                                    <Link
                                        href="/admin/pricing/import"
                                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                                    >
                                        Import supplier quote
                                    </Link>
                                    <button className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md">
                                        Save Changes
                                    </button>
                                </div>
                            </div>

                            <BoilerPricesEditor
                                boilers={(boilers ?? []).map((b: any) => ({
                                    id: b.id,
                                    name: b.name,
                                    category: b.category,
                                    output: b.output,
                                    price: Number(b.price) || 0,
                                    markup_percent: b.markup_percent === null ? null : Number(b.markup_percent),
                                }))}
                                defaultMarkup={defaultMarkup}
                                vatRegistered={vatRegistered}
                            />

                            <div className="mt-6">
                                <button
                                    type="submit"
                                    className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {activeTab === 'surcharges' && (
                    <form action={saveSurcharges} className="mt-6 space-y-6">
                        <p className="text-sm text-gray-500">
                            These are added on top of a boiler's base price depending on a customer's answers in the quote calculator (swap type, flue position, fuel type, etc).
                        </p>

                        {(!pricing || pricing.length === 0) && (
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-red-600 shadow-sm">
                                No pricing records found for this company.
                            </div>
                        )}

                        {orderedCategories.map((category) => (
                            <div key={category} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="mb-4 text-lg font-bold text-slate-800">
                                    {PRICING_CATEGORY_LABELS[category as PricingCategory] || category}
                                </h2>
                                <table className="w-full overflow-hidden rounded-2xl">
                                    <tbody>
                                        {surchargesByCategory[category]?.map((item: any) => (
                                            <tr key={item.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-0">
                                                <td className="py-3 font-medium">{item.name}</td>
                                                <td className="py-3 text-right">
                                                    <input type="hidden" name="pricing_id" value={item.id} />
                                                    <input
                                                        type="number"
                                                        defaultValue={item.value}
                                                        name={`value_${item.id}`}
                                                        className="w-40 rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}

                        <div>
                            <button
                                type="submit"
                                className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-bold">Finance Settings</h2>

                    <div className="mt-6 grid gap-6 md:grid-cols-3">
                        <div>
                            <label className="mb-2 block font-medium">Minimum Deposit</label>
                            <input
                                type="number"
                                defaultValue={500}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">APR (%)</label>
                            <input
                                type="number"
                                defaultValue={11.9}
                                step="0.1"
                                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Max Finance Term (Years)</label>
                            <input
                                type="number"
                                defaultValue={10}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
