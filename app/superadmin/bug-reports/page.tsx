import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

const STATUS_STYLES: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    investigating: 'bg-amber-100 text-amber-700',
    resolved: 'bg-green-100 text-green-700',
}

export default async function BugReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>
}) {
    const { status } = await searchParams
    const adminClient = createAdminClient()

    let query = adminClient
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false })

    if (status && status !== 'all') {
        query = query.eq('status', status)
    }

    const { data: reports, error } = await query

    if (error) {
        return <div className="p-8">Error loading bug reports: {error.message}</div>
    }

    async function setStatus(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        const reportId = formData.get('report_id') as string
        const newStatus = formData.get('status') as string

        const { error: updateError } = await createAdminClient()
            .from('bug_reports')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', reportId)

        if (updateError) {
            console.error('Error updating bug report status:', updateError)
        }

        redirect('/superadmin/bug-reports')
    }

    const filters = ['all', 'new', 'investigating', 'resolved']

    return (
        <main>
            <h1 className="text-4xl font-bold">Bug Reports</h1>
            <p className="mt-2 text-gray-600">Everything submitted through "Report a problem" across all companies.</p>

            <div className="mt-6 flex gap-2">
                {filters.map((f) => (
                    <a
                        key={f}
                        href={f === 'all' ? '/superadmin/bug-reports' : `/superadmin/bug-reports?status=${f}`}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                            (status || 'all') === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {f}
                    </a>
                ))}
            </div>

            <div className="mt-6 space-y-4">
                {(reports || []).length === 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-sm">
                        No bug reports here.
                    </div>
                )}
                {(reports || []).map((r) => (
                    <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="font-semibold text-slate-900">{r.company_name}</div>
                                <div className="text-xs text-slate-400">{r.reporter_email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[r.status]}`}>
                                    {r.status}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
                                </span>
                            </div>
                        </div>

                        {r.page_url && (
                            <div className="mt-2 text-xs text-slate-400">Page: {r.page_url}</div>
                        )}

                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{r.message}</p>

                        <form action={setStatus} className="mt-4 flex items-center gap-2">
                            <input type="hidden" name="report_id" value={r.id} />
                            <select
                                name="status"
                                defaultValue={r.status}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                            >
                                <option value="new">New</option>
                                <option value="investigating">Investigating</option>
                                <option value="resolved">Resolved</option>
                            </select>
                            <button
                                type="submit"
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                                Update status
                            </button>
                        </form>
                    </div>
                ))}
            </div>
        </main>
    )
}
