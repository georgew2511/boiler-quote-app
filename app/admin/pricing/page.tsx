import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { PRICING_CATEGORY_LABELS, PricingCategory } from '@/lib/pricingKeys'

export default async function PricingPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const { tab } = await searchParams
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

    if (boilersError) console.error(boilersError)
    if (pricingError) console.error(pricingError)

    async function saveBoilerPrices(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const company = await getCurrentCompany()

        const boilerIds = formData.getAll('boiler_id')

        for (const id of boilerIds) {
            const value = formData.get(`price_${id}`)
            await supabase
                .from('boilers')
                .update({ price: Number(value) })
                .eq('id', id)
                .eq('company_id', company.id)
        }

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
                    <form action={saveBoilerPrices} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Quickly adjust base prices across every boiler. Need to change a name, image or tier instead?{' '}
                                <Link href="/admin/boilers" className="text-blue-600 hover:underline">
                                    Open the boiler catalogue
                                </Link>
                                .
                            </p>
                            <button className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md">
                                Save Changes
                            </button>
                        </div>

                        <table className="w-full overflow-hidden rounded-2xl">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="pb-4 text-left">Boiler</th>
                                    <th className="pb-4 text-left">Category</th>
                                    <th className="pb-4 text-left">Output</th>
                                    <th className="pb-4 text-left">Price (£)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!boilers || boilers.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-red-600">
                                            No boilers found. Add one from the boiler catalogue first.
                                        </td>
                                    </tr>
                                )}
                                {boilers?.map((boiler: any) => (
                                    <tr key={boiler.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-0">
                                        <td className="py-4 font-medium">{boiler.name}</td>
                                        <td className="py-4 capitalize text-slate-500">{boiler.category}</td>
                                        <td className="py-4 text-slate-500">{boiler.output}kW</td>
                                        <td className="py-4">
                                            <input type="hidden" name="boiler_id" value={boiler.id} />
                                            <input
                                                type="number"
                                                step="any"
                                                defaultValue={boiler.price}
                                                name={`price_${boiler.id}`}
                                                className="w-40 rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-6">
                            <button
                                type="submit"
                                className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
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
