'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Icon({ path, className = 'h-4 w-4' }: { path: string; className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    )
}

const ICONS: Record<string, string> = {
    dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    companies: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 12h.01M9 15h.01',
    signups: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-1a6 6 0 0112 0v1H3z',
    bugs: 'M12 20a7 7 0 007-7c0-2-1-3.5-2-4.5M12 20a7 7 0 01-7-7c0-2 1-3.5 2-4.5M12 20v-9m0 0a3 3 0 100-6 3 3 0 000 6zm-7 3H3m18 0h-2M6.5 6L5 4.5M17.5 6L19 4.5M6 12H4m16 0h-2',
    campaigns: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    back: 'M10 19l-7-7m0 0l7-7m-7 7h18',
}

interface NavItem { href: string; label: string; icon: string }

const ITEMS: NavItem[] = [
    { href: '/superadmin', label: 'Dashboard', icon: 'dashboard' },
    { href: '/superadmin/companies', label: 'Companies', icon: 'companies' },
    { href: '/superadmin/signups', label: 'Signups', icon: 'signups' },
    { href: '/superadmin/bug-reports', label: 'Bug Reports', icon: 'bugs' },
    { href: '/superadmin/campaigns', label: 'Campaigns', icon: 'campaigns' },
    { href: '/superadmin/settings', label: 'Settings', icon: 'settings' },
]

function navItemClasses(active: boolean) {
    return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`
}

export default function SuperAdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()

    return (
        <div className="flex flex-1 flex-col justify-between">
            <div className="space-y-1">
                {ITEMS.map((item) => {
                    const active = item.href === '/superadmin' ? pathname === item.href : pathname.startsWith(item.href)
                    return (
                        <Link key={item.href} href={item.href} onClick={onNavigate} className={navItemClasses(active)}>
                            <Icon path={ICONS[item.icon]} />
                            {item.label}
                        </Link>
                    )
                })}
            </div>

            <Link
                href="/admin"
                onClick={onNavigate}
                className="mt-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-white"
            >
                <Icon path={ICONS.back} />
                Back to my company admin
            </Link>
        </div>
    )
}
