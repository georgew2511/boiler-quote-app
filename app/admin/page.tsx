import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

export default async function AdminPage() {


    const company = await getCurrentCompany()
    console.log('COMPANY LOGO:', company.logo_url)
    const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(10)

    return (
        <main className="min-h-screen bg-slate-100">
            <section className="p-10">
                <div className="mb-10 flex items-start justify-between">
                    <div>
                        <h2 className="text-5xl font-bold text-slate-900">
                            {company.company_name} Admin
                        </h2>
                        <p className="mt-3 text-lg text-slate-500">
                            Manage boilers, pricing, leads and quote settings.
                        </p>
                    </div>

                    <Link
                        href="/logout"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        Log Out
                    </Link>
                </div>

                <div className="rounded-3xl bg-white p-8 shadow-sm">
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
                                    <th className="px-5 py-4 text-left">Status</th>
                                    <th className="px-5 py-4 text-left">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads?.map((lead) => (
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
                                        <td className="px-5 py-4">
                                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                {lead.status || 'New'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500">
                                            {lead.created_at
                                                ? new Date(lead.created_at).toLocaleDateString('en-GB')
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>
    )
}