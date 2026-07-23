import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { SEGMENT_LABELS, CampaignSegment } from '@/lib/campaignSegments'

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    scheduled: 'bg-blue-100 text-blue-700',
    sending: 'bg-amber-100 text-amber-700',
    sent: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
}

export default async function CampaignsPage() {
    const adminClient = createAdminClient()

    const { data: campaigns, error } = await adminClient
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return <div className="p-8">Error loading campaigns: {error.message}</div>
    }

    return (
        <main>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold">Campaigns</h1>
                    <p className="mt-2 text-gray-600">Marketing emails sent to your company base.</p>
                </div>
                <Link
                    href="/superadmin/campaigns/new"
                    className="rounded-xl border border-emerald-700 bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
                >
                    New Campaign
                </Link>
            </div>

            <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-4">Subject</th>
                            <th className="px-5 py-4">Segment</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Recipients</th>
                            <th className="px-5 py-4">Sent</th>
                            <th className="px-5 py-4">Scheduled / Sent At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(campaigns || []).map((c) => (
                            <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="px-5 py-4 font-medium text-slate-900">{c.subject}</td>
                                <td className="px-5 py-4 text-slate-500">{SEGMENT_LABELS[c.segment as CampaignSegment] || c.segment}</td>
                                <td className="px-5 py-4">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[c.status]}`}>
                                        {c.status}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-slate-500">{c.recipient_count}</td>
                                <td className="px-5 py-4 text-slate-500">{c.sent_count}</td>
                                <td className="px-5 py-4 text-slate-500">
                                    {c.sent_at
                                        ? new Date(c.sent_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })
                                        : c.scheduled_at
                                        ? new Date(c.scheduled_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })
                                        : '-'}
                                </td>
                            </tr>
                        ))}
                        {(campaigns || []).length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">No campaigns yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    )
}
