import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { getLeadValue } from '@/lib/leadValue'
import { RANGE_PRESETS, resolveDateRange, isInRange } from '@/lib/dateRanges'

const SOURCE_COLORS = [
    'bg-amber-400',
    'bg-sky-400',
    'bg-indigo-400',
    'bg-emerald-400',
    'bg-rose-400',
    'bg-purple-400',
    'bg-teal-400',
    'bg-orange-400',
]

function hadSurveyOrPhotos(lead: any) {
    const hadHomeSurvey = !!(lead.survey_date || lead.survey_address)
    const hadPhotoSurvey = !!(
        lead.boiler_photo ||
        lead.flue_photo ||
        lead.gas_meter_photo ||
        lead.pipework_photo ||
        lead.cylinder_photo
    )
    return hadHomeSurvey || hadPhotoSurvey
}

function computeMetrics(leads: any[]) {
    const total = leads.length
    const reached = leads.filter(hadSurveyOrPhotos)
    const won = leads.filter((l) => l.pipeline_stage === 'Invoiced & Paid')
    const lost = leads.filter((l) => l.pipeline_stage === 'Lost')
    const lostAfterSurvey = lost.filter(hadSurveyOrPhotos)

    const totalSaleValue = won.reduce((sum, l) => sum + getLeadValue(l), 0)
    const avgJobValue = won.length > 0 ? totalSaleValue / won.length : 0

    return {
        total,
        reachedCount: reached.length,
        wonCount: won.length,
        lostCount: lost.length,
        lostAfterSurveyCount: lostAfterSurvey.length,
        conversionToSurveyPct: total > 0 ? Math.round((reached.length / total) * 100) : 0,
        conversionToSalePct: reached.length > 0 ? Math.round((won.length / reached.length) * 100) : 0,
        totalSaleValue,
        avgJobValue,
    }
}

function buildTrend(leads: any[], range: { start: Date; end: Date }) {
    const spanDays = Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000) + 1

    if (spanDays <= 31) {
        return Array.from({ length: spanDays }, (_, i) => {
            const dayStart = new Date(range.start)
            dayStart.setDate(dayStart.getDate() + i)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(dayStart)
            dayEnd.setHours(23, 59, 59, 999)

            return {
                label: dayStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                count: leads.filter((l) => isInRange(l.created_at, { start: dayStart, end: dayEnd } as any)).length,
            }
        })
    }

    if (spanDays <= 180) {
        const weeks: { label: string; count: number }[] = []
        let cursor = new Date(range.start)

        while (cursor <= range.end) {
            const weekStart = new Date(cursor)
            const weekEnd = new Date(cursor)
            weekEnd.setDate(weekEnd.getDate() + 6)
            weekEnd.setHours(23, 59, 59, 999)

            weeks.push({
                label: weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                count: leads.filter((l) => isInRange(l.created_at, { start: weekStart, end: weekEnd } as any)).length,
            })

            cursor.setDate(cursor.getDate() + 7)
        }

        return weeks
    }

    const months: { label: string; count: number }[] = []
    let cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1)

    while (cursor <= range.end) {
        const monthStart = new Date(cursor)
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)

        months.push({
            label: monthStart.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
            count: leads.filter((l) => isInRange(l.created_at, { start: monthStart, end: monthEnd } as any)).length,
        })

        cursor.setMonth(cursor.getMonth() + 1)
    }

    return months
}

