import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'


export default async function PricingPage() {

    const { data: pricing, error } = await supabase
        .from('pricing')
        .select('*')
        .order('id')

    if (error) {
        console.error(error)
    }
    console.log('PRICING DATA:', pricing)
    console.log('PRICING ERROR:', error)

    async function savePricing(formData: FormData) {
        'use server'

        const pricingIds = formData.getAll('pricing_id')

        for (const id of pricingIds) {
            const value = formData.get(`value_${id}`)

            await supabase
                .from('pricing')
                .update({ value: Number(value) })
                .eq('id', id)
        }

        redirect('/admin/pricing')
    }


    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-7xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a
                            href="/admin"
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                        >
                            ← Admin Panel
                        </a>

                        <div>
                            <h1 className="text-4xl font-bold">Pricing</h1>
                            <p className="mt-2 text-gray-600">
                                Manage installation surcharges and quote modifiers. Boiler prices are managed from the Boilers page.
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                Any pricing rows added to the Supabase pricing table will automatically appear below.
                            </p>
                        </div>
                    </div>

                    <form action={savePricing}>
                        <button className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md">
                            Save Changes
                        </button>
                    </form>
                </div>

                <form action={savePricing} className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <table className="w-full overflow-hidden rounded-2xl">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="pb-4 text-left">Pricing Modifier</th>
                                <th className="pb-4 text-left">Amount (£)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!pricing || pricing.length === 0) && (
                                <tr>
                                    <td colSpan={2} className="py-8 text-center text-red-600">
                                        No pricing records returned from Supabase
                                    </td>
                                </tr>
                            )}
                            {pricing?.map((item) => (
                                <tr key={item.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-0">
                                    <td className="py-4 font-medium">{item.name}</td>
                                    <td className="py-4">
                                        <input
                                            type="hidden"
                                            name="pricing_id"
                                            value={item.id}
                                        />
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
                    <div className="mt-6">
                        <button
                            type="submit"
                            className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>


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