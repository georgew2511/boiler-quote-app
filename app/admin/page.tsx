import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { getLeadValue } from '@/lib/leadValue'
import { ALL_STAGES, getStageDefinition, isLeadStale } from '@/lib/pipelineStages'

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

function fmt(n: number) {
    return `£${n.toLocaleString('en-GB')}`
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

    const newThisMonth  = leads.filter((l) => isInRange(l.created_at, thisMonthStart, now))
    const newLastMonth  = leads.filter((l) => isInRange(l.created_at, lastMonthStart, thisMonthStart))
    const leadsChangePct = percentChange(newThisMonth.length, newLastMonth.length)

    const wonLeads    = leads.filter((l) => l.pipeline_stage === 'Invoiced & Paid')
    const lostLeads   = leads.filter((l) => l.pipeline_stage === 'Lost')
    const activeLeads = leads.filter((l) => l.pipeline_stage !== 'Invoiced & Paid' && l.pipeline_stage !== 'Lost')
    const closedCount = wonLeads.length + lostLeads.length
    const conversionRate = closedCount > 0 ? Math.round((wonLeads.length / closedCount) * 100) : 0
    const pipelineValue  = activeLeads.reduce((sum, l) => sum + getLeadValue(l), 0)

    const wonThisMonth  = wonLeads.filter((l) => isInRange(l.last_updated, thisMonthStart, now))
    const wonLastMonth  = wonLeads.filter((l) => isInRange(l.last_updated, lastMonthStart, thisMonthStart))
    const revenueThisMonth = wonThisMonth.reduce((sum, l) => sum + getLeadValue(l), 0)
    const revenueLastMonth = wonLastMonth.reduce((sum, l) => sum + getLeadValue(l), 0)
    const revenueChangePct = percentChange(revenueThisMonth, revenueLastMonth)

    const stageCounts = ALL_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => (l.pipeline_stage || 'New Lead') === stage.key)
        return { stage, count: stageLeads.length, value: stageLeads.reduce((sum, l) => sum + getLeadValue(l), 0) }
    })
    const maxStageCount = Math.max(1, ...stageCounts.map((s) => s.count))

    const sourceMap = new Map<string, number>()
    leads.forEach((l) => { const k = l.source || 'Unknown'; sourceMap.set(k, (sourceMap.get(k) || 0) + 1) })
    const sourceBreakdown = Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const maxSourceCount  = Math.max(1, ...sourceBreakdown.map(([, c]) => c))

    const staleLeads = leads
        .filter((l) => isLeadStale(l))
        .sort((a, b) => new Date(a.last_updated || a.created_at).getTime() - new Date(b.last_updated || b.created_at).getTime())
        .slice(0, 5)

    const last14Days = Array.from({ length: 14 }, (_, i) => {
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0); dayStart.setDate(dayStart.getDate() - (13 - i))
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
        return { date: dayStart, count: leads.filter((l) => isInRange(l.created_at, dayStart, dayEnd)).length }
    })
    const maxDayCount = Math.max(1, ...last14Days.map((d) => d.count))
    const recentLeads = leads.slice(0, 8)

    const kpis = [
        {
            label: 'New Leads',
            sub: 'this month',
            value: newThisMonth.length,
            change: leadsChangePct,
            accent: 'border-blue-500',
        },
        {
            label: 'Conversion Rate',
            sub: `${wonLeads.length} won · ${lostLeads.length} lost`,
            value: `${conversionRate}%`,
            change: null,
            accent: 'border-violet-500',
        },
        {
            label: 'Pipeline Value',
            sub: `${activeLeads.length} active leads`,
            value: fmt(pipelineValue),
            change: null,
            accent: 'border-amber-500',
        },
        {
            label: 'Revenue Won',
            sub: 'this month',
            value: fmt(revenueThisMonth),
            change: revenueChangePct,
            accent: 'border-emerald-500',
        },
    ]

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">{company.company_name}</h1>
                    <p className="mt-0.5 text-sm text-slate-500">Here's how your business is performing today.</p>
                </div>
                <Link
                    href="/logout"
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
                >
                    Log out
                </Link>
            </div>

            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`rounded-2xl border-l-4 ${kpi.accent} bg-white px-5 py-4 border border-slate-100`}>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{kpi.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{kpi.value}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            {kpi.change !== null ? (
                                <span className={kpi.change >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
                                    {kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change)}%
                                </span>
                            ) : null}
                            {kpi.change !== null ? ' · ' : ''}{kpi.sub}
                        </p>
                    </div>
                ))}
            </div>

            {/* Mid row */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Pipeline funnel */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 lg:col-span-2">
                    <h2 className="text-sm font-semibold text-slate-900">Pipeline Funnel</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Where your leads are sitting right now</p>
                    <div className="mt-5 space-y-3">
                        {stageCounts.map(({ stage, count, value }) => (
                            <Link key={stage.key} href="/admin/leads" className="block rounded-xl p-2 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between text-xs">
                                    <span className={`rounded-full px-2.5 py-0.5 font-semibold ${stage.color}`}>{stage.label}</span>
                                    <span className="text-slate-400">
                                        {count} {count === 1 ? 'lead' : 'leads'}
                                        {value > 0 && stage.key !== 'Lost' ? ` · ${fmt(value)}` : ''}
                                    </span>
                                </div>
                                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                                    <div
                                        className={`h-1.5 rounded-full ${stage.key === 'Lost' ? 'bg-rose-400' : 'bg-blue-500'}`}
                                        style={{ width: `${(count / maxStageCount) * 100}%` }}
                                    />
                                </div>
                            </Link>
                        ))}
                        {stageCounts.every((s) => s.count === 0) && (
                            <p className="py-4 text-center text-sm text-slate-400">No leads yet.</p>
                        )}
                    </div>
                </div>

                {/* Lead sources */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6">
                    <h2 className="text-sm font-semibold text-slate-900">Lead Sources</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Where enquiries are coming from</p>
                    <div className="mt-5 space-y-3.5">
                        {sourceBreakdown.length === 0 && (
                            <p className="text-sm text-slate-400">No source data yet.</p>
                        )}
                        {sourceBreakdown.map(([source, count]) => (
                            <div key={source}>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-slate-700">{source}</span>
                                    <span className="text-slate-400">{count}</span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
                                    <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${(count / maxSourceCount) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Trend chart */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 lg:col-span-2">
                    <h2 className="text-sm font-semibold text-slate-900">New Leads — Last 14 Days</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Daily enquiry volume from your calculator</p>
                    <div className="mt-5 flex h-28 items-end gap-1.5">
                        {last14Days.map(({ date, count }) => (
                            <div key={date.toISOString()} className="flex flex-1 flex-col items-center gap-1.5">
                                <div className="flex h-20 w-full items-end">
                                    <div
                                        title={`${count} on ${date.toLocaleDateString('en-GB')}`}
                                        className="w-full rounded-t bg-blue-500 transition-all"
                                        style={{ height: `${Math.max(3, (count / maxDayCount) * 100)}%`, opacity: count === 0 ? 0.2 : 1 }}
                                    />
                                </div>
                                <span className="text-[10px] text-slate-400 tabular-nums">
                                    {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Follow-up */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6">
                    <h2 className="text-sm font-semibold text-slate-900">Needs Follow-Up</h2>
                    <p className="mt-0.5 text-xs text-slate-400">No update in 5+ days</p>
                    <div className="mt-5 space-y-2">
                        {staleLeads.length === 0 && (
                            <p className="text-sm text-slate-400">All caught up — nothing stale.</p>
                        )}
                        {staleLeads.map((lead) => (
                            <Link
                                key={lead.id}
                                href={`/admin/leads/${lead.id}`}
                                className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3 hover:bg-orange-100 transition-colors"
                            >
                                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-400" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-800">{lead.name || 'Unnamed lead'}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {getStageDefinition(lead.pipeline_stage).label} · last updated{' '}
                                        {new Date(lead.last_updated || lead.created_at).toLocaleDateString('en-GB')}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent leads table */}
            <div className="rounded-2xl border border-slate-100 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Recent Leads</h2>
                        <p className="mt-0.5 text-xs text-slate-400">Latest enquiries from your quote calculator</p>
                    </div>
                    <Link href="/admin/leads" className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
                        View all
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                {['Name', 'Postcode', 'Phone', 'Value', 'Stage', 'Date'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {recentLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3">
                                        <Link href={`/admin/leads/${lead.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                                            {lead.name || 'Unknown'}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3 text-slate-600">{lead.postcode || '—'}</td>
                                    <td className="px-5 py-3 text-slate-600">{lead.phone || '—'}</td>
                                    <td className="px-5 py-3 font-medium text-slate-900">{fmt(getLeadValue(lead))}</td>
                                    <td className="px-5 py-3">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStageDefinition(lead.pipeline_stage).color}`}>
                                            {getStageDefinition(lead.pipeline_stage).label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-400">
                                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '—'}
                                    </td>
                                </tr>
                            ))}
                            {recentLeads.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                                        No leads yet. Share your calculator to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
