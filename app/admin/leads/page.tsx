import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { getLeadValue } from '@/lib/leadValue'
import { getStageDefinition } from '@/lib/pipelineStages'
import KanbanBoard from './KanbanBoard'

export default async function LeadsPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const { view } = await searchParams
    const isListView = view === 'list'

    const company = await getCurrentCompany()
    const supabase = await createClient()

    const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

    async function deleteLead(id: number) {
        'use server'
        const { error } = await supabase.from('leads').delete().eq('id', id).eq('company_id', company.id)
        if (error) throw new Error(`Failed to delete lead: ${JSON.stringify(error)}`)
        revalidatePath('/admin/leads')
        redirect('/admin/leads')
    }

    const totalValue = (leads || []).reduce((sum, l) => sum + getLeadValue(l), 0)
    const wonCount   = leads?.filter((l) => l.pipeline_stage === 'Invoiced & Paid').length ?? 0
    const newCount   = leads?.filter((l) => !l.pipeline_stage || l.pipeline_stage === 'New Lead').length ?? 0

    const stats = [
        { label: 'Total Leads',       value: leads?.length ?? 0,                    accent: 'border-blue-500' },
        { label: 'New',               value: newCount,                              accent: 'border-violet-500' },
        { label: 'Won',               value: wonCount,                              accent: 'border-emerald-500' },
        { label: 'Total Quote Value', value: `£${totalValue.toLocaleString('en-GB')}`, accent: 'border-amber-500' },
    ]

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
                    <p className="mt-0.5 text-sm text-slate-500">Manage and track your quote requests.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                    <div key={s.label} className={`rounded-2xl border border-slate-100 border-l-4 ${s.accent} bg-white px-5 py-4`}>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
                <a
                    href="/admin/leads"
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${!isListView ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Pipeline
                </a>
                <a
                    href="/admin/leads?view=list"
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isListView ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    List
                </a>
            </div>

            {/* Kanban */}
            {!isListView && (
                <KanbanBoard
                    leads={(leads || []).map((lead) => ({ ...lead, value: getLeadValue(lead) }))}
                />
            )}

            {/* List view */}
            {isListView && (
                <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                    <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Search customer…"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition w-56"
                        />
                        <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition bg-white">
                            <option>All stages</option>
                            <option>New Lead</option>
                            <option>Quoted</option>
                            <option>Accepted</option>
                            <option>Invoiced & Paid</option>
                            <option>Lost</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {['Customer', 'Date', 'Postcode', 'Survey Address', 'Survey Booking', 'Boiler', 'Value', 'Status', ''].map((h) => (
                                        <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {(!leads || leads.length === 0) && (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">No leads found.</td>
                                    </tr>
                                )}
                                {leads?.map((lead) => {
                                    const raw = lead.raw_data || lead.answers || {}
                                    const surveyAddress = lead.survey_address || lead.house_name || raw.houseName || raw.addressLine1
                                    const surveyDate = lead.survey_date || raw.surveyDate
                                    const surveySlot = lead.survey_time_slot || raw.surveyTimeSlot
                                    const deleteLeadWithId = deleteLead.bind(null, lead.id)
                                    const stage = getStageDefinition(lead.pipeline_stage)

                                    return (
                                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-3 font-medium">
                                                <a href={`/admin/leads/${lead.id}`} className="text-blue-600 hover:text-blue-700">
                                                    {lead.name || `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || 'Unknown'}
                                                </a>
                                            </td>
                                            <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                                                {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">{lead.postcode || '—'}</td>
                                            <td className="px-5 py-3 text-slate-600 max-w-[180px] truncate">
                                                {surveyAddress || <span className="text-slate-300">Not booked</span>}
                                            </td>
                                            <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                                                {surveyDate || surveySlot
                                                    ? <><div>{surveyDate || '—'}</div><div className="text-xs text-slate-400">{surveySlot}</div></>
                                                    : <span className="text-slate-300">Not booked</span>}
                                            </td>
                                            <td className="px-5 py-3 text-slate-600 max-w-[140px] truncate">{lead.boiler_name || '—'}</td>
                                            <td className="px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                                                £{getLeadValue(lead).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${lead.status === 'Test' ? 'bg-amber-100 text-amber-700' : stage.color}`}>
                                                    {lead.status === 'Test' ? 'Test' : stage.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <a href={`/admin/leads/${lead.id}`} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition-colors whitespace-nowrap">
                                                        View
                                                    </a>
                                                    <form action={deleteLeadWithId}>
                                                        <button type="submit" className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
                                                            Delete
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
