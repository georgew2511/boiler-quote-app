import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { IMPERSONATION_COOKIE } from '@/lib/superAdmin'

export default async function CompaniesPage() {
    const company = await getCurrentCompany()

    if (!company.isSuperAdmin) {
        return (
            <main className="p-8">
                <h1 className="text-2xl font-bold text-red-600">Access denied</h1>
                <p className="mt-2 text-gray-600">This page is only available to the platform admin account.</p>
            </main>
        )
    }

    const adminClient = createAdminClient()

    const { data: companies, error } = await adminClient
        .from('companies')
        .select('*')
        .order('company_name')

    if (error) {
        return <div className="p-8">Error loading companies: {error.message}</div>
    }

    async function loginAs(formData: FormData) {
        'use server'

        const companyId = formData.get('company_id') as string
        const cookieStore = await cookies()
        cookieStore.set(IMPERSONATION_COOKIE, companyId, { path: '/' })

        redirect('/admin')
    }

    async function stopImpersonating() {
        'use server'

        const cookieStore = await cookies()
        cookieStore.delete(IMPERSONATION_COOKIE)

        redirect('/admin/companies')
    }

    async function toggleServicePlansAddon(formData: FormData) {
        'use server'

        // Re-check super-admin on the server before using the
        // RLS-bypassing admin client, since this is a privileged write.
        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        const companyId = formData.get('company_id') as string
        const currentValue = formData.get('current') as string
        const current = currentValue === 'true' || currentValue === '1'

        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('companies')
            .update({ service_plans_addon: !current })
            .eq('id', companyId)

        if (error) {
            console.error('Error toggling service plans:', error)
        }

        redirect('/admin/companies')
    }

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-5xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">All Companies</h1>
                        <p className="mt-2 text-gray-600">
                            Log in as any company to view and manage their dashboard exactly as they see it.
                        </p>
                    </div>

                    {company.isImpersonating && (
                        <form action={stopImpersonating}>
                            <button className="rounded-xl border border-amber-600 bg-amber-50 px-5 py-3 font-medium text-amber-700 hover:bg-amber-100">
                                Stop Viewing As {company.company_name}
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 text-left">
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Service Plans Add-on</th>
                                <th className="px-6 py-4">Company ID</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {companies?.map((c: any) => (
                                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium">{c.company_name}</td>
                                    <td className="px-6 py-4 capitalize text-slate-500">{c.subscription_status}</td>
                                    <td className="px-6 py-4">
                                        <form action={toggleServicePlansAddon}>
                                            <input type="hidden" name="company_id" value={c.id} />
                                            <input type="hidden" name="current" value={c.service_plans_addon ? '1' : '0'} />
                                            <button
                                                type="submit"
                                                className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${c.service_plans_addon
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {c.service_plans_addon ? 'Enabled' : 'Disabled'}
                                            </button>
                                        </form>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{c.id}</td>
                                    <td className="px-6 py-4">
                                        {c.id === company.realCompanyId ? (
                                            <span className="text-sm text-slate-400">This is you</span>
                                        ) : (
                                            <form action={loginAs}>
                                                <input type="hidden" name="company_id" value={c.id} />
                                                <button className="rounded-xl border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                                                    Login As
                                                </button>
                                            </form>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Link href="/admin" className="mt-6 inline-block text-blue-600 hover:underline">
                    ← Back to Admin
                </Link>
            </div>
        </main>
    )
}
