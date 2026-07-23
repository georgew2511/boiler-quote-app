import { createAdminClient } from '@/utils/supabase/admin'

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    past_due: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
}

function daysUntil(dateStr: string | null) {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default async function SignupsPage() {
    const adminClient = createAdminClient()

    const { data: companies, error } = await adminClient
        .from('companies')
        .select('id, company_name, owner_user_id, subscription_status, subscription_tier, trial_ends_at, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

    if (error) {
        return <div className="p-8">Error loading signups: {error.message}</div>
    }

    const rows = await Promise.all(
        (companies || []).map(async (c) => {
            let ownerEmail = '-'
            if (c.owner_user_id) {
                const { data } = await adminClient.auth.admin.getUserById(c.owner_user_id)
                ownerEmail = data?.user?.email || '-'
            }
            return { ...c, ownerEmail, trialDaysLeft: c.subscription_status === 'trial' ? daysUntil(c.trial_ends_at) : null }
        })
    )

    return (
        <main>
            <h1 className="text-4xl font-bold">Signups</h1>
            <p className="mt-2 text-gray-600">Every company that's signed up, newest first.</p>

            <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-4">Company</th>
                            <th className="px-5 py-4">Owner Email</th>
                            <th className="px-5 py-4">Signed Up</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Plan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((c) => (
                            <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="px-5 py-4 font-medium text-slate-900">{c.company_name}</td>
                                <td className="px-5 py-4 text-slate-500">{c.ownerEmail}</td>
                                <td className="px-5 py-4 text-slate-500">
                                    {c.created_at ? new Date(c.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London' }) : '-'}
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
                                <td className="px-5 py-4 text-slate-500 capitalize">{c.subscription_tier || '-'}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">No signups yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    )
}
