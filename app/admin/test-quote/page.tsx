import Link from 'next/link'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

export default async function TestQuotePage() {
    const company = await getCurrentCompany()

    const previewUrl = `/calculator?company_id=${company.id}&preview=1`

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-6xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">Test Quote</h1>
                        <p className="mt-2 text-gray-600">
                            This is the exact live calculator your customers will see, using your current boilers and pricing. Run through it to make sure you're happy before putting the embed code on your website.
                        </p>
                    </div>

                    <Link
                        href={previewUrl}
                        target="_blank"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        Open in New Tab ↗
                    </Link>
                </div>

                <div className="mt-4 rounded-2xl bg-amber-50 px-5 py-3 text-sm text-amber-800">
                    Submissions made here are tagged <strong>Test</strong> in your{' '}
                    <Link href="/admin/leads" className="underline">
                        Leads
                    </Link>{' '}
                    list, so they won't be mistaken for a real enquiry.
                </div>

                <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <iframe
                        src={previewUrl}
                        className="h-[1200px] w-full"
                        frameBorder={0}
                    />
                </div>
            </div>
        </main>
    )
}
