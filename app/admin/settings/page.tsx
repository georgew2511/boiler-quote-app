'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
    const logoInputRef = useRef<HTMLInputElement>(null)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [uploadingLogo, setUploadingLogo] = useState(false)
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
        vat_registered: false,
        finance_enabled: true,
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

    const handleLogoUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        try {
            const file = event.target.files?.[0]

            if (!file) return

            if (!companyId) {
                alert('No company found')
                return
            }

            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file')
                return
            }

            const maxFileSize = 2 * 1024 * 1024

            if (file.size > maxFileSize) {
                alert('Logo file is too large. Please upload an image under 2MB.')
                return
            }

            setUploadingLogo(true)

            const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
            const safeFileName = `logo-${Date.now()}.${fileExt}`
            const filePath = `${companyId}/${safeFileName}`

            const { error: uploadError } = await supabase.storage
                .from('company-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    contentType: file.type,
                    upsert: true,
                })

            if (uploadError) {
                console.error('Supabase logo upload error:', uploadError)
                alert(`Failed to upload logo: ${uploadError.message}`)
                return
            }

            const { data } = supabase.storage
                .from('company-assets')
                .getPublicUrl(filePath)

            if (!data.publicUrl) {
                alert('Logo uploaded, but no public URL was returned')
                return
            }

            setSettings((prev) => ({
                ...prev,
                logo_url: data.publicUrl,
            }))

            alert('Logo uploaded successfully. Remember to save company settings.')
        } catch (error) {
            console.error('Unexpected logo upload error:', error)
            alert('Failed to upload logo. Check the browser console for details.')
        } finally {
            setUploadingLogo(false)
            event.target.value = ''
        }
    }

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser()

                if (!user) {
                    alert('No user found')
                    return
                }

                const { data: company, error: companyError } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('owner_user_id', user.id)
                    .single()

                if (companyError || !company) {
                    console.error(companyError)
                    alert('No company found for this account')
                    return
                }



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
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-7xl">
                <div className="flex items-center gap-4">
                    <a
                        href="/admin"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
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
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">Company</p>
                            <p className="mt-2 text-xl font-bold">{settings.company_name || 'Not Set'}</p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">Quote Validity</p>
                            <p className="mt-2 text-xl font-bold">{settings.quote_validity_days} Days</p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">Workmanship Warranty</p>
                            <p className="mt-2 text-xl font-bold">{settings.workmanship_warranty_months} Months</p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">Minimum Deposit</p>
                            <p className="mt-2 text-xl font-bold">£{settings.minimum_deposit}</p>
                        </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-bold">Company Branding</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block font-medium">Company Name</label>
                                <input
                                    type="text"
                                    value={settings.company_name}
                                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Company Logo</label>

                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />

                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        value={settings.logo_url || ''}
                                        onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                                        className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />

                                    <button
                                        type="button"
                                        disabled={uploadingLogo}
                                        onClick={() => logoInputRef.current?.click()}
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                                    </button>
                                    {settings.logo_url && (
                                        <div className="mt-4">
                                            <img
                                                src={settings.logo_url}
                                                alt="Company Logo"
                                                className="h-20 w-auto"
                                            />
                                        </div>
                                    )}
                                </div>

                                <p className="mt-2 text-sm text-gray-500">
                                    Upload a logo or paste an image URL.
                                </p>

                            </div>

                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-bold">Branding Colour</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            This colours the buttons, progress bar, guarantee stickers and accents your
                            customers see on the quote calculator and service plan sign-up page — so it
                            matches the rest of your website.
                        </p>

                        <div className="mt-6 flex flex-wrap items-center gap-4">
                            <input
                                type="color"
                                value={settings.primary_colour || '#16a34a'}
                                onChange={(e) => setSettings({ ...settings, primary_colour: e.target.value })}
                                className="h-14 w-14 cursor-pointer rounded-2xl border border-slate-300 p-1"
                            />

                            <input
                                type="text"
                                value={settings.primary_colour || ''}
                                onChange={(e) => setSettings({ ...settings, primary_colour: e.target.value })}
                                placeholder="#16a34a"
                                className="w-36 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />

                            <div
                                className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm"
                                style={{ backgroundColor: settings.primary_colour || '#16a34a' }}
                            >
                                Preview Button
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-bold">Company Contact Details</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-2 block font-medium">Phone Number</label>
                                <input
                                    type="text"
                                    value={settings.phone_number}
                                    onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Email Address</label>
                                <input
                                    type="email"
                                    value={settings.email_address}
                                    onChange={(e) => setSettings({ ...settings, email_address: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Website</label>
                                <input
                                    type="text"
                                    value={settings.website}
                                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-bold">Email Settings</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block font-medium">From Email Address</label>
                                <input
                                    type="email"
                                    value={settings.from_email}
                                    onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Lead Notification Email</label>
                                <input
                                    type="email"
                                    value={settings.lead_notification_email}
                                    onChange={(e) => setSettings({ ...settings, lead_notification_email: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-bold">Tracking & Analytics</h2>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block font-medium">Google Tag Manager ID</label>
                                <input
                                    type="text"
                                    value={settings.gtm_id}
                                    onChange={(e) => setSettings({ ...settings, gtm_id: e.target.value })}
                                    placeholder="GTM-XXXXXXX"
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-bold">VAT</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            If your business is VAT registered, 20% VAT is automatically added to every price your customers see on the quote calculator. If you're not VAT registered, leave this off and customers will see your price as entered, with no VAT added.
                        </p>

                        <button
                            type="button"
                            onClick={() => setSettings({ ...settings, vat_registered: !settings.vat_registered })}
                            className={`mt-4 inline-flex items-center rounded-full py-2 pl-2.5 pr-3.5 text-sm font-medium transition-colors ${settings.vat_registered ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                }`}
                        >
                            <span
                                className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${settings.vat_registered ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition-all ${settings.vat_registered ? 'left-[18px]' : 'left-[2px]'
                                        }`}
                                />
                            </span>
                            <span className="ml-2.5">
                                {settings.vat_registered ? 'VAT Registered (adding 20% to quotes)' : 'Not VAT Registered (no VAT added)'}
                            </span>
                        </button>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Finance Settings</h2>
                            <label className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600">
                                    {settings.finance_enabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <input
                                    type="checkbox"
                                    checked={settings.finance_enabled}
                                    onChange={(e) => setSettings({ ...settings, finance_enabled: e.target.checked })}
                                    className="h-5 w-5 rounded border-slate-300 text-[var(--brand,#16a34a)]"
                                />
                            </label>
                        </div>

                        {settings.finance_enabled && (
                        <div className="mt-6 grid gap-4 md:grid-cols-4">
                            <div>
                                <label className="mb-2 block font-medium">Minimum Deposit (£)</label>
                                <input
                                    type="number"
                                    value={settings.minimum_deposit}
                                    onChange={(e) => setSettings({ ...settings, minimum_deposit: Number(e.target.value) })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">APR (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={settings.apr}
                                    onChange={(e) => setSettings({ ...settings, apr: Number(e.target.value) })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">0% Term 1 (Months)</label>
                                <input
                                    type="number"
                                    value={settings.zero_percent_term_1}
                                    onChange={(e) => setSettings({ ...settings, zero_percent_term_1: Number(e.target.value) })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">0% Term 2 (Months)</label>
                                <input
                                    type="number"
                                    value={settings.zero_percent_term_2}
                                    onChange={(e) => setSettings({ ...settings, zero_percent_term_2: Number(e.target.value) })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                        )}
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
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Workmanship Warranty (Months)</label>
                                <input
                                    type="number"
                                    value={settings.workmanship_warranty_months}
                                    onChange={(e) => setSettings({ ...settings, workmanship_warranty_months: Number(e.target.value) })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Google Reviews URL</label>
                                <input
                                    type="text"
                                    value={settings.google_reviews_url}
                                    onChange={(e) => setSettings({ ...settings, google_reviews_url: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-medium">Trustpilot URL</label>
                                <input
                                    type="text"
                                    placeholder="https://trustpilot.com/..."
                                    value={settings.trustpilot_url}
                                    onChange={(e) => setSettings({ ...settings, trustpilot_url: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                            className="rounded-xl border border-emerald-700 bg-emerald-700 px-8 py-4 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
                        >
                            Save Company Settings
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}