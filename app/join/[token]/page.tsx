'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Stage = 'loading' | 'invalid' | 'set-password' | 'already-accepted' | 'done' | 'error'

export default function JoinPage() {
    const params = useParams()
    const token = params.token as string
    const router = useRouter()
    const supabase = createClient()

    const [stage, setStage] = useState<Stage>('loading')
    const [invite, setInvite] = useState<{ id: string; company_name: string; invited_email: string; role: string } | null>(null)
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        const load = async () => {
            // Look up the invite
            const { data: member } = await supabase
                .from('company_members')
                .select('id, invited_email, role, accepted_at, company_id, companies(company_name)')
                .eq('invite_token', token)
                .maybeSingle()

            if (!member) { setStage('invalid'); return }
            if (member.accepted_at) { setStage('already-accepted'); return }

            const companyName = (member.companies as any)?.company_name ?? 'your company'
            setInvite({ id: member.id, company_name: companyName, invited_email: member.invited_email, role: member.role })

            // Check if already logged in
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Claim immediately
                await claimInvite(member.id, user.id)
            } else {
                setStage('set-password')
            }
        }
        load()
    }, [token])

    async function claimInvite(memberId: string, userId: string) {
        const res = await fetch('/api/team/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId, userId }),
        })
        if (res.ok) {
            setStage('done')
            setTimeout(() => router.push('/admin'), 1500)
        } else {
            setStage('error')
        }
    }

    async function handleSetPassword(e: React.FormEvent) {
        e.preventDefault()
        if (!invite) return
        if (password.length < 8) { setErrorMsg('Password must be at least 8 characters'); return }
        if (password !== confirm) { setErrorMsg('Passwords do not match'); return }

        setSubmitting(true)
        setErrorMsg('')

        // Sign up with the invited email + chosen password
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: invite.invited_email,
            password,
        })

        if (signUpError) {
            // Might already exist — try signing in
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: invite.invited_email,
                password,
            })
            if (signInError || !signInData.user) {
                setErrorMsg(signInError?.message ?? 'Failed to sign in')
                setSubmitting(false)
                return
            }
            await claimInvite(invite.id, signInData.user.id)
            return
        }

        const userId = signUpData.user?.id
        if (!userId) {
            setErrorMsg('Account created but could not retrieve user ID. Check your email for a confirmation link.')
            setSubmitting(false)
            return
        }

        await claimInvite(invite.id, userId)
        setSubmitting(false)
    }

    if (stage === 'loading') {
        return <Screen><p className="text-slate-500 text-sm">Loading your invitation…</p></Screen>
    }

    if (stage === 'invalid') {
        return (
            <Screen>
                <h1 className="text-xl font-semibold text-slate-900">Invalid invite</h1>
                <p className="mt-2 text-sm text-slate-500">This invite link is invalid or has expired. Ask your administrator to resend it.</p>
            </Screen>
        )
    }

    if (stage === 'already-accepted') {
        return (
            <Screen>
                <h1 className="text-xl font-semibold text-slate-900">Already accepted</h1>
                <p className="mt-2 text-sm text-slate-500">This invite has already been used.</p>
                <a href="/" className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in →</a>
            </Screen>
        )
    }

    if (stage === 'done') {
        return (
            <Screen>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
                <h1 className="mt-4 text-xl font-semibold text-slate-900">You're in!</h1>
                <p className="mt-2 text-sm text-slate-500">Redirecting you to the portal…</p>
            </Screen>
        )
    }

    if (stage === 'error') {
        return (
            <Screen>
                <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
                <p className="mt-2 text-sm text-slate-500">Please try again or contact your administrator.</p>
            </Screen>
        )
    }

    const roleLabel: Record<string, string> = { admin: 'Admin', surveyor: 'Surveyor', viewer: 'Viewer' }

    return (
        <Screen>
            <div className="w-full max-w-sm">
                <div className="mb-6 text-center">
                    <img src="/relode-logo-white.png" alt="Relode" className="mx-auto mb-4 h-7 w-auto opacity-80 invert" />
                    <h1 className="text-xl font-semibold text-slate-900">Join {invite?.company_name}</h1>
                    <p className="mt-1.5 text-sm text-slate-500">
                        You've been invited as <span className="font-medium text-slate-700">{roleLabel[invite?.role ?? ''] ?? invite?.role}</span>. Set a password to get started.
                    </p>
                </div>

                <form onSubmit={handleSetPassword} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            value={invite?.invited_email ?? ''}
                            disabled
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            required
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    {errorMsg && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{errorMsg}</p>}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {submitting ? 'Setting up your account…' : 'Accept invitation'}
                    </button>
                </form>
            </div>
        </Screen>
    )
}

function Screen({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 shadow-sm text-center">
                {children}
            </div>
        </main>
    )
}
