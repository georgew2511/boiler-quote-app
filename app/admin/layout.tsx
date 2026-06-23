import Link from 'next/link'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const company = await getCurrentCompany()

    return (
        <div className="flex min-h-screen bg-[#f5f7fb]">
            <aside className="flex w-72 flex-col bg-slate-950 text-white">
                <div className="border-b border-slate-800 p-8">
                    {company.logo_url ? (
                        <img
                            src={company.logo_url}
                            alt={company.company_name}
                            className="h-16 w-auto"
                        />
                    ) : (
                        <h1 className="text-3xl font-bold">
                            {company.company_name}
                        </h1>
                    )}

                    <p className="mt-2 text-sm text-slate-400">
                        Admin Portal
                    </p>
                </div>

                <nav className="flex-1 space-y-2 p-6">
                    <Link
                        href="/admin"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Dashboard
                    </Link>

                    <Link
                        href="/admin/leads"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Leads
                    </Link>

                    <Link
                        href="/admin/boilers"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Boilers
                    </Link>

                    <Link
                        href="/admin/pricing"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Pricing
                    </Link>

                    <Link
                        href="/admin/service-plans"
                        className="flex items-center justify-between rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Service Plans
                        {!company.service_plans_addon && (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                                Add-on
                            </span>
                        )}
                    </Link>

                    <Link
                        href="/admin/test-quote"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Test Quote
                    </Link>

                    <Link
                        href="/admin/embed-code"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Embed Calculator
                    </Link>

                    <Link
                        href="/admin/settings"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Settings
                    </Link>

                    <Link
                        href="/admin/help"
                        className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                    >
                        Help &amp; Guide
                    </Link>

                    {company.isSuperAdmin && (
                        <Link
                            href="/admin/companies"
                            className="block rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-amber-300 transition hover:bg-amber-500/20"
                        >
                            All Companies
                        </Link>
                    )}
                </nav>

                <div className="mt-auto border-t border-slate-800 p-6">
                    <img
                        src="/relode-logo-white.png"
                        alt="Relode"
                        className="mx-auto h-10 w-auto opacity-80"
                    />
                </div>
            </aside>

            <section className="flex-1 bg-[#f5f7fb]">
                {company.isImpersonating && (
                    <div className="flex items-center justify-between bg-amber-500 px-6 py-3 text-sm font-medium text-amber-950">
                        <span>Viewing as {company.company_name} (logged in as platform admin)</span>
                        <Link href="/admin/companies" className="underline">
                            Switch company
                        </Link>
                    </div>
                )}
                <div className="min-h-screen p-6">
                    {children}
                </div>
            </section>
        </div>
    )
}