export default async function AnalyticsPage({
    searchParams,
}: {
    searchParams: Promise<{ range?: string; start?: string; end?: string }>
}) {
    const params = await searchParams
    const company = await getCurrentCompany()
    const range = resolveDateRange(params)

    const { data: leadsRaw } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', company.id)

    const allLeads = (leadsRaw || []).filter((l) => l.status !== 'Test')
    const leads = allLeads.filter((l) => isInRange(l.created_at, range))

    const overall = computeMetrics(leads)

    const sourceMap = new Map<string, any[]>()
    leads.forEach((l) => {
        const key = l.source || 'Unknown'
        if (!sourceMap.has(key)) sourceMap.set(key, [])
        sourceMap.get(key)!.push(l)
    })
    const sourceBreakdown = Array.from(sourceMap.entries())
        .map(([source, sourceLeads]) => ({ source, ...computeMetrics(sourceLeads) }))
        .sort((a, b) => b.total - a.total)

    const lostReasonMap = new Map<string, number>()
    leads
        .filter((l) => l.pipeline_stage === 'Lost')
        .forEach((l) => {
            const reason = l.lost_reason || 'Not specified'
            lostReasonMap.set(reason, (lostReasonMap.get(reason) || 0) + 1)
        })
    const lostReasons = Array.from(lostReasonMap.entries()).sort((a, b) => b[1] - a[1])

    const trend = buildTrend(leads, range)
    const maxTrendCount = Math.max(1, ...trend.map((t) => t.count))

    const isActivePreset = (key: string) => !params.start && (params.range || '30d') === key

    return (
        <main className="min-h-screen bg-slate-100">
            <section className="p-10">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h2 className="text-4xl font-bold text-slate-900">Analytics</h2>
                        <p className="mt-2 text-slate-500">
                            Deeper insights into how leads move through your pipeline — {range.label}.
                        </p>
                    </div>
                    <Link
                        href="/admin"
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Date range controls */}
                <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
                    {RANGE_PRESETS.map((preset) => (
                        <Link
                            key={preset.key}
                            href={`/admin/analytics?range=${preset.key}`}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold ${isActivePreset(preset.key)
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {preset.label}
                        </Link>
                    ))}

                    <form action="/admin/analytics" className="ml-auto flex items-center gap-2">
                        <input
                            type="date"
                            name="start"
                            defaultValue={params.start}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                            type="date"
                            name="end"
                            defaultValue={params.end}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <button
                            type="submit"
                            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                        >
                            Apply
                        </button>
                    </form>
                </div>

                {/* Summary */}
                <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 p-6">
                        <span className="h-3 w-3 rounded-full bg-slate-400" />
                        <h3 className="text-xl font-bold text-slate-900">Summary</h3>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50">
                        <SummaryStat
                            value={`${overall.conversionToSurveyPct}%`}
                            label="Conv. to Survey"
                            sub={`${overall.reachedCount} / ${overall.total} leads`}
                        />
                        <SummaryStat
                            value={`${overall.lostAfterSurveyCount}`}
                            label="Lost After Survey"
                            sub={`of ${overall.reachedCount} surveys`}
                        />
                        <SummaryStat
                            value={`${overall.conversionToSalePct}%`}
                            label="Conv. to Sale"
                            sub={`${overall.wonCount} / ${overall.reachedCount} surveys`}
                        />
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-slate-100">
                        <SummaryStat value={`£${Math.round(overall.totalSaleValue).toLocaleString()}`} label="Total sales" />
                        <SummaryStat value={`£${Math.round(overall.avgJobValue).toLocaleString()}`} label="Avg. job value" />
                        <SummaryStat value={`${overall.lostCount}`} label="Lost leads" />
                    </div>
                </div>

                {/* Trend chart */}
                <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900">Lead Volume Trend</h3>
                    <p className="mt-1 text-sm text-slate-500">New leads across {range.label.toLowerCase()}.</p>

                    <div className="mt-6 flex h-32 items-end gap-1 overflow-x-auto">
                        {trend.map((point, i) => (
                            <div key={i} className="flex min-w-[24px] flex-1 flex-col items-center gap-2">
                                <div className="flex h-24 w-full items-end">
                                    <div
                                        title={`${point.count} on ${point.label}`}
                                        className="w-full rounded-t-md bg-emerald-500"
                                        style={{ height: `${Math.max(4, (point.count / maxTrendCount) * 100)}%` }}
                                    />
                                </div>
                                <span className="whitespace-nowrap text-[10px] text-slate-400">{point.label}</span>
                            </div>
                        ))}
                        {trend.length === 0 && (
                            <p className="text-sm text-slate-400">No data for this range.</p>
                        )}
                    </div>
                </div>

                {/* Per-source breakdown */}
                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    {sourceBreakdown.length === 0 && (
                        <p className="text-sm text-slate-400">No leads with source data in this range.</p>
                    )}
                    {sourceBreakdown.map((s, i) => (
                        <div key={s.source} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
                                <span className={`h-3 w-3 rounded-full ${SOURCE_COLORS[i % SOURCE_COLORS.length]}`} />
                                <h4 className="text-lg font-bold text-slate-900">{s.source}</h4>
                            </div>

                            <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 text-center">
                                <SummaryStat value={`${s.conversionToSurveyPct}%`} label="Conv. to Survey" sub={`${s.reachedCount} / ${s.total}`} compact />
                                <SummaryStat value={`${s.lostAfterSurveyCount}`} label="Lost After Survey" sub={`of ${s.reachedCount}`} compact />
                                <SummaryStat value={`${s.conversionToSalePct}%`} label="Conv. to Sale" sub={`${s.wonCount} / ${s.reachedCount}`} compact />
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-slate-100 text-center">
                                <SummaryStat value={`£${Math.round(s.totalSaleValue).toLocaleString()}`} label="Total sales" compact />
                                <SummaryStat value={`£${Math.round(s.avgJobValue).toLocaleString()}`} label="Avg. job value" compact />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Lost reasons */}
                <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900">Why Leads Are Lost</h3>
                    <p className="mt-1 text-sm text-slate-500">Reasons captured when marking a lead as lost.</p>

                    <div className="mt-6 space-y-3">
                        {lostReasons.length === 0 && (
                            <p className="text-sm text-slate-400">No lost leads in this range.</p>
                        )}
                        {lostReasons.map(([reason, count]) => {
                            const max = Math.max(1, ...lostReasons.map(([, c]) => c))
                            return (
                                <div key={reason}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-slate-700">{reason}</span>
                                        <span className="text-slate-500">{count}</span>
                                    </div>
                                    <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                        <div
                                            className="h-2 rounded-full bg-rose-400"
                                            style={{ width: `${(count / max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>
        </main>
    )
}

function SummaryStat({
    value,
    label,
    sub,
    compact,
}: {
    value: string
    label: string
    sub?: string
    compact?: boolean
}) {
    return (
        <div className={compact ? 'p-4' : 'p-6'}>
            <p className={`font-bold text-slate-900 ${compact ? 'text-xl' : 'text-3xl'}`}>{value}</p>
            <p className={`mt-1 text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</p>
            {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
    )
}
