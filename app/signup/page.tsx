'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

export default function SignupPage() {
    const [companyName, setCompanyName] = useState('')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleSignup = async () => {
        if (password !== confirmPassword) {
            alert('Passwords do not match')
            return
        }

        setLoading(true)

        const { data, error } = await supabaseBrowser.auth.signUp({
            email,
            password,
            options: {
                // Sent explicitly so the confirmation link lands on our callback
                // route on whichever host they signed up from, rather than on
                // whatever Site URL the Supabase project happens to be set to.
                // That default had been pointing at the protected Vercel
                // deployment domain, so verifying bounced people to a Vercel
                // login page.
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    company_name: companyName,
                    full_name: name,
                    phone,
                },
            },
        })

        if (error) {
            alert(error.message)
            setLoading(false)
            return
        }

        if (data.user) {
            // Company creation, pricing and boilers are all seeded server-side
            // on the service-role client. They used to run here against the
            // browser client, which only works while signUp() returns a session
            // — i.e. only while email confirmation is off. With it on there is
            // no session, every insert ran as `anon`, and signup failed on
            // "new row violates row-level security policy". Doing it in a route
            // makes the flow work either way.
            let completeResult: {
                companyId?: string
                alreadyExisted?: boolean
                error?: string
            } = {}
            let completeStatus = 0

            try {
                const response = await fetch('/api/signup/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: data.user.id }),
                })
                completeStatus = response.status
                completeResult = await response.json()
            } catch {
                completeResult = { error: 'Network error' }
            }

            // Whether the email was already taken is decided here rather than
            // guessed from the signUp response. Supabase deliberately obscures
            // that case — it returns a decoy user rather than an error — and
            // the shape of that decoy isn't something to bet the whole signup
            // flow on. An earlier version keyed off an empty `identities`
            // array, which is unverifiable from the admin API and would have
            // blocked every signup had the assumption been wrong.
            //
            // A company that already exists, or a user id that doesn't resolve
            // (the decoy case), both mean: this person already has an account.
            if (completeResult.alreadyExisted || completeStatus === 404) {
                alert('An account with that email already exists. Try signing in instead.')
                setLoading(false)
                return
            }

            if (!completeResult.companyId) {
                alert(
                    `Your account was created but we could not finish setting up your company ` +
                    `(${completeResult.error || 'unknown error'}). Please contact support@relode.io ` +
                    `and we will sort it out right away.`
                )
                setLoading(false)
                return
            }

            // Also seeds the company_settings row server-side, which is why
            // companyId is sent — see createCompanySettings in the route.
            fetch('/api/notify-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyName, ownerName: name, email, phone, companyId: completeResult.companyId }),
            }).catch(() => {
                // Best-effort — the account is already created either way.
            })
        }

        // signUp() returns a session only when email confirmation is off. When
        // it's on there's a verification email to action first, so say so
        // rather than sending them to a sign-in that will reject them.
        alert(
            data.session
                ? 'Account created successfully. Sign in to pick a plan and start your 14-day free trial.'
                : 'Account created successfully. Check your email to verify your address, then sign in to pick a plan and start your 14-day free trial.'
        )

        router.push('/')
        setLoading(false)
    }

    return (
        <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_60%)]" />

            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-white">Create your Relode account</h1>
                    <p className="mt-3 text-slate-400">
                        Set up your quote calculator dashboard and start managing leads.
                    </p>
                </div>

                <form className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Company Name
                        </label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-green-500"
                            placeholder="ABC Heating Ltd"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Your Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-green-500"
                            placeholder="George Whitman"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-green-500"
                            placeholder="07900 000000"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-green-500"
                            placeholder="you@company.com"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-green-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-green-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <button
                            type="button"
                            onClick={handleSignup}
                            disabled={loading}
                            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm text-slate-400">
                    Already have an account?
                </div>

                <Link
                    href="/"
                    className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-700 py-3 font-medium text-white transition hover:bg-slate-800"
                >
                    Back to Sign In
                </Link>
            </div>
        </main>
    )
}