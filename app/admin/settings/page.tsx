'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
    const logoInputRef = useRef<HTMLInputElement>(null)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const router = useRouter()

    const supabase = createClient()
    const [settings, setSettings] = useState({
        company_name: '',
        logo_url: '',
        primary_colour: '#16a34a',
        secondary_colour: '#0f172a',
        phone_number: '',
        email_address: '',
        website: '',
        from_email: '',
        lead_notification_email: '',
        gtm_id: '',
        ga4_id: '',
        minimum_deposit: 500,
        apr: 11.9,
        zero_percent_term_1: 12,
        zero_percent_term_2: 24,
        quote_validity_days: 30,
        workmanship_warranty_months: 12,
        google_reviews_url: '',
        trustpilot_url: '',
        quote_heading: '',
        quote_subheading: '',
    })

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser()

                if (!user) return

                const { data: company } = await supabase
                    .from('companies')
                    .select('id, company_name')
                    .eq('owner_user_id', user.id)
                    .single()

                if (!company) return

                setCompanyId(company.id)
                setSettings((prev) => ({
                    ...prev,
                    company_name: company.company_name || '',
                }))

                const response = await fetch(
                    `/api/settings/tracking?company_id=${company.id}`
                )

                if (!response.ok) return

                const data = await response.json()

                if (data) {
                    setSettings((prev) => ({
                        ...prev,
                        ...data,
                        company_name: company.company_name || prev.company_name,
                    }))
                }
            } catch (error) {
                console.error('Failed to load settings', error)
            }
        }

        loadSettings()
    }, [])

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-7xl">
                <div className="flex items-center gap-4">
                    <a
                        href="/admin"
                        className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-100"
                    >
                        ← Admin Panel
                    </a>

                    <div>
                        <h1 className="text-4xl font-bold">Settings</h1>
                        <p className="mt-2 text-gray-600">
                            Configure company branding, contact details, finance options and quote settings.
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid gap-8">
                    <div className="rounded-2xl border bg-white p-6">
                        <h2 className="text-2xl font-bold">Company Branding</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block font-medium">Company Name</label>
                                <input
                                    type="text"
                                    value={settings.company_name}
                                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Company Logo</label>

                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                />

                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        value={settings.logo_url}
                                        onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                                        className="flex-1 rounded-lg border px-4 py-3"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => logoInputRef.current?.click()}
                                        className="rounded-lg border bg-gray-100 px-4 py-3 font-medium hover:bg-gray-200"
                                    >
                                        Upload Logo
                                    </button>
                                </div>

                                <p className="mt-2 text-sm text-gray-500">
                                    Upload a logo or paste an image URL.
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Next step: connect this upload to a Supabase Storage bucket called company-assets and save the returned URL into company_settings.logo_url.
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Primary Colour</label>
                                <input
                                    type="color"
                                    value={settings.primary_colour}
                                    onChange={(e) => setSettings({ ...settings, primary_colour: e.target.value })}
                                    className="h-12 w-full rounded-lg border"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Secondary Colour</label>
                                <input
                                    type="color"
                                    value={settings.secondary_colour}
                                    onChange={(e) => setSettings({ ...settings, secondary_colour: e.target.value })}
                                    className="h-12 w-full rounded-lg border"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-6">
                        <h2 className="text-2xl font-bold">Company Contact Details</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-2 block font-medium">Phone Number</label>
                                <input
                                    type="text"
                                    value={settings.phone_number}
                                    onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Email Address</label>
                                <input
                                    type="email"
                                    value={settings.email_address}
                                    onChange={(e) => setSettings({ ...settings, email_address: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Website</label>
                                <input
                                    type="text"
                                    value={settings.website}
                                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-6">
                        <h2 className="text-2xl font-bold">Email Settings</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block font-medium">From Email Address</label>
                                <input
                                    type="email"
                                    value={settings.from_email}
                                    onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Lead Notification Email</label>
                                <input
                                    type="email"
                                    value={settings.lead_notification_email}
                                    onChange={(e) => setSettings({ ...settings, lead_notification_email: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-6">
                        <h2 className="text-2xl font-bold">Tracking & Analytics</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block font-medium">Google Tag Manager ID</label>
                                <input
                                    type="text"
                                    value={settings.gtm_id}
                                    onChange={(e) => setSettings({ ...settings, gtm_id: e.target.value })}
                                    placeholder="GTM-XXXXXXX"
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                                <p className="mt-2 text-sm text-gray-500 whitespace-pre-line">
                                    {`Used to load Google Tag Manager and track conversions throughout the quote journey.

IMPORTANT: After connecting your GTM container, create the following Custom Event triggers in Google Tag Manager:

• lead_submitted
• recommendations_viewed
• boiler_selected
• photos_uploaded
• survey_requested

These events are automatically pushed by the quote calculator and can be connected to Google Ads conversion actions and GA4 events. Without creating these GTM triggers, conversions will not be recorded correctly.`}
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Google Analytics Measurement ID</label>
                                <input
                                    type="text"
                                    value={settings.ga4_id}
                                    onChange={(e) => setSettings({ ...settings, ga4_id: e.target.value })}
                                    placeholder="G-XXXXXXXXXX"
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    Optional GA4 measurement ID.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-6">
                        <h2 className="text-2xl font-bold">Finance Settings</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-4">
                            <div>
                                <label className="mb-2 block font-medium">Minimum Deposit (£)</label>
                                <input
                                    type="number"
                                    value={settings.minimum_deposit}
                                    onChange={(e) => setSettings({ ...settings, minimum_deposit: Number(e.target.value) })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">APR (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={settings.apr}
                                    onChange={(e) => setSettings({ ...settings, apr: Number(e.target.value) })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">0% Term 1 (Months)</label>
                                <input
                                    type="number"
                                    value={settings.zero_percent_term_1}
                                    onChange={(e) => setSettings({ ...settings, zero_percent_term_1: Number(e.target.value) })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">0% Term 2 (Months)</label>
                                <input
                                    type="number"
                                    value={settings.zero_percent_term_2}
                                    onChange={(e) => setSettings({ ...settings, zero_percent_term_2: Number(e.target.value) })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-6">
                        <h2 className="text-2xl font-bold">Quote Settings</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-2 block font-medium">Quote Validity (Days)</label>
                                <input
                                    type="number"
                                    value={settings.quote_validity_days}
                                    onChange={(e) => setSettings({ ...settings, quote_validity_days: Number(e.target.value) })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Workmanship Warranty (Months)</label>
                                <input
                                    type="number"
                                    value={settings.workmanship_warranty_months}
                                    onChange={(e) => setSettings({ ...settings, workmanship_warranty_months: Number(e.target.value) })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Google Reviews URL</label>
                                <input
                                    type="text"
                                    value={settings.google_reviews_url}
                                    onChange={(e) => setSettings({ ...settings, google_reviews_url: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Trustpilot URL</label>
                                <input
                                    type="text"
                                    placeholder="https://trustpilot.com/..."
                                    value={settings.trustpilot_url}
                                    onChange={(e) => setSettings({ ...settings, trustpilot_url: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Quote Calculator Heading</label>
                                <input
                                    type="text"
                                    value={settings.quote_heading}
                                    onChange={(e) => setSettings({ ...settings, quote_heading: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Quote Calculator Subheading</label>
                                <input
                                    type="text"
                                    value={settings.quote_subheading}
                                    onChange={(e) => setSettings({ ...settings, quote_subheading: e.target.value })}
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={async () => {
                                try {
                                    if (!companyId) {
                                        alert('No company found for this account')
                                        return
                                    }
                                    const { data: updatedCompany, error: companyUpdateError } = await supabase
                                        .from('companies')
                                        .update({
                                            company_name: settings.company_name,
                                        })
                                        .eq('id', companyId)
                                        .select()

                                    console.log('ATTEMPTING COMPANY UPDATE:', {
                                        companyId,
                                        company_name: settings.company_name,
                                    })
                                    console.log('UPDATED COMPANY RESULT:', updatedCompany)
                                    console.log('UPDATED COMPANY ERROR:', companyUpdateError)

                                    if (companyUpdateError) {
                                        alert(`Failed to update company name: ${companyUpdateError.message}`)
                                        return
                                    }

                                    if (!updatedCompany || updatedCompany.length === 0) {
                                        alert('Company update affected 0 rows. Check RLS policies on the companies table.')
                                        return
                                    }

                                    const response = await fetch('/api/settings/tracking', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            ...settings,
                                            company_id: companyId,
                                        }),
                                    })

                                    if (!response.ok) {
                                        alert('Failed to save settings')
                                        return
                                    }

                                    alert('Settings saved successfully')
                                    router.refresh()
                                    router.push('/admin')
                                } catch (error) {
                                    console.error(error)
                                    alert('Failed to save settings')
                                }
                            }}
                            className="rounded-xl bg-green-600 px-8 py-4 font-semibold text-white hover:bg-green-700"
                        >
                            Save Company Settings
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}