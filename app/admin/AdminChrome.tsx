'use client'

import { useState } from 'react'
import Link from 'next/link'
import SidebarNav from './SidebarNav'

export default function AdminChrome({
    companyName,
    logoUrl,
    serviceAddonEnabled,
    isSuperAdmin,
    isImpersonating,
    overCap,
    tierName,
    children,
}: {
    companyName: string
    logoUrl: string | null
    serviceAddonEnabled: boolean
    isSuperAdmin: boolean
    isImpersonating: boolean
    overCap: boolean
    tierName: string
    children: React.ReactNode
}) {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-[#f5f7fb]">
            {/* Mobile top bar */}
            <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 text-white md:hidden">
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open menu"
                    className="rounded-lg p-2 hover:bg-slate-800"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {logoUrl ? (
                    <img src={logoUrl} alt={companyName} className="h-8 max-w-[140px] object-contain" />
                ) : (
                    <span className="font-semibold">{companyName}</span>
                )}

                <span className="w-10" />
            </div>

            {/* Backdrop, mobile only */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-shrink-0 flex-col bg-slate-950 text-white transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-start justify-between border-b border-slate-800 p-8">
                    <div>
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={companyName}
                                className="h-16 w-full max-w-[180px] object-contain object-left"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold">{companyName}</h1>
                        )}

                        <p className="mt-2 text-sm text-slate-400">
                            Admin Portal
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 md:hidden"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <nav className="admin-sidebar-nav flex flex-1 flex-col overflow-y-auto p-6">
                    <SidebarNav
                        serviceAddonEnabled={serviceAddonEnabled}
                        isSuperAdmin={isSuperAdmin}
                        onNavigate={() => setMobileOpen(false)}
                    />
                </nav>

                <div className="relative mt-auto flex-shrink-0 border-t border-slate-800 bg-slate-950 p-6">
                    <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-b from-transparent to-slate-950" />
                    <img
                        src="/relode-logo-white.png"
                        alt="Relode"
                        className="mx-auto h-10 w-auto opacity-80"
                    />
                </div>
            </aside>

            <section className="min-w-0 flex-1 overflow-y-auto bg-[#f5f7fb] pt-14 md:pt-0">
                {isImpersonating && (
                    <div className="flex items-center justify-between bg-amber-500 px-6 py-3 text-sm font-medium text-amber-950">
                        <span>Viewing as {companyName} (logged in as platform admin)</span>
                        <Link href="/admin/companies" className="underline">
                            Switch company
                        </Link>
                    </div>
                )}
                {overCap && !isImpersonating && (
                    <div className="flex items-center justify-between bg-amber-100 px-6 py-3 text-sm font-medium text-amber-800">
                        <span>You&apos;ve used more leads than your {tierName} plan includes this month — your calculator keeps working as normal.</span>
                        <Link href="/admin/billing" className="underline">
                            View plans
                        </Link>
                    </div>
                )}
                <div className="p-6">
                    {children}
                </div>
            </section>
        </div>
    )
}
