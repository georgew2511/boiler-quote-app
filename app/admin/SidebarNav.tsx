'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLink {
    href: string
    label: string
}

interface NavGroup {
    key: string
    label: string
    links: NavLink[]
}

const GROUPS: NavGroup[] = [
    {
        key: 'setup',
        label: 'Setup Your Calculator',
        links: [
            { href: '/admin/boilers', label: 'Boilers' },
            { href: '/admin/pricing', label: 'Pricing' },
        ],
    },
    {
        key: 'golive',
        label: 'Go Live',
        links: [
            { href: '/admin/test-quote', label: 'Test Quote' },
            { href: '/admin/embed-code', label: 'Embed Calculator' },
        ],
    },
]

function linkClasses(active: boolean) {
    return `block rounded-xl px-4 py-3 transition ${active
        ? 'bg-slate-800 text-white'
        : 'text-slate-300 hover:bg-slate-800'
        }`
}

const groupButtonClasses =
    'flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-800 hover:text-white'

const RESOURCE_LINKS: NavLink[] = [
    { href: '/admin/settings', label: 'Settings' },
    { href: '/admin/help', label: 'Help & Guide' },
    { href: '/admin/billing', label: 'Billing & Plan' },
]

export default function SidebarNav({
    serviceAddonEnabled,
    isSuperAdmin,
}: {
    serviceAddonEnabled: boolean
    isSuperAdmin: boolean
}) {
    const pathname = usePathname()

    const activeGroupKey = GROUPS.find((group) =>
        group.links.some((link) => pathname?.startsWith(link.href))
    )?.key

    const [openGroup, setOpenGroup] = useState<string | null>(activeGroupKey ?? null)

    const resourcesActive = RESOURCE_LINKS.some((link) => pathname?.startsWith(link.href))
    const [resourcesOpen, setResourcesOpen] = useState(resourcesActive)

    function toggleGroup(key: string) {
        setOpenGroup((current) => (current === key ? null : key))
    }

    return (
        <>
            <div className="space-y-2">
                <Link href="/admin" className={linkClasses(pathname === '/admin')}>
                    Dashboard
                </Link>
            </div>

            {GROUPS.map((group) => {
                const isOpen = openGroup === group.key

                return (
                    <div key={group.key} className="mt-4">
                        <button
                            type="button"
                            onClick={() => toggleGroup(group.key)}
                            className={groupButtonClasses}
                        >
                            {group.label}
                            <svg
                                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isOpen && (
                            <div className="mt-1 space-y-1 pl-2">
                                {group.links.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={linkClasses(!!pathname?.startsWith(link.href))}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}

            <div className="mt-4 space-y-2">
                <Link href="/admin/leads" className={linkClasses(!!pathname?.startsWith('/admin/leads'))}>
                    Leads
                </Link>

                <Link href="/admin/analytics" className={linkClasses(!!pathname?.startsWith('/admin/analytics'))}>
                    Analytics
                </Link>

                <Link
                    href="/admin/service-plans"
                    className={`flex items-center justify-between rounded-xl px-4 py-3 transition ${pathname?.startsWith('/admin/service-plans')
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                        }`}
                >
                    Service Plans
                    {!serviceAddonEnabled && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                            Add-on
                        </span>
                    )}
                </Link>
            </div>

            <div className="mt-auto pt-6">
                <button
                    type="button"
                    onClick={() => setResourcesOpen((open) => !open)}
                    className={groupButtonClasses}
                >
                    Settings
                    <svg
                        className={`h-4 w-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {resourcesOpen && (
                    <div className="mt-1 space-y-1 pl-2">
                        {RESOURCE_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={linkClasses(!!pathname?.startsWith(link.href))}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {isSuperAdmin && (
                            <Link
                                href="/admin/companies"
                                className="mt-2 block rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 transition hover:bg-amber-500/20"
                            >
                                All Companies
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
