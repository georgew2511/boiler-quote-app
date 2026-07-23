'use client'

import { useState } from 'react'
import Link from 'next/link'
import SuperAdminSidebar from './SuperAdminSidebar'

export default function SuperAdminChrome({
    isImpersonating,
    impersonatingName,
    children,
}: {
    isImpersonating: boolean
    impersonatingName: string | null
    children: React.ReactNode
}) {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 md:hidden">
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <span className="text-sm font-semibold text-white">Super Admin</span>
                <div className="w-8" />
            </div>

            {mobileOpen && (
                <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden" />
            )}

            <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col bg-slate-950 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-16 items-center border-b border-slate-800/60 px-5">
                    <span className="text-base font-semibold text-white">Super Admin</span>
                </div>

                <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
                    <SuperAdminSidebar onNavigate={() => setMobileOpen(false)} />
                </nav>

                <div className="border-t border-slate-800/60 px-5 py-4">
                    <img src="/relode-logo-white.png" alt="Relode" className="h-6 w-auto opacity-50" />
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {isImpersonating && (
                    <div className="flex items-center justify-between bg-amber-400 px-6 py-2.5 text-xs font-semibold text-amber-950">
                        <span>Viewing as {impersonatingName}</span>
                        <Link href="/superadmin/companies" className="underline underline-offset-2">Switch company</Link>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
                    <div className="p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
