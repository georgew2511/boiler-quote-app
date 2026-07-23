'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ── Icons ──────────────────────────────────────────────────────────────────
function Icon({ path, className = 'h-4 w-4' }: { path: string; className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    )
}

const ICONS: Record<string, string> = {
    dashboard:   'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    boilers:     'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
    pricing:     'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
    testQuote:   'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    embed:       'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    survey:      'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    quotes:      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    leads:       'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    analytics:   'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    service:     'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    settings:    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    help:        'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    billing:     'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    team:        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    chevron:     'M19 9l-7 7-7-7',
}

interface NavItem { href: string; label: string; icon: string }
interface NavGroup { key: string; label: string; icon: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
    {
        key: 'calculator',
        label: 'Quote Calculator',
        icon: 'boilers',
        items: [
            { href: '/admin/boilers',    label: 'Boilers',           icon: 'boilers' },
            { href: '/admin/pricing',    label: 'Pricing',           icon: 'pricing' },
            { href: '/admin/test-quote', label: 'Test Quote',        icon: 'testQuote' },
            { href: '/admin/embed-code', label: 'Embed Calculator',  icon: 'embed' },
        ],
    },
    {
        key: 'surveyor',
        label: 'Surveyor Tool',
        icon: 'survey',
        items: [
            { href: '/admin/survey',           label: 'New Survey Quote',  icon: 'survey' },
            { href: '/admin/surveyor-pricing', label: 'Surveyor Pricing',  icon: 'pricing' },
            { href: '/admin/surveyor-quotes',  label: 'Survey Quotes',     icon: 'quotes' },
            { href: '/admin/surveyors',        label: 'Surveyors',         icon: 'leads' },
        ],
    },
]

const STANDALONE: NavItem[] = [
    { href: '/admin/leads',         label: 'Leads',         icon: 'leads' },
    { href: '/admin/analytics',     label: 'Analytics',     icon: 'analytics' },
    { href: '/admin/service-plans', label: 'Service Plans', icon: 'service' },
]

const SETTINGS_ITEMS: NavItem[] = [
    { href: '/admin/settings', label: 'Settings', icon: 'settings' },
    { href: '/admin/team',     label: 'Team',      icon: 'team' },
    { href: '/admin/help',     label: 'Help',      icon: 'help' },
    { href: '/admin/billing',  label: 'Billing',   icon: 'billing' },
]

function navItemClasses(active: boolean) {
    return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`
}

export default function SidebarNav({
    serviceAddonEnabled,
    isSuperAdmin,
    onNavigate,
}: {
    serviceAddonEnabled: boolean
    isSuperAdmin: boolean
    onNavigate?: () => void
}) {
    const pathname = usePathname()

    const activeGroup = GROUPS.find((g) => g.items.some((i) => pathname?.startsWith(i.href)))?.key
    const [openGroup, setOpenGroup] = useState<string | null>(activeGroup ?? null)

    function isActive(href: string) {
        if (href === '/admin') return pathname === '/admin'
        return !!pathname?.startsWith(href)
    }

    return (
        <div className="flex flex-1 flex-col gap-0.5">
            {/* Dashboard */}
            <Link href="/admin" onClick={onNavigate} className={navItemClasses(pathname === '/admin')}>
                <Icon path={ICONS.dashboard} />
                Dashboard
            </Link>

            {/* Groups */}
            {GROUPS.map((group) => {
                const isOpen = openGroup === group.key
                const groupActive = group.items.some((i) => isActive(i.href))

                return (
                    <div key={group.key} className="mt-1">
                        <button
                            type="button"
                            onClick={() => setOpenGroup(isOpen ? null : group.key)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                                groupActive && !isOpen
                                    ? 'text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <span className="flex items-center gap-2.5">
                                <Icon path={ICONS[group.icon]} />
                                {group.label}
                            </span>
                            <Icon
                                path={ICONS.chevron}
                                className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {isOpen && (
                            <div className="mt-0.5 ml-4 space-y-0.5 border-l border-slate-800 pl-3">
                                {group.items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onNavigate}
                                        className={navItemClasses(isActive(item.href))}
                                    >
                                        <Icon path={ICONS[item.icon]} />
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Divider */}
            <div className="my-3 border-t border-slate-800/60" />

            {/* Standalone items */}
            {STANDALONE.map((item) => {
                if (item.href === '/admin/service-plans' && !serviceAddonEnabled) {
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={`${navItemClasses(isActive(item.href))} justify-between`}
                        >
                            <span className="flex items-center gap-2.5">
                                <Icon path={ICONS[item.icon]} />
                                {item.label}
                            </span>
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                                Add-on
                            </span>
                        </Link>
                    )
                }
                return (
                    <Link key={item.href} href={item.href} onClick={onNavigate} className={navItemClasses(isActive(item.href))}>
                        <Icon path={ICONS[item.icon]} />
                        {item.label}
                    </Link>
                )
            })}

            {/* Settings at bottom */}
            <div className="mt-auto pt-4 border-t border-slate-800/60 space-y-0.5">
                {SETTINGS_ITEMS.map((item) => (
                    <Link key={item.href} href={item.href} onClick={onNavigate} className={navItemClasses(isActive(item.href))}>
                        <Icon path={ICONS[item.icon]} />
                        {item.label}
                    </Link>
                ))}
                {isSuperAdmin && (
                    <Link
                        href="/superadmin"
                        onClick={onNavigate}
                        className="mt-2 flex items-center justify-center rounded-lg border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                        Superuser Admin
                    </Link>
                )}
            </div>
        </div>
    )
}
