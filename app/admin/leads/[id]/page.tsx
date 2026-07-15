import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getStageDefinition } from '@/lib/pipelineStages'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import StageSelector from './StageSelector'

export default async function LeadDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const company = await getCurrentCompany()
    const supabase = await createClient()

    const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('company_id', company.id)
        .single()

    if (error || !lead) {
        return (
            <div className="mx-auto max-w-7xl">
                <h1 className="text-xl font-semibold text-slate-900">Lead not found</h1>
                <Link href="/admin/leads" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
                    Back to Leads
                </Link>
            </div>
        )
    }

    async function saveNotes(formData: FormData) {
        'use server'

        const notes = formData.get('notes') as string

        const { error: updateError } = await supabase
            .from('leads')
            .update({
                notes,
                last_updated: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('company_id', company.id)

        if (updateError) {
            throw new Error(JSON.stringify(updateError))
        }

        revalidatePath(`/admin/leads/${id}`)
    }

    async function saveSource(formData: FormData) {
        'use server'

        const sourceValues = formData.getAll('source') as string[]
        const source = sourceValues.find(v => v && v !== 'Other') || ''

        const { error: updateError } = await supabase
            .from('leads')
            .update({
                source,
                last_updated: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('company_id', company.id)

        if (updateError) {
            throw new Error(JSON.stringify(updateError))
        }

        revalidatePath(`/admin/leads/${id}`)
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">{lead.name}</h1>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Created {lead.created_at ? new Date(lead.created_at).toLocaleString('en-GB') : '-'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {lead.phone && (
                            <a
                                href={`tel:${lead.phone}`}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                title="Call"
                            >
                                📞 Call
                            </a>
                        )}
                        {lead.email && (
                            <a
                                href={`mailto:${lead.email}`}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                title="Email"
                            >
                                ✉️ Email
                            </a>
                        )}
                        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                            {lead.source || 'Unknown Source'}
                        </span>
                        <StageSelector leadId={lead.id} currentStage={(lead as any).pipeline_stage} />
                        <Link
                            href="/admin/leads"
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            Back
                        </Link>
                    </div>
                </div>

                {(lead as any).pipeline_stage === 'Lost' && (lead as any).lost_reason && (
                    <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        <strong>Lost reason:</strong> {(lead as any).lost_reason}
                    </p>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lead Value</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        £{
                            Array.isArray((lead as any).recommended_boilers)
                                ? Math.max(
                                    ...(lead as any).recommended_boilers.map(
                                        (b: any) => Number(b.price || 0)
                                    )
                                ).toLocaleString()
                                : Number(lead.quote_price || 0).toLocaleString()
                        }
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lead Source</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {lead.source || 'Unknown'}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {lead.status || 'New Lead'}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Boilers Shown</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {(lead as any).recommended_boilers?.length || 0}
                    </p>
                </div>
            </div>

            <div className="grid items-stretch gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-6">
                    <h2 className="mb-5 text-lg font-semibold text-slate-900">Contact</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-slate-100 pb-3">
                            <span className="text-sm text-slate-500">Name</span>
                            <span className="font-medium text-slate-900">{lead.name || '-'}</span>
                        </div>

                        <div className="flex justify-between border-b border-slate-100 pb-3">
                            <span className="text-sm text-slate-500">Phone</span>
                            <span className="font-medium text-slate-900">{lead.phone || '-'}</span>
                        </div>

                        <div className="flex justify-between border-b border-slate-100 pb-3">
                            <span className="text-sm text-slate-500">Email</span>
                            <span className="break-all text-right font-medium text-slate-900">{lead.email || '-'}</span>
                        </div>

                        <div className="flex justify-between border-b border-slate-100 pb-3">
                            <span className="text-sm text-slate-500">Postcode</span>
                            <span className="font-medium text-slate-900">{lead.postcode || '-'}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Pipeline Stage</span>
                            <span className="font-medium text-slate-900">{getStageDefinition((lead as any).pipeline_stage).label}</span>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-6">
                    <h2 className="mb-5 text-lg font-semibold text-slate-900">Lead Source</h2>
                    <form action={saveSource} className="space-y-4">
                        <select
                            name="source"
                            defaultValue={lead.source || ''}
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">Select lead source</option>
                            <option value="Google Ads">Google Ads</option>
                            <option value="Google Organic">Google Organic</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Referral">Referral</option>
                            <option value="Website">Website</option>
                            <option value="Checkatrade">Checkatrade</option>
                            <option value="Google Business Profile">Google Business Profile</option>
                            <option value="Leaflet">Leaflet</option>
                            <option value="Estate Agent">Estate Agent</option>
                            <option value="Existing Customer">Existing Customer</option>
                            <option value="Other">Other (enter below)</option>
                        </select>
                        <input
                            type="text"
                            name="source"
                            defaultValue={
                                lead.source && ![
                                    'Google Ads',
                                    'Google Organic',
                                    'Facebook',
                                    'Instagram',
                                    'Referral',
                                    'Website',
                                    'Checkatrade',
                                    'Google Business Profile',
                                    'Leaflet',
                                    'Estate Agent',
                                    'Existing Customer'
                                ].includes(lead.source)
                                    ? lead.source
                                    : ''
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Enter a custom lead source if not listed above"
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                                Save Source
                            </button>
                        </div>
                    </form>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-6">
                    <h2 className="mb-5 text-lg font-semibold text-slate-900">Survey Booking</h2>
                    <div className="space-y-5">
                        <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Address</label>
                            <div className="min-h-[52px] whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{lead.survey_address || ''}</div>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Survey Date</label>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{lead.survey_date || '-'}</div>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Time Slot</label>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{lead.survey_time_slot || '-'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Notes</h2>
                <div className="mb-6 h-[250px] overflow-y-auto rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
                    Activity Feed
                    <div className="mt-2 space-y-2 whitespace-pre-wrap">
                        <div>• Lead created</div>
                        <div>• Source: {lead.source || 'Not Set'}</div>
                        <div>• Status: {lead.status || 'New Lead'}</div>
                    </div>
                </div>
                <form action={saveNotes} className="space-y-4">
                    <textarea
                        name="notes"
                        defaultValue={lead.notes || ''}
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Add internal notes about this lead..."
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                            Save Notes
                        </button>
                    </div>
                </form>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6">
                <h2 className="mb-6 text-lg font-semibold text-slate-900">Recommended Boilers</h2>

                {Array.isArray((lead as any).recommended_boilers) && (lead as any).recommended_boilers.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {(lead as any).recommended_boilers.map((boiler: any, index: number) => (
                            <div key={index} className="rounded-xl border border-slate-200 p-5">
                                <h3 className="text-base font-semibold text-slate-900">{boiler.name}</h3>
                                <p className="mt-2 text-sm text-slate-600">{boiler.category || '-'}</p>
                                <p className="text-sm text-slate-600">{boiler.output || '-'} kW</p>
                                <div className="mt-4 text-xl font-bold text-slate-900">
                                    £{Number(boiler.price || 0).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">
                        No boiler recommendation data has been stored for this lead.
                    </p>
                )}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Uploaded Photos</h2>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {lead.boiler_photo && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">Boiler</p>
                            <img src={lead.boiler_photo} alt="Boiler" className="h-48 w-full rounded-lg border border-slate-200 object-cover" />
                        </div>
                    )}

                    {lead.flue_photo && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">Flue</p>
                            <img src={lead.flue_photo} alt="Flue" className="h-48 w-full rounded-lg border border-slate-200 object-cover" />
                        </div>
                    )}

                    {lead.gas_meter_photo && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">Gas Meter</p>
                            <img src={lead.gas_meter_photo} alt="Gas Meter" className="h-48 w-full rounded-lg border border-slate-200 object-cover" />
                        </div>
                    )}

                    {lead.pipework_photo && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">Pipework</p>
                            <img src={lead.pipework_photo} alt="Pipework" className="h-48 w-full rounded-lg border border-slate-200 object-cover" />
                        </div>
                    )}

                    {lead.cylinder_photo && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">Cylinder</p>
                            <img src={lead.cylinder_photo} alt="Cylinder" className="h-48 w-full rounded-lg border border-slate-200 object-cover" />
                        </div>
                    )}
                </div>

                {!lead.boiler_photo && !lead.flue_photo && !lead.gas_meter_photo && !lead.pipework_photo && !lead.cylinder_photo && (
                    <p className="text-sm text-slate-500">No photos uploaded.</p>
                )}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Questionnaire Answers</h2>

                {lead.answers ? (
                    <div className="space-y-3">
                        {Object.entries(lead.answers).map(([key, value]) => (
                            <div key={key} className="border-b border-slate-100 pb-2 text-sm">
                                <span className="font-medium capitalize text-slate-700">
                                    {key.replace(/([A-Z])/g, ' $1')}:
                                </span>{' '}
                                <span className="text-slate-600">
                                    {typeof value === 'object' && value !== null
                                        ? (value as any).label || JSON.stringify(value)
                                        : String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">No answers stored.</p>
                )}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Raw Lead Data</h2>

                <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-emerald-400">
                    {JSON.stringify(lead, null, 2)}
                </pre>
            </div>
        </div>
    )
}