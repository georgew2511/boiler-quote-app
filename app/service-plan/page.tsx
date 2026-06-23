'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Plan {
    id: number
    name: string
    price_monthly: number
    price_annual: number
    includes_annual_service: boolean
    includes_breakdown_cover: boolean
    includes_parts_and_labour: boolean
    includes_priority_callout: boolean
    custom_features?: string[]
    is_featured?: boolean
    gocardless_link?: string | null
    status: string
}

function Check({ color }: { color: string }) {
    return (
        <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: color }}
        >
            ✓
        </span>
    )
}

function ServicePlanContent() {
    const searchParams = useSearchParams()
    const companyId = searchParams.get('company_id')

    const [company, setCompany] = useState<any>(null)
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'annual'>('monthly')
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [phoneError, setPhoneError] = useState('')

    const [customer, setCustomer] = useState({
        name: '',
        email: '',
        phone: '',
        postcode: '',
    })

    useEffect(() => {
        async function load() {
            if (!companyId) {
                setLoading(false)
                return
            }

            const { data: companyData } = await supabase
                .from('companies')
                .select('id, company_name')
                .eq('id', companyId)
                .maybeSingle()

            const { data: settingsData } = await supabase
                .from('company_settings')
                .select('logo_url, primary_colour, phone_number, google_reviews_url, trustpilot_url')
                .eq('company_id', companyId)
                .maybeSingle()

            setCompany({ ...companyData, ...settingsData })

            const { data: plansData } = await supabase
                .from('service_plans')
                .select('*')
                .eq('company_id', companyId)
                .eq('status', 'Active')
                .order('price_monthly')

            setPlans(plansData || [])
            setLoading(false)
        }

        load()
    }, [companyId])

    const brandColor = company?.primary_colour || '#16a34a'

    function validatePhone(phone: string) {
        return /^07\d{9}$/.test(phone.replace(/\s/g, ''))
    }

    async function handleSubmit() {
        if (!selectedPlan || !companyId) return

        if (!selectedPlan.gocardless_link) {
            setError("This plan isn't ready for online sign-ups yet. Please contact us directly to get set up.")
            return
        }

        setSubmitting(true)
        setError('')

        const now = new Date()
        const nextRenewal = new Date(now)
        if (billingFrequency === 'monthly') {
            nextRenewal.setMonth(nextRenewal.getMonth() + 1)
        } else {
            nextRenewal.setFullYear(nextRenewal.getFullYear() + 1)
        }
        const nextServiceDue = new Date(now)
        nextServiceDue.setFullYear(nextServiceDue.getFullYear() + 1)

        // We capture the sign-up as a lead first so the company can see who's
        // coming, then hand off to the GoCardless link they've set up themselves
        // for that plan to actually take payment details.
        const { error: insertError } = await supabase.from('service_plan_subscriptions').insert({
            company_id: companyId,
            service_plan_id: selectedPlan.id,
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone,
            customer_postcode: customer.postcode,
            billing_frequency: billingFrequency,
            price_at_signup: billingFrequency === 'annual' ? selectedPlan.price_annual : selectedPlan.price_monthly,
            payment_provider: 'gocardless',
            status: 'Pending',
            next_renewal_date: nextRenewal.toISOString().slice(0, 10),
            next_service_due_date: nextServiceDue.toISOString().slice(0, 10),
            started_at: now.toISOString(),
        })

        if (insertError) {
            setError('Something went wrong submitting your sign-up. Please try again.')
            setSubmitting(false)
            return
        }

        ;(window as any).dataLayer = (window as any).dataLayer || []
        ;(window as any).dataLayer.push({
            event: 'service_plan_signup',
            plan_name: selectedPlan.name,
            billing_frequency: billingFrequency,
        })

        window.location.href = selectedPlan.gocardless_link
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50">
                <p className="text-gray-400">Loading...</p>
            </main>
        )
    }

    if (!companyId) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
                <p className="text-gray-500">This page needs to be accessed via a company's service plan link.</p>
            </main>
        )
    }

    if (plans.length === 0) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
                <p className="text-gray-500">No service plans are available right now. Please check back later.</p>
            </main>
        )
    }

    const reviewsUrl = company.google_reviews_url || company.trustpilot_url

    return (
        <main className="min-h-screen bg-gray-50">
            <div
                className="border-b border-gray-200 bg-white pb-12 pt-10"
                style={{ backgroundImage: `linear-gradient(180deg, ${brandColor}14, transparent)` }}
            >
                <div className="mx-auto max-w-5xl px-6 text-center">
                    {company?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={company.logo_url} alt={company.company_name} className="mx-auto mb-5 h-12" />
                    ) : (
                        <h2 className="text-xl font-bold text-gray-700">{company?.company_name}</h2>
                    )}
                    <h1 className="mt-2 text-4xl font-bold text-gray-900 sm:text-5xl">Boiler Service Plans</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
                        Keep your boiler covered all year round with cover from {company.company_name}. Choose a plan and we'll take care of the rest.
                    </p>

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                            ✓ Gas Safe Registered
                        </span>
                        {company.phone_number && (
                            <a
                                href={`tel:${company.phone_number}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
                            >
                                📞 {company.phone_number}
                            </a>
                        )}
                        {reviewsUrl && (
                            <a
                                href={reviewsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
                            >
                                ⭐ Read Our Reviews
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-6 py-12">
                {!selectedPlan ? (
                    <>
                        <div className="mb-10 flex justify-center">
                            <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
                                <button
                                    onClick={() => setBillingFrequency('monthly')}
                                    style={billingFrequency === 'monthly' ? { backgroundColor: brandColor } : undefined}
                                    className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${billingFrequency === 'monthly' ? 'text-white' : 'text-gray-600'
                                        }`}
                                >
                                    Pay Monthly
                                </button>
                                <button
                                    onClick={() => setBillingFrequency('annual')}
                                    style={billingFrequency === 'annual' ? { backgroundColor: brandColor } : undefined}
                                    className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${billingFrequency === 'annual' ? 'text-white' : 'text-gray-600'
                                        }`}
                                >
                                    Pay Annually
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    style={plan.is_featured ? { borderColor: brandColor, boxShadow: `0 0 0 3px ${brandColor}26` } : undefined}
                                    className={`relative flex flex-col rounded-3xl border bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${plan.is_featured ? 'border-2 sm:scale-[1.03]' : 'border-gray-200'
                                        }`}
                                >
                                    {plan.is_featured && (
                                        <span
                                            className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow"
                                            style={{ backgroundColor: brandColor }}
                                        >
                                            Most Popular
                                        </span>
                                    )}

                                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>

                                    <div className="mt-4 text-4xl font-bold text-gray-900">
                                        £{billingFrequency === 'monthly' ? Number(plan.price_monthly).toFixed(2) : Number(plan.price_annual).toFixed(2)}
                                        <span className="text-base font-normal text-gray-500">
                                            /{billingFrequency === 'monthly' ? 'mo' : 'yr'}
                                        </span>
                                    </div>

                                    <ul className="mt-6 flex-1 space-y-3 text-gray-600">
                                        {plan.includes_annual_service && (
                                            <li className="flex items-start gap-2">
                                                <Check color={brandColor} /> Annual boiler service
                                            </li>
                                        )}
                                        {plan.includes_breakdown_cover && (
                                            <li className="flex items-start gap-2">
                                                <Check color={brandColor} /> Breakdown cover
                                            </li>
                                        )}
                                        {plan.includes_parts_and_labour && (
                                            <li className="flex items-start gap-2">
                                                <Check color={brandColor} /> Parts &amp; labour included
                                            </li>
                                        )}
                                        {plan.includes_priority_callout && (
                                            <li className="flex items-start gap-2">
                                                <Check color={brandColor} /> Priority callout
                                            </li>
                                        )}
                                        {(plan.custom_features || []).map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <Check color={brandColor} /> {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => setSelectedPlan(plan)}
                                        style={{ backgroundColor: brandColor }}
                                        className="mt-8 w-full rounded-xl py-3 font-semibold text-white transition-opacity hover:opacity-90"
                                    >
                                        Choose {plan.name}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
                        <button
                            onClick={() => setSelectedPlan(null)}
                            className="mb-4 text-sm text-gray-500 hover:underline"
                        >
                            ← Choose a different plan
                        </button>

                        <h2 className="text-2xl font-bold text-gray-900">
                            {selectedPlan.name} — £{billingFrequency === 'monthly' ? Number(selectedPlan.price_monthly).toFixed(2) : Number(selectedPlan.price_annual).toFixed(2)}/{billingFrequency === 'monthly' ? 'mo' : 'yr'}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">Enter your details to get started.</p>

                        <div className="mt-6 space-y-4">
                            <input
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-base transition-all focus:bg-white focus:outline-none focus:ring-4"
                                style={{ '--tw-ring-color': `${brandColor}33` } as React.CSSProperties}
                                placeholder="Full Name"
                                value={customer.name}
                                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                            />
                            <input
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-base transition-all focus:bg-white focus:outline-none focus:ring-4"
                                style={{ '--tw-ring-color': `${brandColor}33` } as React.CSSProperties}
                                placeholder="Email Address"
                                type="email"
                                value={customer.email}
                                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                            />
                            <input
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-base transition-all focus:bg-white focus:outline-none focus:ring-4"
                                style={{ '--tw-ring-color': `${brandColor}33` } as React.CSSProperties}
                                placeholder="Postcode"
                                value={customer.postcode}
                                onChange={(e) => setCustomer({ ...customer, postcode: e.target.value.toUpperCase().trim() })}
                            />
                            <input
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-base transition-all focus:bg-white focus:outline-none focus:ring-4"
                                style={{ '--tw-ring-color': `${brandColor}33` } as React.CSSProperties}
                                placeholder="Mobile Number"
                                value={customer.phone}
                                onChange={(e) => {
                                    const phone = e.target.value
                                    setCustomer({ ...customer, phone })

                                    if (phone && !validatePhone(phone)) {
                                        setPhoneError('Please enter a valid UK mobile number, e.g. 07123 456789')
                                    } else {
                                        setPhoneError('')
                                    }
                                }}
                            />

                            {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <p className="text-xs text-gray-400">
                                Payment is set up by {company.company_name} after sign-up — you won't be charged here.
                            </p>

                            <button
                                onClick={handleSubmit}
                                disabled={
                                    submitting ||
                                    !customer.name ||
                                    !customer.email ||
                                    !customer.postcode ||
                                    !customer.phone ||
                                    !validatePhone(customer.phone)
                                }
                                style={{ backgroundColor: brandColor }}
                                className="w-full rounded-2xl py-5 text-lg font-semibold text-white shadow-xl transition-opacity hover:opacity-90 disabled:opacity-30"
                            >
                                {submitting ? 'Submitting...' : 'Confirm Sign-Up'}
                            </button>
                        </div>
                    </div>
                )}

                {company.phone_number && (
                    <p className="mt-10 text-center text-sm text-gray-400">
                        Prefer to talk it through? Call {company.company_name} on{' '}
                        <a href={`tel:${company.phone_number}`} className="font-semibold" style={{ color: brandColor }}>
                            {company.phone_number}
                        </a>
                        .
                    </p>
                )}
            </div>
        </main>
    )
}

export default function ServicePlanPage() {
    return (
        <Suspense fallback={null}>
            <ServicePlanContent />
        </Suspense>
    )
}
