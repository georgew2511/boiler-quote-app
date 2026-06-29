import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { getLeadValue } from '@/lib/leadValue'
import {
    ALL_STAGES,
    getStageDefinition,
    isLeadStale,
} from '@/lib/pipelineStages'

function startOfMonth(monthsAgo: number) {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    d.setMonth(d.getMonth() - monthsAgo)
    return d
}

function isInRange(dateStr: string | null, start: Date, end: Date) {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d >= start && d < end
}

function percentChange(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
}

export default async function AdminPage() {
    const company = await getCurrentCompany()
    const supabase = await createClient()

    const { data: leadsRaw } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

    const leads = (leadsRaw || []).filter((l) => l.status !== 'Test')

    const thisMonthStart = startOfMonth(0)
    const lastMonthStart = startOfMonth(1)
    const now = new Date()

    const newThisMonth = leads.filter((l) => isInRange(l.created_at, thisMonthStart, now))
    const newLastMonth = leads.filter((l) => isInRange(l.created_at, lastMonthStart, thisMonthStart))
    const leadsChangePct = percentChange(newThisMonth.length, newLastMonth.length)

    const wonLeads = leads.filter((l) => l.pipeline_stage === 'Invoiced & Paid')
    const lostLeads = leads.filter((l) => l.pipeline_stage === 'Lost')
    const activeLeads = leads.filter(
        (l) => l.pipeline_stage !== 'Invoiced & Paid' && l.pipeline_stage !== 'Lost'
    )
    const closedCount = wonLeads.length + lostLeads.length
    const conversionRate = closedCount > 0 ? Math.round((wonLeads.length / closedCount) * 100) : 0

    const pipelineValue = activeLeads.reduce((sum, l) => sum + getLeadValue(l), 0)

    const wonThisMonth = wonLeads.filter((l) => isInRange(l.last_updated, thisMonthStart, now))
    const wonLastMonth = wonLeads.filter((l) => isInRange(l.last_updated, lastMonthStart, thisMonthStart))
    const revenueThisMonth = wonThisMonth.reduce((sum, l) => sum + getLeadValue(l), 0)
    const revenueLastMonth = wonLastMonth.reduce((sum, l) => sum + getLeadValue(l), 0)
    const revenueChangePct = percentChange(revenueThisMonth, revenueLastMonth)

    const stageCounts = ALL_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => (l.pipeline_stage || 'New Lead') === stage.key)
        return {
            stage,
            count: stageLeads.length,
            value: stageLeads.reduce((sum, l) => sum + getLeadValue(l), 0),
        }
    })
    const maxStageCount = Math.max(1, ...stageCounts.map((s) => s.count))

    const sourceMap = new Map<string, number>()
    leads.forEach((l) => {
        const key = l.source || 'Unknown'
        sourceMap.set(key, (sourceMap.get(key) || 0) + 1)
    })
    const sourceBreakdown = Array.from(sourceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    const maxSourceCount = Math.max(1, ...sourceBreakdown.map(([, count]) => count))

    const staleLeads = leads
        .filter((l) => isLeadStale(l))
        .sort((a, b) => {
            const aDate = new Date(a.last_updated || a.created_at).getTime()
            const bDate = new Date(b.last_updated || b.created_at).getTime()
            return aDate - bDate
        })
        .slice(0, 5)

    const last14Days = Array.from({ length: 14 }, (_, i) => {
        const dayStart = new Date()
        dayStart.setHours(0, 0, 0, 0)
        dayStart.setDate(dayStart.getDate() - (13 - i))
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 1)

        return {
            date: dayStart,
            count: leads.filter((l) => isInRange(l.created_at, dayStart, dayEnd)).length,
        }
    })
    const maxDayCount = Math.max(1, ...last14Days.map((d) => d.count))

    const recentLeads = leads.slice(0, 8)

    return (
        <main className="min-h-screen bg-slate-100">
            <section className="p-10">
                <div className="mb-10 flex items-start justify-between">
                    <div>
                        <h2 className="text-5xl font-bold text-slate-900">
                            {company.company_name} Dashboard
                        </h2>
                        <p className="mt-3 text-lg text-slate-500">
                            How your business is performing, at a glance.
                        </p>
                    </div>

                    <Link
                        href="/logout"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        Log Out
                    </Link>
                </div>

                {/* KPI cards */}
                <div className="grid gap-5 lg:grid-cols-4">
                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">New Leads This Month</p>
                        <p className="mt-2 text-4xl font-bold text-slate-900">{newThisMonth.length}</p>
                        <p className={`mt-2 text-sm font-medium ${leadsChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {leadsChangePct >= 0 ? '↑' : '↓'} {Math.abs(leadsChangePct)}% vs last month
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Conversion Rate</p>
                        <p className="mt-2 text-4xl font-bold text-slate-900">{conversionRate}%</p>
                        <p className="mt-2 text-sm text-slate-500">
                            {wonLeads.length} won &middot; {lostLeads.length} lost
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Pipeline Value</p>
                        <p className="mt-2 text-4xl font-bold text-slate-900">
                            £{pipelineValue.toLocaleString()}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                            Across {activeLeads.length} active leads
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Revenue Won This Month</p>
                        <p className="mt-2 text-4xl font-bold text-slate-900">
                            £{revenueThisMonth.toLocaleString()}
                        </p>
                        <p className={`mt-2 text-sm font-medium ${revenueChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {revenueChangePct >= 0 ? '↑' : '↓'} {Math.abs(revenueChangePct)}% vs last month
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    {/* Pipeline funnel */}
                    <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
                        <h3 className="text-xl font-bold text-slate-900">Pipeline Funnel</h3>
                        <p className="mt-1 text-sm text-slate-500">Where your leads are sitting right now.</p>

                        <div className="mt-6 space-y-3">
                            {stageCounts.map(({ stage, count, value }) => (
                                <Link
                                    key={stage.key}
                                    href="/admin/leads"
                                    className="block rounded-xl p-2 transition hover:bg-slate-50"
                                >
                                    <div className="flex items-center justify-between text-sm">
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stage.color}`}>
                                            {stage.label}
                                        </span>
                                        <span className="text-slate-500">
                                            {count} {count === 1 ? 'lead' : 'leads'}
                                            {value > 0 && stage.key !== 'Lost' ? ` · £${value.toLocaleString()}` : ''}
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                                        <div
                                            className={`h-2 rounded-full ${stage.key === 'Lost' ? 'bg-rose-400' : 'bg-emerald-500'}`}
                                            style={{ width: `${(count / maxStageCount) * 100}%` }}
                                        />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Lead sources */}
                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900">Lead Sources</h3>
                        <p className="mt-1 text-sm text-slate-500">Where your enquiries are coming from.</p>

                        <div className="mt-6 space-y-4">
                            {sourceBreakdown.length === 0 && (
                                <p className="text-sm text-slate-400">No source data yet.</p>
                            )}
                            {sourceBreakdown.map(([source, count]) => (
                                <div key={source}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-slate-700">{source}</span>
                                        <span className="text-slate-500">{count}</span>
                                    </div>
                                    <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                        <div
                                            className="h-2 rounded-full bg-blue-500"
                                            style={{ width: `${(count / maxSourceCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    {/* New leads trend */}
                    <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
                        <h3 className="text-xl font-bold text-slate-900">New Leads — Last 14 Days</h3>
                        <p className="mt-1 text-sm text-slate-500">Daily enquiry volume from your calculator.</p>

                        <div className="mt-6 flex h-32 items-end gap-2">
                            {last14Days.map(({ date, count }) => (
                                <div key={date.toISOString()} className="flex flex-1 flex-col items-center gap-2">
                                    <div className="flex h-24 w-full items-end">
                                        <div
                                            title={`${count} on ${date.toLocaleDateString('en-GB')}`}
                                            className="w-full rounded-t-md bg-emerald-500 transition-all"
                                            style={{ height: `${Math.max(4, (count / maxDayCount) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Needs follow-up */}
                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900">⏰ Needs Follow-Up</h3>
                        <p className="mt-1 text-sm text-slate-500">Leads with no update in 5+ days.</p>

                        <div className="mt-6 space-y-3">
                            {staleLeads.length === 0 && (
                                <p className="text-sm text-slate-400">Nothing stale — nice work staying on top of it.</p>
                            )}
                            {staleLeads.map((lead) => (
                                <Link
                                    key={lead.id}
                                    href={`/admin/leads/${lead.id}`}
                                    className="block rounded-xl border border-orange-100 bg-orange-50 p-3 transition hover:bg-orange-100"
                                >
                                    <p className="font-semibold text-slate-900">{lead.name || 'Unnamed lead'}</p>
                                    <p className="text-xs text-slate-500">
                                        {getStageDefinition(lead.pipeline_stage).label}
                                        {' · '}
                                        Last updated {new Date(lead.last_updated || lead.created_at).toLocaleDateString('en-GB')}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent leads */}
                <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-900">Recent Leads</h3>
                            <p className="mt-1 text-slate-500">Latest enquiries received from the quote calculator.</p>
                        </div>

                        <Link
                            href="/admin/leads"
                            className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
                        >
                            View All Leads
                        </Link>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-4 text-left">Name</th>
                                    <th className="px-5 py-4 text-left">Postcode</th>
                                    <th className="px-5 py-4 text-left">Phone</th>
                                    <th className="px-5 py-4 text-left">Value</th>
                                    <th className="px-5 py-4 text-left">Stage</th>
                                    <th className="px-5 py-4 text-left">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLeads.map((lead) => (
                                    <tr key={lead.id} className="border-t border-slate-200 hover:bg-slate-50">
                                        <td className="px-5 py-4">
                                            <Link
                                                href={`/admin/leads/${lead.id}`}
                                                className="font-semibold text-blue-600 hover:underline"
                                            >
                                                {lead.name || 'Unknown'}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-4">{lead.postcode || '-'}</td>
                                        <td className="px-5 py-4">{lead.phone || '-'}</td>
                                        <td className="px-5 py-4 font-medium">
                                            £{getLeadValue(lead).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStageDefinition(lead.pipeline_stage).color}`}>
                                                {getStageDefinition(lead.pipeline_stage).label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500">
                                            {lead.created_at
                                                ? new Date(lead.created_at).toLocaleDateString('en-GB')
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {recentLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                                            No leads yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>
    )
}
