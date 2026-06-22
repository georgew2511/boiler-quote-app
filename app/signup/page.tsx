'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

// The account whose boilers get copied into every new company on signup,
// so new users land with a working catalogue instead of an empty one.
const TEMPLATE_COMPANY_ID = '6578dad8-9e8a-4189-abf7-d578bda4af47'

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
            const trialEndDate = new Date()
            trialEndDate.setDate(trialEndDate.getDate() + 14)

            const { data: company, error: companyError } = await supabaseBrowser
                .from('companies')
                .insert({
                    company_name: companyName,
                    owner_user_id: data.user.id,
                    subscription_status: 'trial',
                    trial_ends_at: trialEndDate.toISOString(),
                })
                .select()
                .single()

            if (companyError || !company) {
                alert(`Company creation failed: ${companyError?.message || 'Unknown error'}`)
                setLoading(false)
                return
            }

            const { data: defaultPricing, error: pricingReadError } = await supabaseBrowser
                .from('pricing')
                .select('name, value, key, category')
                .is('company_id', null)

            if (pricingReadError) {
                alert(`Failed to load default pricing: ${pricingReadError.message}`)
                setLoading(false)
                return
            }

            if (defaultPricing && defaultPricing.length > 0) {
                const pricingRows = defaultPricing.map((row) => ({
                    name: row.name,
                    value: row.value,
                    key: row.key,
                    category: row.category,
                    company_id: company.id,
                }))

                const { error: pricingInsertError } = await supabaseBrowser
                    .from('pricing')
                    .insert(pricingRows)

                if (pricingInsertError) {
                    alert(`Failed to create company pricing: ${pricingInsertError.message}`)
                    setLoading(false)
                    return
                }
            }

            const { data: templateBoilers, error: boilersReadError } = await supabaseBrowser
                .from('boilers')
                .select('name, tier, category, output, price, warranty, status, image')
                .eq('company_id', TEMPLATE_COMPANY_ID)

            if (boilersReadError) {
                alert(`Failed to load default boilers: ${boilersReadError.message}`)
                setLoading(false)
                return
            }

            if (templateBoilers && templateBoilers.length > 0) {
                const boilerRows = templateBoilers.map((boiler) => ({
                    ...boiler,
                    company_id: company.id,
                }))

                const { error: boilersInsertError } = await supabaseBrowser
                    .from('boilers')
                    .insert(boilerRows)

                if (boilersInsertError) {
                    alert(`Failed to create default boilers: ${boilersInsertError.message}`)
                    setLoading(false)
                    return
                }
            }
        }

        alert('Account created successfully. Please check your email and verify your account before signing in.')

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