'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

function LinkExpired() {
    const searchParams = useSearchParams()
    const reason = searchParams.get('reason')

    const [email, setEmail] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function resend() {
        if (!email.trim()) return
        setSending(true)
        setError(null)

        const { error } = await supabaseBrowser.auth.resend({
            type: 'signup',
            email: email.trim(),
        })

        if (error) {
            setError(error.message)
        } else {
            setSent(true)
        }
        setSending(false)
    }

    const heading =
        reason === 'otp_expired'
            ? 'That verification link has already been used'
            : 'That verification link didn’t work'

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_60%)]" />

            <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
                <h1 className="text-2xl font-bold text-white">{heading}</h1>

                {/* Sign-in comes first on purpose. The overwhelmingly common
                    cause of landing here is a mail provider's link scanner
                    (Outlook and Microsoft 365 especially) following the link to
                    check it's safe. That consumes the single-use token — but it
                    also completes the verification, so the account is usually
                    already active by the time the human clicks. Leading with
                    "resend" sent people round a loop that could never work,
                    because Supabase won't re-send to a confirmed address. */}
                <p className="mt-3 text-slate-400">
                    Your email address may already be verified. Some email providers
                    automatically follow links to scan them, which uses up the one-time
                    link but still completes the verification. Try signing in first.
                </p>

                <Link
                    href="/"
                    className="mt-6 flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                    Go to Sign In
                </Link>

                <div className="mt-8 border-t border-slate-800 pt-6">
                    <p className="text-sm text-slate-400">
                        If signing in tells you the email still isn&apos;t confirmed, request a
                        fresh link below.
                    </p>

                    {sent ? (
                        <div className="mt-4 rounded-xl bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
                            If that address still needs verifying, a new link is on its way.
                            Nothing will arrive if it&apos;s already been confirmed — in that
                            case just sign in above.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && resend()}
                                placeholder="you@company.com"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                            />
                            <button
                                onClick={resend}
                                disabled={sending || !email.trim()}
                                className="w-full rounded-xl border border-slate-700 py-3 font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                                {sending ? 'Sending…' : 'Send me a new link'}
                            </button>
                            {error && <p className="text-sm text-red-400">{error}</p>}
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}

export default function LinkExpiredPage() {
    return (
        <Suspense>
            <LinkExpired />
        </Suspense>
    )
}
