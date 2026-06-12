import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export default async function LeadDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !lead) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold">Lead not found</h1>
                <Link href="/admin/leads" className="mt-4 inline-block text-blue-600">
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

        if (updateError) {
            throw new Error(JSON.stringify(updateError))
        }

        revalidatePath(`/admin/leads/${id}`)
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">{lead.name}</h1>
                        <p className="mt-2 text-gray-500">
                            Created {lead.created_at ? new Date(lead.created_at).toLocaleString('en-GB') : '-'}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                            {lead.source || 'Unknown Source'}
                        </span>
                        <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                            {lead.status || 'New Lead'}
                        </span>
                        <Link
                            href="/admin/leads"
                            className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                        >
                            Back
                        </Link>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Lead Value</p>
                        <p className="mt-2 text-3xl font-bold text-green-600">
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

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Lead Source</p>
                        <p className="mt-2 text-xl font-semibold">
                            {lead.source || 'Unknown'}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="mt-2 text-xl font-semibold">
                            {lead.status || 'New Lead'}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Boilers Shown</p>
                        <p className="mt-2 text-3xl font-bold text-blue-600">
                            {(lead as any).recommended_boilers?.length || 0}
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3 items-stretch">
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="mb-5 text-2xl font-bold">Contact</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b pb-3">
                                <span className="text-gray-500">Name</span>
                                <span className="font-medium">{lead.name || '-'}</span>
                            </div>

                            <div className="flex justify-between border-b pb-3">
                                <span className="text-gray-500">Phone</span>
                                <span className="font-medium">{lead.phone || '-'}</span>
                            </div>

                            <div className="flex justify-between border-b pb-3">
                                <span className="text-gray-500">Email</span>
                                <span className="font-medium text-right break-all">{lead.email || '-'}</span>
                            </div>

                            <div className="flex justify-between border-b pb-3">
                                <span className="text-gray-500">Postcode</span>
                                <span className="font-medium">{lead.postcode || '-'}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <span className="font-medium">{lead.status || 'New Lead'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="mb-5 text-2xl font-bold">Lead Source</h2>
                        <form action={saveSource} className="space-y-4">
                            <select
                                name="source"
                                defaultValue={lead.source || ''}
                                className="w-full rounded-lg border px-4 py-3"
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
                                className="w-full rounded-lg border px-4 py-3"
                                placeholder="Enter a custom lead source if not listed above"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                                >
                                    Save Source
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="mb-5 text-2xl font-bold">Survey Booking</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Address</label>
                                <div className="rounded-lg border bg-gray-50 p-3 min-h-[52px] whitespace-pre-wrap">{lead.survey_address || ''}</div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Survey Date</label>
                                <div className="rounded-lg border bg-gray-50 p-3">{lead.survey_date || '-'}</div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Time Slot</label>
                                <div className="rounded-lg border bg-gray-50 p-3">{lead.survey_time_slot || '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3 items-start">
                    <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-3">
                        <h2 className="mb-4 text-xl font-semibold">Notes</h2>
                        <div className="mb-6 h-[250px] overflow-y-auto rounded-xl bg-slate-50 p-5 text-sm text-gray-600">
                            Activity Feed
                            <div className="mt-2 space-y-2">
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
                                className="w-full rounded-lg border px-4 py-3"
                                placeholder="Add internal notes about this lead..."
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                                >
                                    Save Notes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-12">
                    <h2 className="mb-6 text-2xl font-bold">Recommended Boilers</h2>

                    {Array.isArray((lead as any).recommended_boilers) && (lead as any).recommended_boilers.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {(lead as any).recommended_boilers.map((boiler: any, index: number) => (
                                <div key={index} className="rounded-xl border p-5 shadow-sm">
                                    <h3 className="text-lg font-bold">{boiler.name}</h3>
                                    <p className="mt-2 text-gray-600">{boiler.category || '-'}</p>
                                    <p className="text-gray-600">{boiler.output || '-'} kW</p>
                                    <div className="mt-4 text-2xl font-bold text-green-600">
                                        £{Number(boiler.price || 0).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">
                            No boiler recommendation data has been stored for this lead.
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-12">
                    <h2 className="mb-4 text-xl font-semibold">Uploaded Photos</h2>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {lead.boiler_photo && (
                            <div>
                                <p className="mb-2 font-medium">Boiler</p>
                                <img src={lead.boiler_photo} alt="Boiler" className="h-48 w-full rounded-lg object-cover border" />
                            </div>
                        )}

                        {lead.flue_photo && (
                            <div>
                                <p className="mb-2 font-medium">Flue</p>
                                <img src={lead.flue_photo} alt="Flue" className="h-48 w-full rounded-lg object-cover border" />
                            </div>
                        )}

                        {lead.gas_meter_photo && (
                            <div>
                                <p className="mb-2 font-medium">Gas Meter</p>
                                <img src={lead.gas_meter_photo} alt="Gas Meter" className="h-48 w-full rounded-lg object-cover border" />
                            </div>
                        )}

                        {lead.pipework_photo && (
                            <div>
                                <p className="mb-2 font-medium">Pipework</p>
                                <img src={lead.pipework_photo} alt="Pipework" className="h-48 w-full rounded-lg object-cover border" />
                            </div>
                        )}

                        {lead.cylinder_photo && (
                            <div>
                                <p className="mb-2 font-medium">Cylinder</p>
                                <img src={lead.cylinder_photo} alt="Cylinder" className="h-48 w-full rounded-lg object-cover border" />
                            </div>
                        )}
                    </div>

                    {!lead.boiler_photo && !lead.flue_photo && !lead.gas_meter_photo && !lead.pipework_photo && !lead.cylinder_photo && (
                        <p className="text-gray-500">No photos uploaded.</p>
                    )}
                </div>

                <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-12">
                    <h2 className="mb-4 text-xl font-semibold">Questionnaire Answers</h2>

                    {lead.answers ? (
                        <div className="space-y-3">
                            {Object.entries(lead.answers).map(([key, value]) => (
                                <div key={key} className="border-b pb-2">
                                    <span className="font-medium capitalize">
                                        {key.replace(/([A-Z])/g, ' $1')}:
                                    </span>
                                    <span>
                                        {typeof value === 'object' && value !== null
                                            ? (value as any).label || JSON.stringify(value)
                                            : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No answers stored.</p>
                    )}
                </div>

                <div className="rounded-2xl border bg-gray-50 p-6 shadow-sm lg:col-span-12">
                    <h2 className="mb-4 text-xl font-semibold">Raw Lead Data</h2>

                    <pre className="overflow-auto rounded-lg bg-black p-4 text-sm text-green-400">
                        {JSON.stringify(lead, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    )
}