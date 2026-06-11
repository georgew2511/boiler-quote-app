import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

export default async function LeadsPage() {
    const company = await getCurrentCompany()
    console.log('CURRENT COMPANY FOR LEADS:', company.id, company.company_name)

    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

    console.log('LEADS:', leads)
    console.log('LEADS ERROR:', error)

    async function deleteLead(id: number) {
        'use server'

        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id)
            .eq('company_id', company.id)

        if (error) {
            throw new Error(`Failed to delete lead: ${JSON.stringify(error)}`)
        }

        revalidatePath('/admin/leads')
        redirect('/admin/leads')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="p-8">
                <div className="mx-auto max-w-7xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold">Leads</h1>
                            <p className="mt-2 text-gray-600">
                                View and manage quote requests.
                            </p>
                        </div>
                        <a
                            href="/admin"
                            className="rounded-lg border bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                        >
                            ← Back to Admin
                        </a>
                    </div>

                    <div className="mt-8 rounded-2xl border bg-white p-6">
                        <div className="grid gap-4 md:grid-cols-4">
                            <input
                                type="text"
                                placeholder="Search customer..."
                                className="rounded-lg border px-4 py-3"
                            />

                            <select className="rounded-lg border px-4 py-3">
                                <option>All Statuses</option>
                                <option>Awaiting Review</option>
                                <option>Photos Received</option>
                                <option>Quoted</option>
                                <option>Accepted</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Customer</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Postcode</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Survey Address</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Survey Booking</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Boiler</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Quote</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {(!leads || leads.length === 0) && (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-4 text-center text-gray-500">
                                            No leads found.
                                        </td>
                                    </tr>
                                )}
                                {leads?.map((lead) => (
                                    (() => {
                                        const raw = lead.raw_data || lead.answers || {}

                                        const surveyAddress =
                                            lead.survey_address ||
                                            lead.survey_house_name ||
                                            lead.house_name ||
                                            lead.address_line_1 ||
                                            lead.survey_address_line_1 ||
                                            raw.survey_address ||
                                            raw.houseName ||
                                            raw.house_name ||
                                            raw.addressLine1 ||
                                            raw.address_line_1

                                        const surveyRoad =
                                            lead.survey_road_name ||
                                            lead.road_name ||
                                            lead.address_line_2 ||
                                            lead.survey_address_line_2 ||
                                            raw.roadName ||
                                            raw.road_name ||
                                            raw.addressLine2 ||
                                            raw.address_line_2

                                        const surveyTown =
                                            lead.survey_town ||
                                            lead.town ||
                                            raw.town ||
                                            raw.city

                                        const surveyPostcode =
                                            lead.survey_postcode ||
                                            lead.postcode ||
                                            raw.postcode

                                        const surveyDate =
                                            lead.survey_date ||
                                            raw.surveyDate ||
                                            raw.survey_date

                                        const surveySlot =
                                            lead.survey_time_slot ||
                                            lead.survey_slot ||
                                            raw.surveyTimeSlot ||
                                            raw.survey_time_slot ||
                                            raw.surveySlot ||
                                            raw.survey_slot

                                        const deleteLeadWithId = deleteLead.bind(null, lead.id)

                                        return (
                                            <tr key={lead.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <a
                                                        href={`/admin/leads/${lead.id}`}
                                                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        {lead.name || `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim()}
                                                    </a>
                                                </td>
                                                <td className="px-5 py-4 text-slate-500">
                                                    {lead.created_at
                                                        ? new Date(lead.created_at).toLocaleDateString('en-GB')
                                                        : '-'}
                                                </td>
                                                <td className="px-5 py-4">{lead.postcode}</td>
                                                <td className="px-5 py-4 text-sm">
                                                    {surveyAddress ? (
                                                        <div className="whitespace-pre-wrap">{surveyAddress}</div>
                                                    ) : (
                                                        <span className="text-gray-400">No survey booked</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-sm">
                                                    {surveyDate || surveySlot ? (
                                                        <div>
                                                            <div>{surveyDate || '-'}</div>
                                                            <div className="text-gray-600">{surveySlot || '-'}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">Not booked</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {lead.boiler_name || 'Not selected'}
                                                </td>
                                                <td className="px-5 py-4 font-semibold">
                                                    £{Number(lead.quote_price || 0).toLocaleString()}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                        {lead.status || 'New Lead'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                                            Contact
                                                        </button>

                                                        <form action={deleteLeadWithId}>
                                                            <button
                                                                type="submit"
                                                                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                                                            >
                                                                Delete
                                                            </button>
                                                        </form>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })()
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}