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
            ? 'That verification link has expired'
            : 'That verification link didn’t work'

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_60%)]" />

            <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
                <h1 className="text-2xl font-bold text-white">{heading}</h1>
                <p className="mt-3 text-slate-400">
                    Verification links are single-use and time-limited. Some email providers also
                    follow links automatically to scan them, which uses the link up before you get
                    to it. Enter your email and we&apos;ll send a fresh one.
                </p>

                {sent ? (
                    <div className="mt-6 rounded-xl bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
                        New verification email sent. Check your inbox — the link is good for one use.
                    </div>
                ) : (
                    <div className="mt-6 space-y-3">
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
                            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {sending ? 'Sending…' : 'Send me a new link'}
                        </button>
                        {error && <p className="text-sm text-red-400">{error}</p>}
                    </div>
                )}

                <Link
                    href="/"
                    className="mt-6 flex w-full items-center justify-center rounded-xl border border-slate-700 py-3 font-medium text-white transition hover:bg-slate-800"
                >
                    Back to Sign In
                </Link>
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
