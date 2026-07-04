'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async () => {
        try {
            setLoading(true)
            const supabase = createClient()

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            console.log('LOGIN ERROR:', error)

            const { data: sessionData } = await supabase.auth.getSession()

            console.log('SESSION:', sessionData.session)

            if (error) {
                alert(error.message)
                return
            }

            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                alert('Unable to retrieve user account')
                return
            }

            console.log('User ID:', user.id)

            // Check owner account first
            const { data: company } = await supabase
                .from('companies')
                .select('subscription_status')
                .eq('owner_user_id', user.id)
                .maybeSingle()

            if (company) {
                if (
                    company.subscription_status !== 'trial' &&
                    company.subscription_status !== 'active'
                ) {
                    alert('Your subscription is not active. Please contact support.')
                    return
                }
                router.push('/admin')
                return
            }

            // Not an owner — check if they are a company member
            const { data: membership } = await supabase
                .from('company_members')
                .select('id, accepted_at')
                .eq('user_id', user.id)
                .not('accepted_at', 'is', null)
                .maybeSingle()

            if (membership) {
                router.push('/admin')
                return
            }

            alert('No account found. Please contact your administrator.')
            await supabase.auth.signOut()
        } catch (err) {
            console.error(err)
            alert('Login failed. Check the browser console for details.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_60%)]" />

            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 px-8 pb-8 pt-4 shadow-2xl backdrop-blur">
                <div className="mb-1 text-center">
                    <img
                        src="/relode-logo-white.png"
                        alt="Relode"
                        className="mx-auto w-[220px] h-auto"
                    />
                    <p className="mt-3 text-slate-400">
                        Sign in to access your quote calculator dashboard.
                    </p>
                </div>

                <form className="space-y-5">
                    <div>
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

                    <button
                        type="button"
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-400">
                    Don&apos;t have an account?
                </div>

                <Link
                    href="/signup"
                    className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-700 py-3 font-medium text-white transition hover:bg-slate-800"
                >
                    Create Account
                </Link>

                <button
                    type="button"
                    className="mt-4 w-full text-sm text-slate-400 hover:text-white"
                >
                    Forgot Password?
                </button>
            </div>
        </main>
    )
}
