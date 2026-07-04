'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Member {
    id: string
    invited_email: string
    role: string
    accepted_at: string | null
    invited_at: string
    user_id: string | null
}

const ROLES = ['admin', 'surveyor', 'viewer'] as const
type Role = typeof ROLES[number]

const ROLE_META: Record<Role | 'owner', { label: string; description: string; colour: string }> = {
    owner:    { label: 'Owner',    description: 'Full access including billing. Cannot be changed.',              colour: 'bg-slate-900 text-white' },
    admin:    { label: 'Admin',    description: 'Full portal access. Can manage team and settings.',               colour: 'bg-blue-100 text-blue-700' },
    surveyor: { label: 'Surveyor', description: 'Can create and view surveyor quotes only.',                       colour: 'bg-violet-100 text-violet-700' },
    viewer:   { label: 'Viewer',   description: 'Read-only access to leads and analytics.',                        colour: 'bg-slate-100 text-slate-600' },
}

export default function TeamPage() {
    const supabase = createClient()
    const [members, setMembers] = useState<Member[]>([])
    const [ownerEmail, setOwnerEmail] = useState('')
    const [companyId, setCompanyId] = useState('')
    const [loading, setLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<Role>('admin')
    const [inviting, setInviting] = useState(false)
    const [inviteMsg, setInviteMsg] = useState('')
    const [myRole, setMyRole] = useState<string>('owner')

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Resolve company and current user's role
            const { data: ownedCompany } = await supabase
                .from('companies')
                .select('id')
                .eq('owner_user_id', user.id)
                .maybeSingle()

            let cid = ownedCompany?.id ?? ''
            let role = 'owner'

            if (!cid) {
                const { data: membership } = await supabase
                    .from('company_members')
                    .select('company_id, role')
                    .eq('user_id', user.id)
                    .not('accepted_at', 'is', null)
                    .maybeSingle()
                cid = membership?.company_id ?? ''
                role = membership?.role ?? 'viewer'
            }

            setCompanyId(cid)
            setMyRole(role)
            setOwnerEmail(user.email ?? '')

            if (cid) {
                const { data } = await supabase
                    .from('company_members')
                    .select('id, invited_email, role, accepted_at, invited_at, user_id')
                    .eq('company_id', cid)
                    .order('invited_at', { ascending: false })
                setMembers(data ?? [])
            }

            setLoading(false)
        }
        load()
    }, [])

    async function sendInvite() {
        if (!inviteEmail.trim()) return
        setInviting(true)
        setInviteMsg('')

        const res = await fetch('/api/team/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        })
        const data = await res.json()

        if (res.ok) {
            setInviteMsg('Invite sent!')
            setInviteEmail('')
            // Refresh list
            const { data: updated } = await supabase
                .from('company_members')
                .select('id, invited_email, role, accepted_at, invited_at, user_id')
                .eq('company_id', companyId)
                .order('invited_at', { ascending: false })
            setMembers(updated ?? [])
        } else {
            setInviteMsg(data.error ?? 'Failed to send invite')
        }

        setInviting(false)
        setTimeout(() => setInviteMsg(''), 4000)
    }

    async function changeRole(memberId: string, role: Role) {
        await fetch(`/api/team/${memberId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        })
        setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
    }

    async function removeMember(memberId: string) {
        if (!confirm('Remove this team member? They will immediately lose access.')) return
        await fetch(`/api/team/${memberId}`, { method: 'DELETE' })
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
    }

    const canManage = myRole === 'owner' || myRole === 'admin'

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">Team</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                    Manage who has access to the portal and what they can do.
                </p>
            </div>

            {/* Role guide */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.entries(ROLE_META) as [string, typeof ROLE_META['owner']][]).map(([key, meta]) => (
                    <div key={key} className="rounded-xl border border-slate-100 bg-white p-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.colour}`}>{meta.label}</span>
                        <p className="mt-2 text-xs text-slate-500 leading-relaxed">{meta.description}</p>
                    </div>
                ))}
            </div>

            {/* Invite form */}
            {canManage && (
                <div className="rounded-2xl border border-slate-100 bg-white p-6">
                    <h2 className="text-sm font-semibold text-slate-900">Invite team member</h2>
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-48">
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">Email address</label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
                                placeholder="colleague@example.com"
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">Role</label>
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as Role)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={sendInvite}
                            disabled={inviting || !inviteEmail.trim()}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {inviting ? 'Sending…' : 'Send invite'}
                        </button>
                    </div>
                    {inviteMsg && (
                        <p className={`mt-3 text-sm ${inviteMsg === 'Invite sent!' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {inviteMsg}
                        </p>
                    )}
                </div>
            )}

            {/* Members list */}
            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="text-sm font-semibold text-slate-900">Team members</h2>
                </div>

                {loading && <div className="px-6 py-10 text-center text-sm text-slate-400">Loading…</div>}

                {!loading && (
                    <div className="divide-y divide-slate-50">
                        {/* Owner row */}
                        <div className="flex items-center gap-4 px-6 py-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                                {ownerEmail.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{ownerEmail}</p>
                                <p className="text-xs text-slate-400">Account owner</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_META.owner.colour}`}>Owner</span>
                        </div>

                        {/* Member rows */}
                        {members.map((m) => {
                            const roleMeta = ROLE_META[m.role as keyof typeof ROLE_META] ?? ROLE_META.viewer
                            const isPending = !m.accepted_at
                            return (
                                <div key={m.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isPending ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-700'}`}>
                                        {m.invited_email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{m.invited_email}</p>
                                        <p className="text-xs text-slate-400">
                                            {isPending ? 'Invite pending' : `Joined ${new Date(m.accepted_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                        </p>
                                    </div>

                                    {canManage ? (
                                        <select
                                            value={m.role}
                                            onChange={(e) => changeRole(m.id, e.target.value as Role)}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                                        >
                                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                                        </select>
                                    ) : (
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleMeta.colour}`}>{roleMeta.label}</span>
                                    )}

                                    {isPending && canManage && (
                                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Pending</span>
                                    )}

                                    {canManage && (
                                        <button
                                            onClick={() => removeMember(m.id)}
                                            className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            )
                        })}

                        {members.length === 0 && (
                            <div className="px-6 py-10 text-center text-sm text-slate-400">
                                No team members yet. Invite someone above.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
