import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { redirect } from 'next/navigation'
import BoilersGrid from './BoilersGrid'

interface Boiler {
    id: number
    name: string
    tier: string
    category: string
    output: number
    price: number
    warranty: number
    status: string
}

export default async function BoilersPage() {
    const company = await getCurrentCompany()

    const { data: companySettings } = await supabase
        .from('company_settings')
        .select('vat_registered')
        .eq('company_id', company.id)
        .maybeSingle()

    const vatRegistered = !!companySettings?.vat_registered

    const { data: boilers, error } = await supabase
        .from('boilers')
        .select('*')
        .eq('company_id', company.id)

    if (error) {
        return <div>Error: {error.message}</div>
    }

    async function deleteBoiler(formData: FormData) {
        'use server'

        const id = formData.get('id') as string

        await supabase.from('boilers').delete().eq('id', id)

        redirect('/admin/boilers')
    }

    async function toggleBoilerStatus(formData: FormData) {
        'use server'

        const id = formData.get('id') as string
        const currentStatus = formData.get('current_status') as string
        const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'

        await supabase.from('boilers').update({ status: nextStatus }).eq('id', id)

        redirect('/admin/boilers')
    }

    const groupedBoilers = {
        combi: (boilers?.filter((b) => b.category === 'combi') ?? []).sort((a, b) => Number(a.output || 0) - Number(b.output || 0)),
        system: (boilers?.filter((b) => b.category === 'system') ?? []).sort((a, b) => Number(a.output || 0) - Number(b.output || 0)),
        regular: (boilers?.filter((b) => b.category === 'regular') ?? []).sort((a, b) => Number(a.output || 0) - Number(b.output || 0)),
        other: (boilers?.filter((b) => !['combi', 'system', 'regular'].includes(b.category)) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }

    return (
        <main className="min-h-screen bg-gray-50 py-10">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin"
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                        >
                            ← Admin Panel
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Boilers</h1>
                            <p className="text-sm text-gray-500">
                                Manage boiler models, images and specs. To batch-update prices, use{' '}
                                <Link href="/admin/pricing?tab=boilers" className="text-blue-600 hover:underline">
                                    Pricing → Boiler Prices
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/pricing?tab=boilers"
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                        >
                            Manage Pricing
                        </Link>
                        <Link
                            href="/admin/boilers/new"
                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-4 font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md"
                        >
                            Add Boiler
                        </Link>
                    </div>
                </div>

                <div className="mb-6 rounded-2xl bg-blue-50 px-5 py-3 text-sm text-blue-800">
                    Boiler prices are entered <strong>excluding VAT</strong>.{' '}
                    {vatRegistered
                        ? 'Your company is set to VAT registered, so 20% VAT is automatically added on top of these prices when shown to customers on the quote calculator.'
                        : "Your company is set to not VAT registered, so customers see these prices exactly as entered, with no VAT added."}{' '}
                    Change this in{' '}
                    <Link href="/admin/settings" className="underline">
                        Settings → VAT
                    </Link>
                    .
                </div>

                {boilers && boilers.length > 0 ? (
                    <BoilersGrid
                        groupedBoilers={groupedBoilers}
                        deleteBoiler={deleteBoiler}
                        toggleBoilerStatus={toggleBoilerStatus}
                    />
                ) : (
                    <p>No boilers found</p>
                )}
            </div>
        </main>
    )
}