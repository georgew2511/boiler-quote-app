import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { getTierDefinition } from '@/lib/subscriptionTiers'

function daysUntil(dateStr: string | null) {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default async function SuperAdminDashboard() {
    const adminClient = createAdminClient()

    const { data: companies } = await adminClient
        .from('companies')
        .select('id, company_name, subscription_status, subscription_tier, trial_ends_at, created_at')
        .order('created_at', { ascending: false })

    const rows = companies || []
    const totalCompanies = rows.length
    const statusCounts = rows.reduce<Record<string, number>>((acc, r) => {
        const key = r.subscription_status || 'unknown'
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})
    const estimatedMRR = rows
        .filter((r) => r.subscription_status === 'active')
        .reduce((sum, r) => sum + getTierDefinition(r.subscription_tier).priceMonthlyPence, 0) / 100
    const trialsEndingSoon = rows.filter((r) => {
        if (r.subscription_status !== 'trial') return false
        const d = daysUntil(r.trial_ends_at)
        return d !== null && d <= 3
    }).length

    const recentSignups = rows.slice(0, 5)

    const { data: recentBugReports } = await adminClient
        .from('bug_reports')
        .select('id, company_name, message, status, created_at')
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(5)

    return (
        <main>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="mt-2 text-gray-600">A quick read on how the platform is doing right now.</p>

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
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm text-slate-500">Trials Ending ≤3 Days</div>
                    <div className={`mt-1 text-3xl font-bold ${trialsEndingSoon > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
                        {trialsEndingSoon}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm text-slate-500">Open Bug Reports</div>
                    <div className={`mt-1 text-3xl font-bold ${(recentBugReports?.length || 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {recentBugReports?.length || 0}
                    </div>
                </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">Recent signups</h2>
                        <Link href="/superadmin/signups" className="text-sm font-medium text-blue-600 hover:underline">View all</Link>
                    </div>
                    <div className="mt-4 divide-y divide-slate-100">
                        {recentSignups.length === 0 && <p className="py-4 text-sm text-slate-400">No signups yet.</p>}
                        {recentSignups.map((c) => (
                            <div key={c.id} className="flex items-center justify-between py-3">
                                <span className="font-medium text-slate-900">{c.company_name}</span>
                                <span className="text-xs text-slate-400">
                                    {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '-'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">Open bug reports</h2>
                        <Link href="/superadmin/bug-reports" className="text-sm font-medium text-blue-600 hover:underline">View all</Link>
                    </div>
                    <div className="mt-4 divide-y divide-slate-100">
                        {(!recentBugReports || recentBugReports.length === 0) && (
                            <p className="py-4 text-sm text-slate-400">Nothing open right now.</p>
                        )}
                        {recentBugReports?.map((b) => (
                            <div key={b.id} className="py-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-slate-900">{b.company_name}</span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(b.created_at).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                                <p className="mt-1 truncate text-sm text-slate-500">{b.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    )
}
