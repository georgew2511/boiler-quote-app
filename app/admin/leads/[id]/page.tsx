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

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{lead.name}</h1>
                    <p className="text-gray-500">
                        Created {lead.created_at ? new Date(lead.created_at).toLocaleString('en-GB') : '-'}
                    </p>
                </div>

                <Link
                    href="/admin/leads"
                    className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                >
                    Back to Leads
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
                <div className="rounded-xl border bg-white p-6">
                    <h2 className="mb-4 text-xl font-semibold">Customer Details</h2>

                    <div className="space-y-3">
                        <p><strong>Name:</strong> {lead.name || '-'}</p>
                        <p><strong>Email:</strong> {lead.email || '-'}</p>
                        <p><strong>Phone:</strong> {lead.phone || '-'}</p>
                        <p><strong>Postcode:</strong> {lead.postcode || '-'}</p>
                        <p><strong>Status:</strong> {lead.status || 'New Lead'}</p>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-6">
                    <h2 className="mb-4 text-xl font-semibold">Quote Details</h2>

                    <div className="space-y-3">
                        <p><strong>Boiler:</strong> {lead.boiler_name || 'Not selected'}</p>
                        <p><strong>Category:</strong> {lead.boiler_category || '-'}</p>
                        <p><strong>Output:</strong> {lead.boiler_output || '-'} kW</p>
                        <p><strong>Quoted Price:</strong> £{Number(lead.quote_price || 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border bg-white p-6 mb-8">
                <h2 className="mb-4 text-xl font-semibold">Home Survey</h2>

                {lead.survey_address || lead.survey_date || lead.survey_time_slot ? (
                    <div className="space-y-3">
                        <p>
                            <strong>Address:</strong><br />
                            <span className="whitespace-pre-wrap">
                                {lead.survey_address || '-'}
                            </span>
                        </p>

                        <p>
                            <strong>Date:</strong> {lead.survey_date || '-'}
                        </p>

                        <p>
                            <strong>Time Slot:</strong> {lead.survey_time_slot || '-'}
                        </p>
                    </div>
                ) : (
                    <p className="text-gray-500">No home survey booked.</p>
                )}
            </div>

            <div className="rounded-xl border bg-white p-6 mb-8">
                <h2 className="mb-4 text-xl font-semibold">Boiler Options Shown</h2>

                {Array.isArray((lead as any).recommended_boilers) && (lead as any).recommended_boilers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-4 py-3 text-left">Boiler</th>
                                    <th className="px-4 py-3 text-left">Category</th>
                                    <th className="px-4 py-3 text-left">Output</th>
                                    <th className="px-4 py-3 text-left">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(lead as any).recommended_boilers.map((boiler: any, index: number) => (
                                    <tr key={index} className="border-b">
                                        <td className="px-4 py-3">{boiler.name}</td>
                                        <td className="px-4 py-3">{boiler.category || '-'}</td>
                                        <td className="px-4 py-3">{boiler.output || '-'} kW</td>
                                        <td className="px-4 py-3 font-semibold">
                                            £{Number(boiler.price || 0).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500">
                        No boiler recommendation data has been stored for this lead.
                    </p>
                )}
            </div>

            <div className="rounded-xl border bg-white p-6 mb-8">
                <h2 className="mb-4 text-xl font-semibold">Notes</h2>

                <form action={saveNotes} className="space-y-4">
                    <textarea
                        name="notes"
                        defaultValue={lead.notes || ''}
                        rows={6}
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

            <div className="rounded-xl border bg-white p-6 mb-8">
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

            <div className="rounded-xl border bg-white p-6 mb-8">
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

            <div className="rounded-xl border bg-gray-50 p-6">
                <h2 className="mb-4 text-xl font-semibold">Raw Lead Data</h2>

                <pre className="overflow-auto rounded-lg bg-black p-4 text-sm text-green-400">
                    {JSON.stringify(lead, null, 2)}
                </pre>
            </div>
        </div>
    )
}