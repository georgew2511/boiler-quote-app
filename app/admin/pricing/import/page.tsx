import Link from 'next/link'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createAdminClient } from '@/utils/supabase/admin'
import { loadDefaultBoilerMarkup } from '@/lib/boilerMarkup'
import SupplierImport from './SupplierImport'

export default async function ImportSupplierQuotePage() {
    const company = await getCurrentCompany()
    const supabase = createAdminClient()

    const [{ data: boilers }, defaultMarkup] = await Promise.all([
        supabase
            .from('boilers')
            .select('id, name, manufacturer, output, category, price, markup_percent')
            .eq('company_id', company.id)
            .order('category')
            .order('output'),
        loadDefaultBoilerMarkup(supabase, company.id),
    ])

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-7xl">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/pricing?tab=boilers"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        ← Pricing
                    </Link>
                    <div>
                        <h1 className="text-4xl font-bold">Import supplier quote</h1>
                        <p className="mt-2 text-gray-600">
                            Upload a quote or price list from your merchant. We&apos;ll find the boilers on it, match them to
                            yours, and show you every change before anything is saved.
                        </p>
                    </div>
                </div>

                <SupplierImport
                    boilers={(boilers ?? []).map((b) => ({
                        id: Number(b.id),
                        name: b.name,
                        manufacturer: b.manufacturer,
                        output: Number(b.output),
                        category: b.category,
                        price: Number(b.price) || 0,
                        markup_percent: b.markup_percent === null ? null : Number(b.markup_percent),
                    }))}
                    defaultMarkup={defaultMarkup}
                />
            </div>
        </main>
    )
}
