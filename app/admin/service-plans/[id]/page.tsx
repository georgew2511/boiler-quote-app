import { createClient } from '@/utils/supabase/server'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EditServicePlanPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: routeId } = await params
    const id = Number(routeId)
    const company = await getCurrentCompany()
    const supabase = await createClient()

    const { data: plan, error } = await supabase
        .from('service_plans')
        .select('*')
        .eq('id', id)
        .eq('company_id', company.id)
        .single()

    if (error || !plan) {
        return (
            <main className="min-h-screen bg-gray-50 p-8">
                <div className="mx-auto max-w-xl">
                    <h1 className="text-3xl font-bold mb-4">Plan not found</h1>
                    <Link href="/admin/service-plans" className="text-blue-600 hover:underline">
                        Back to Service Plans
                    </Link>
                </div>
            </main>
        )
    }

    async function updatePlan(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const company = await getCurrentCompany()

        const { error: updateError } = await supabase
            .from('service_plans')
            .update({
                name: formData.get('name'),
                price_monthly: Number(formData.get('price_monthly')),
                price_annual: Number(formData.get('price_annual')),
                includes_annual_service: formData.get('includes_annual_service') === 'on',
                includes_breakdown_cover: formData.get('includes_breakdown_cover') === 'on',
                includes_parts_and_labour: formData.get('includes_parts_and_labour') === 'on',
                includes_priority_callout: formData.get('includes_priority_callout') === 'on',
                custom_features: (formData.get('custom_features') as string || '')
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean),
                is_featured: formData.get('is_featured') === 'on',
                gocardless_link: formData.get('gocardless_link') || null,
                status: formData.get('status'),
            })
            .eq('id', id)
            .eq('company_id', company.id)

        if (updateError) {
            throw new Error(`Failed to update plan: ${updateError.message}`)
        }

        redirect('/admin/service-plans')
    }

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-10 shadow-xl">
                <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-6">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Edit Plan</h1>
                        <p className="mt-2 text-gray-500">
                            Changes here only affect new sign-ups — existing customers keep the price and
                            features they originally signed up for.
                        </p>
                    </div>

                    <Link
                        href="/admin/service-plans"
                        className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                        ← Back
                    </Link>
                </div>

                <form action={updatePlan} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="name">
                            Plan Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            defaultValue={plan.name || ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="price_monthly">
                            Price per Month (£)
                        </label>
                        <input
                            id="price_monthly"
                            name="price_monthly"
                            type="number"
                            step="0.01"
                            defaultValue={plan.price_monthly ?? ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="price_annual">
                            Price per Year (£)
                        </label>
                        <input
                            id="price_annual"
                            name="price_annual"
                            type="number"
                            step="0.01"
                            defaultValue={plan.price_annual ?? ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="status">
                            Status
                        </label>
                        <select
                            id="status"
                            name="status"
                            defaultValue={plan.status || 'Active'}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="mt-9 flex items-center gap-2 text-sm text-gray-600">
                            <input type="checkbox" name="is_featured" defaultChecked={!!plan.is_featured} />
                            Mark as "Most Popular" on the sign-up page
                        </label>
                    </div>

                    <div className="md:col-span-2 rounded-2xl border border-gray-200 p-6">
                        <label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-gray-600">
                            What's Included
                        </label>

                        <div className="space-y-2 text-sm text-gray-700">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" name="includes_annual_service" defaultChecked={!!plan.includes_annual_service} />
                                Annual service
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" name="includes_breakdown_cover" defaultChecked={!!plan.includes_breakdown_cover} />
                                Breakdown cover
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" name="includes_parts_and_labour" defaultChecked={!!plan.includes_parts_and_labour} />
                                Parts &amp; labour
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" name="includes_priority_callout" defaultChecked={!!plan.includes_priority_callout} />
                                Priority callout
                            </label>
                        </div>

                        <label className="mt-4 mb-2 block text-xs font-medium text-gray-500">
                            Other items included (one per line)
                        </label>
                        <textarea
                            name="custom_features"
                            defaultValue={(plan.custom_features || []).join('\n')}
                            className="h-24 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="gocardless_link">
                            GoCardless Payment Link
                        </label>
                        <input
                            id="gocardless_link"
                            name="gocardless_link"
                            type="url"
                            defaultValue={plan.gocardless_link || ''}
                            placeholder="https://pay.gocardless.com/..."
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Create a Billing Request Template for this plan in your own GoCardless dashboard,
                            then paste its shareable link here.
                        </p>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-4 md:col-span-2">
                        <button
                            type="submit"
                            className="rounded-2xl border border-emerald-700 bg-emerald-700 px-8 py-4 text-lg font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
                        >
                            Save Plan
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}
