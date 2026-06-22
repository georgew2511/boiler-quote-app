import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

export default async function ServicePlansPage() {
    const company = await getCurrentCompany()

    if (!company.service_plans_addon) {
        return (
            <main className="min-h-screen bg-[#f5f7fb] p-8">
                <div className="mx-auto max-w-3xl">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin"
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                        >
                            ← Admin Panel
                        </Link>
                    </div>

                    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
                            🔒
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Service Plans</h1>
                        <p className="mx-auto mt-3 max-w-xl text-slate-600">
                            Automate annual boiler service plan sign-ups, recurring billing and renewal
                            reminders — direct from your own website, with zero manual admin. This is a
                            premium add-on to your quote calculator subscription.
                        </p>
                        <p className="mt-6 text-sm text-slate-500">
                            Not included in your current plan. Contact us to add Service Plans to your account.
                        </p>
                    </div>
                </div>
            </main>
        )
    }

    const { data: plans, error: plansError } = await supabase
        .from('service_plans')
        .select('*')
        .eq('company_id', company.id)
        .order('price_monthly')

    const { data: subscriptions, error: subsError } = await supabase
        .from('service_plan_subscriptions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

    if (plansError) console.error(plansError)
    if (subsError) console.error(subsError)

    const activeSubs = (subscriptions ?? []).filter((s) => s.status === 'Active')

    // MRR uses the price each customer actually signed up at (price_at_signup),
    // not the plan's current live price — editing a plan later shouldn't
    // retroactively change what existing customers are counted as paying.
    const mrr = activeSubs.reduce((sum, s) => {
        if (s.price_at_signup == null) return sum
        return sum + (s.billing_frequency === 'annual' ? Number(s.price_at_signup) / 12 : Number(s.price_at_signup))
    }, 0)

    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const renewalsDueSoon = activeSubs.filter(
        (s) => s.next_renewal_date && new Date(s.next_renewal_date) <= thirtyDaysFromNow
    ).length

    const pastDue = (subscriptions ?? []).filter((s) => s.status === 'PastDue').length

    async function createPlan(formData: FormData) {
        'use server'

        const { error: insertError } = await supabase.from('service_plans').insert({
            company_id: company.id,
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
            status: 'Active',
        })

        if (insertError) {
            throw new Error(`Failed to create plan: ${insertError.message}`)
        }

        redirect('/admin/service-plans')
    }

    async function toggleFeatured(formData: FormData) {
        'use server'

        const id = formData.get('id') as string
        const current = formData.get('current') === 'true'

        const { error: updateError } = await supabase
            .from('service_plans')
            .update({ is_featured: !current })
            .eq('id', id)

        if (updateError) {
            throw new Error(`Failed to update plan: ${updateError.message}`)
        }

        redirect('/admin/service-plans')
    }

    async function togglePlanStatus(formData: FormData) {
        'use server'

        const id = formData.get('id') as string
        const currentStatus = formData.get('current_status') as string
        const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'

        const { error: updateError } = await supabase
            .from('service_plans')
            .update({ status: nextStatus })
            .eq('id', id)

        if (updateError) {
            throw new Error(`Failed to update plan: ${updateError.message}`)
        }

        redirect('/admin/service-plans')
    }

    async function deletePlan(formData: FormData) {
        'use server'

        const id = formData.get('id') as string
        const { error: deleteError } = await supabase.from('service_plans').delete().eq('id', id)

        if (deleteError) {
            throw new Error(`Failed to delete plan: ${deleteError.message}`)
        }

        redirect('/admin/service-plans')
    }

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-6xl">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        ← Admin Panel
                    </Link>
                    <div>
                        <h1 className="text-4xl font-bold">Service Plans</h1>
                        <p className="text-sm text-gray-500">
                            Build your annual service plan tiers, then track sign-ups and recurring revenue.
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-sm text-slate-500">Active Plans</div>
                        <div className="mt-1 text-3xl font-bold text-slate-900">{activeSubs.length}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-sm text-slate-500">Monthly Recurring Revenue</div>
                        <div className="mt-1 text-3xl font-bold text-green-600">£{mrr.toFixed(0)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-sm text-slate-500">Renewals Due (30 Days)</div>
                        <div className="mt-1 text-3xl font-bold text-slate-900">{renewalsDueSoon}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-sm text-slate-500">Payments Needing Attention</div>
                        <div className={`mt-1 text-3xl font-bold ${pastDue > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                            {pastDue}
                        </div>
                    </div>
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-bold">Your Plan Tiers</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        These are the plans customers will be able to choose from when they sign up online.
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {plans?.map((plan: any) => (
                            <div key={plan.id} className={`rounded-2xl border p-5 ${plan.is_featured ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-lg font-bold">{plan.name}</h3>
                                        {plan.is_featured && (
                                            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                                Most Popular
                                            </span>
                                        )}
                                    </div>
                                    <form action={togglePlanStatus}>
                                        <input type="hidden" name="id" value={plan.id} />
                                        <input type="hidden" name="current_status" value={plan.status} />
                                        <button
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${plan.status === 'Active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-500'
                                                }`}
                                        >
                                            {plan.status}
                                        </button>
                                    </form>
                                </div>

                                <form action={toggleFeatured} className="mt-2">
                                    <input type="hidden" name="id" value={plan.id} />
                                    <input type="hidden" name="current" value={String(!!plan.is_featured)} />
                                    <button type="submit" className="text-xs font-medium text-slate-400 hover:text-amber-600 hover:underline">
                                        {plan.is_featured ? 'Unmark as Most Popular' : 'Mark as Most Popular'}
                                    </button>
                                </form>

                                <div className="mt-3 text-2xl font-bold text-slate-900">
                                    £{Number(plan.price_monthly || 0).toFixed(2)}<span className="text-sm font-normal text-slate-500">/mo</span>
                                </div>
                                <div className="text-sm text-slate-500">
                                    or £{Number(plan.price_annual || 0).toFixed(2)}/year
                                </div>

                                <ul className="mt-4 space-y-1 text-sm text-slate-600">
                                    {plan.includes_annual_service && <li>✓ Annual service</li>}
                                    {plan.includes_breakdown_cover && <li>✓ Breakdown cover</li>}
                                    {plan.includes_parts_and_labour && <li>✓ Parts &amp; labour</li>}
                                    {plan.includes_priority_callout && <li>✓ Priority callout</li>}
                                    {(plan.custom_features || []).map((feature: string, i: number) => (
                                        <li key={i}>✓ {feature}</li>
                                    ))}
                                </ul>

                                <div className="mt-4 flex items-center gap-4">
                                    <Link href={`/admin/service-plans/${plan.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                                        Edit
                                    </Link>
                                    <form action={deletePlan}>
                                        <input type="hidden" name="id" value={plan.id} />
                                        <button className="text-sm font-medium text-red-600 hover:underline">
                                            Delete
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))}

                        <form action={createPlan} className="rounded-2xl border-2 border-dashed border-slate-300 p-5">
                            <h3 className="text-lg font-bold text-slate-700">Add a Plan</h3>

                            <div className="mt-3 space-y-3">
                                <input
                                    name="name"
                                    type="text"
                                    placeholder="Plan name (e.g. Gold Cover)"
                                    required
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        name="price_monthly"
                                        type="number"
                                        step="0.01"
                                        placeholder="£/month"
                                        required
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                    />
                                    <input
                                        name="price_annual"
                                        type="number"
                                        step="0.01"
                                        placeholder="£/year"
                                        required
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                    />
                                </div>

                                <div className="space-y-2 text-sm text-slate-600">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" name="includes_annual_service" defaultChecked />
                                        Annual service
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" name="includes_breakdown_cover" />
                                        Breakdown cover
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" name="includes_parts_and_labour" />
                                        Parts &amp; labour
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" name="includes_priority_callout" />
                                        Priority callout
                                    </label>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-500">
                                        Other items included (one per line)
                                    </label>
                                    <textarea
                                        name="custom_features"
                                        placeholder={'e.g. Free filter replacement\nDiscounted call-outs'}
                                        className="h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                    />
                                </div>

                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" name="is_featured" />
                                    Mark as "Most Popular" on the sign-up page
                                </label>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-500">
                                        GoCardless Payment Link
                                    </label>
                                    <input
                                        name="gocardless_link"
                                        type="url"
                                        placeholder="https://pay.gocardless.com/..."
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                    />
                                    <p className="mt-1 text-xs text-slate-400">
                                        Create a Billing Request Template for this plan in your own GoCardless
                                        dashboard, then paste its shareable link here. Customers are sent here
                                        to set up their Direct Debit after entering their details.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                                Add Plan
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-bold">Customer Sign-Ups</h2>

                    {subscriptions && subscriptions.length > 0 ? (
                        <table className="mt-4 w-full overflow-hidden rounded-2xl">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                                    <th className="py-3">Customer</th>
                                    <th className="py-3">Plan</th>
                                    <th className="py-3">Status</th>
                                    <th className="py-3">Next Renewal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.map((sub: any) => (
                                    <tr key={sub.id} className="border-b border-slate-100 last:border-0">
                                        <td className="py-3">{sub.customer_name}</td>
                                        <td className="py-3">{plans?.find((p) => p.id === sub.service_plan_id)?.name || '—'}</td>
                                        <td className="py-3">
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="py-3">{sub.next_renewal_date || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                            No sign-ups yet. Once your customer-facing sign-up page is live, they'll appear here automatically.
                        </div>
                    )}
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-bold">Your Sign-Up Page</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Share this link directly, or embed it on your website so customers can sign up for a service plan themselves.
                    </p>

                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-slate-600">Direct Link</label>
                        <input
                            readOnly
                            value={`https://portal.relode.io/service-plan?company_id=${company.id}`}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm"
                        />
                    </div>

                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-slate-600">Embed Code</label>
                        <textarea
                            readOnly
                            value={`<iframe src="https://portal.relode.io/service-plan?company_id=${company.id}" width="100%" height="900" frameborder="0"></iframe>`}
                            className="h-28 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 font-mono text-sm"
                        />
                    </div>
                </div>

                <div className="mt-8 rounded-2xl bg-blue-50 px-5 py-4 text-sm text-blue-800">
                    <strong>Coming soon:</strong> sign-ups above are saved as <em>Pending</em> until real Direct
                    Debit/card billing is wired up — at that point customers will pay during sign-up automatically,
                    and renewals, payment retries and reminders will run on their own. Your plan tiers and sign-ups
                    are already being captured, ready for that to plug straight in.
                </div>
            </div>
        </main>
    )
}
