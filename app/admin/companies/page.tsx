import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { IMPERSONATION_COOKIE } from '@/lib/superAdmin'
import { getTierDefinition } from '@/lib/subscriptionTiers'
import {
    getInactivityEmailSettings,
    saveInactivityEmailSettings,
    sendInactivityEmail,
    INACTIVITY_LOGIN_URL,
} from '@/lib/systemSettings'

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    past_due: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
}

function daysUntil(dateStr: string | null) {
    if (!dateStr) return null
    const diffMs = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export default async function CompaniesPage({
    searchParams,
}: {
    searchParams: Promise<{ testEmail?: string; testEmailError?: string }>
}) {
    const { testEmail, testEmailError } = await searchParams
    const company = await getCurrentCompany()

    if (!company.isSuperAdmin) {
        return (
            <main className="p-8">
                <h1 className="text-2xl font-bold text-red-600">Access denied</h1>
                <p className="mt-2 text-gray-600">This page is only available to the platform admin account.</p>
            </main>
        )
    }

    const adminClient = createAdminClient()

    const { data: companies, error } = await adminClient
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return <div className="p-8">Error loading companies: {error.message}</div>
    }

    const { data: allLeads } = await adminClient
        .from('leads')
        .select('company_id, created_at')

    const leadsByCompany = new Map<string, { created_at: string }[]>()
    for (const lead of allLeads || []) {
        if (!lead.company_id) continue
        const existing = leadsByCompany.get(lead.company_id) || []
        existing.push({ created_at: lead.created_at })
        leadsByCompany.set(lead.company_id, existing)
    }

    const rows = (companies || []).map((c: any) => {
        const tier = getTierDefinition(c.subscription_tier)
        const periodStart = c.billing_period_start || c.created_at
        const leadsThisPeriod = (leadsByCompany.get(c.id) || []).filter(
            (l) => new Date(l.created_at) >= new Date(periodStart)
        ).length
        const leadsAllTime = (leadsByCompany.get(c.id) || []).length
        const overCap = tier.leadLimit !== null && leadsThisPeriod > tier.leadLimit
        const trialDaysLeft = c.subscription_status === 'trial' ? daysUntil(c.trial_ends_at) : null

        return {
            ...c,
            tier,
            leadsThisPeriod,
            leadsAllTime,
            overCap,
            trialDaysLeft,
        }
    })

    const totalCompanies = rows.length
    const statusCounts = rows.reduce<Record<string, number>>((acc, r) => {
        const key = r.subscription_status || 'unknown'
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})
    const estimatedMRR = rows
        .filter((r) => r.subscription_status === 'active')
        .reduce((sum, r) => sum + r.tier.priceMonthlyPence, 0) / 100
    const overCapCount = rows.filter((r) => r.overCap).length
    const trialsEndingSoon = rows.filter(
        (r) => r.subscription_status === 'trial' && r.trialDaysLeft !== null && r.trialDaysLeft <= 3
    ).length
    const servicePlanAddonCount = rows.filter((r) => r.service_plans_addon).length

    const inactivityEmailSettings = await getInactivityEmailSettings()

    async function loginAs(formData: FormData) {
        'use server'

        const companyId = formData.get('company_id') as string
        const cookieStore = await cookies()
        cookieStore.set(IMPERSONATION_COOKIE, companyId, { path: '/' })

        redirect('/admin')
    }

    async function stopImpersonating() {
        'use server'

        const cookieStore = await cookies()
        cookieStore.delete(IMPERSONATION_COOKIE)

        redirect('/admin/companies')
    }

    async function toggleServicePlansAddon(formData: FormData) {
        'use server'

        // Re-check super-admin on the server before using the
        // RLS-bypassing admin client, since this is a privileged write.
        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        const companyId = formData.get('company_id') as string
        const currentValue = formData.get('current') as string
        const current = currentValue === 'true' || currentValue === '1'

        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('companies')
            .update({ service_plans_addon: !current })
            .eq('id', companyId)

        if (error) {
            console.error('Error toggling service plans:', error)
        }

        redirect('/admin/companies')
    }

    async function setSubscriptionTier(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        const companyId = formData.get('company_id') as string
        const tier = formData.get('tier') as string

        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('companies')
            .update({ subscription_tier: tier })
            .eq('id', companyId)

        if (error) {
            console.error('Error setting tier:', error)
        }

        redirect('/admin/companies')
    }

    async function saveInactivitySettings(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        await saveInactivityEmailSettings({
            enabled: formData.get('enabled') === 'on',
            daysInactive: Number(formData.get('daysInactive')) || 3,
            subject: (formData.get('subject') as string) || '',
            body: (formData.get('body') as string) || '',
        })

        redirect('/admin/companies')
    }

    async function sendTestInactivityEmail(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        // Sends whatever is currently typed in the form — including unsaved
        // edits — so you can preview a change before committing to it.
        const draftSettings = {
            enabled: formData.get('enabled') === 'on',
            daysInactive: Number(formData.get('daysInactive')) || 3,
            subject: (formData.get('subject') as string) || '',
            body: (formData.get('body') as string) || '',
        }

        const adminClient = createAdminClient()
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
            requestingCompany.owner_user_id
        )
        const toEmail = userData?.user?.email

        if (userError || !toEmail) {
            redirect(`/admin/companies?testEmailError=${encodeURIComponent('Could not find your account email')}`)
        }

        const { error: sendError } = await sendInactivityEmail(toEmail, draftSettings, {
            company_name: requestingCompany.company_name,
            login_url: INACTIVITY_LOGIN_URL,
        })

        if (sendError) {
            redirect(`/admin/companies?testEmailError=${encodeURIComponent(sendError.message)}`)
        }

        redirect(`/admin/companies?testEmail=${encodeURIComponent(toEmail)}`)
    }

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-7xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">Super Admin</h1>
                        <p className="mt-2 text-gray-600">
                            Platform-wide view of every business on Relode — plans, usage and billing health.
                        </p>
                    </div>

                    {company.isImpersonating && (
                        <form action={stopImpersonating}>
                            <button className="rounded-xl border border-amber-600 bg-amber-50 px-5 py-3 font-medium text-amber-700 hover:bg-amber-100">
                                Stop Viewing As {company.company_name}
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-sm text-slate-500">Total Companies</div>
                        <div className="mt-1 text-3xl font-bold text-slate-900">{totalCompanies}</div>
                        <div className="mt-1 text-xs text-slate-400">
                            {statusCounts.active || 0} active · {statusCounts.trial || 0} trial ·{' '}
                            {statusCounts.past_due || 0} past due · {statusCounts.cancelled || 0} cancelled
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-sm text-slate-500">Estimated MRR</div>
                        <div className="mt-1 text-3xl font-bold text-green-600">£{estimatedMRR.toFixed(0)}</div>
                        <div className="mt-1 text-xs text-slate-400">From paying self-serve subscriptions only</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-sm text-slate-500">Over Their Lead Cap</div>
                        <div className={`mt-1 text-3xl font-bold ${overCapCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                            {overCapCount}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">Candidates for an upgrade nudge</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-sm text-slate-500">Trials Ending ≤3 Days</div>
                        <div className={`mt-1 text-3xl font-bold ${trialsEndingSoon > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
                            {trialsEndingSoon}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">{servicePlanAddonCount} have the Service Plans add-on</div>
                    </div>
                </div>

                <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-5 py-4">Company</th>
                                <th className="px-5 py-4">Plan</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4">Leads (Period)</th>
                                <th className="px-5 py-4">Leads (All Time)</th>
                                <th className="px-5 py-4">Last Login</th>
                                <th className="px-5 py-4">Service Plans</th>
                                <th className="px-5 py-4">Stripe</th>
                                <th className="px-5 py-4">Signed Up</th>
                                <th className="px-5 py-4">Company ID</th>
                                <th className="px-5 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((c) => (
                                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="px-5 py-4 font-medium text-slate-900">
                                        {c.company_name}
                                        {c.id === company.realCompanyId && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">You</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <form action={setSubscriptionTier} className="flex items-center gap-1">
                                            <input type="hidden" name="company_id" value={c.id} />
                                            <select
                                                name="tier"
                                                defaultValue={c.subscription_tier || 'grandfathered'}
                                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                                            >
                                                <option value="grandfathered">Legacy (Free)</option>
                                                <option value="starter">Starter — £29/mo</option>
                                                <option value="growth">Growth — £49/mo</option>
                                                <option value="pro">Pro — £79/mo</option>
                                            </select>
                                            <button
                                                type="submit"
                                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                                                title="Save plan"
                                            >
                                                Save
                                            </button>
                                        </form>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[c.subscription_status] || 'bg-slate-100 text-slate-600'}`}>
                                            {c.subscription_status || 'unknown'}
                                        </span>
                                        {c.trialDaysLeft !== null && (
                                            <div className={`mt-1 text-xs ${c.trialDaysLeft <= 3 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                                                {c.trialDaysLeft >= 0 ? `${c.trialDaysLeft}d left` : 'Expired'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={c.overCap ? 'font-semibold text-amber-600' : 'text-slate-700'}>
                                            {c.leadsThisPeriod}
                                            {c.tier.leadLimit !== null ? ` / ${c.tier.leadLimit}` : ' / ∞'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-500">{c.leadsAllTime}</td>
                                    <td className="px-5 py-4 text-slate-500">
                                        {c.last_seen_at ? (
                                            <>
                                                <div>
                                                    {new Date(c.last_seen_at).toLocaleDateString('en-GB', { timeZone: 'Europe/London' })}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {new Date(c.last_seen_at).toLocaleTimeString('en-GB', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        timeZone: 'Europe/London',
                                                    })}
                                                </div>
                                            </>
                                        ) : (
                                            'Never'
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <form action={toggleServicePlansAddon}>
                                            <input type="hidden" name="company_id" value={c.id} />
                                            <input type="hidden" name="current" value={c.service_plans_addon ? '1' : '0'} />
                                            <button
                                                type="submit"
                                                className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${c.service_plans_addon
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {c.service_plans_addon ? 'Enabled' : 'Disabled'}
                                            </button>
                                        </form>
                                    </td>
                                    <td className="px-5 py-4">
                                        {c.stripe_customer_id ? (
                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Linked</span>
                                        ) : (
                                            <span className="text-xs text-slate-400">None</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-slate-500">
                                        {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '-'}
                                    </td>
                                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{c.id}</td>
                                    <td className="px-5 py-4">
                                        {c.id === company.realCompanyId ? (
                                            <span className="text-sm text-slate-400">This is you</span>
                                        ) : (
                                            <form action={loginAs}>
                                                <input type="hidden" name="company_id" value={c.id} />
                                                <button className="rounded-xl border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                                                    Login As
                                                </button>
                                            </form>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-bold">Inactivity Email</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Automatically nudges a company's owner by email once they've gone quiet on the dashboard.
                        Runs once a day. Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{'{{company_name}}'}</code>{' '}
                        and <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{'{{login_url}}'}</code> as placeholders
                        in the subject or body — they'll be filled in automatically for each company.
                    </p>

                    {testEmail && (
                        <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                            ✓ Test email sent to {testEmail} — check your inbox to see how it looks.
                        </div>
                    )}
                    {testEmailError && (
                        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                            Failed to send test email: {testEmailError}
                        </div>
                    )}

                    <form action={saveInactivitySettings} className="mt-6 space-y-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input
                                type="checkbox"
                                name="enabled"
                                defaultChecked={inactivityEmailSettings.enabled}
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            Send inactivity emails
                        </label>

                        <div className="max-w-xs">
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Send after this many days of inactivity
                            </label>
                            <input
                                type="number"
                                name="daysInactive"
                                min={1}
                                defaultValue={inactivityEmailSettings.daysInactive}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                            <input
                                type="text"
                                name="subject"
                                defaultValue={inactivityEmailSettings.subject}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
                            <textarea
                                name="body"
                                rows={8}
                                defaultValue={inactivityEmailSettings.body}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="submit"
                                className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
                            >
                                Save
                            </button>
                            <button
                                type="submit"
                                formAction={sendTestInactivityEmail}
                                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                                title="Sends to your own account email using whatever's currently in the fields above, without saving"
                            >
                                Send Test Email To Me
                            </button>
                        </div>
                    </form>
                </div>

                <Link href="/admin" className="mt-6 inline-block text-blue-600 hover:underline">
                    ← Back to Admin
                </Link>
            </div>
        </main>
    )
}
