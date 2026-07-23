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
        logo_size: 100,
        primary_colour: '#16a34a',
        secondary_colour: '#0f172a',
        phone_number: '',
        email_address: '',
        website: '',
        from_email: '',
        reply_to_email: '',
        lead_notification_email: '',
        gtm_id: '',
        ga4_id: '',
        vat_registered: false,
        finance_enabled: true,
        finance_deposit_percent: 10,
        apr: 11.9,
        finance_disclosure: '',
        // Interest-bearing loan term toggles (months)
        loan_term_12: false,
        loan_term_24: false,
        loan_term_36: false,
        loan_term_48: false,
        loan_term_60: true,
        // 0% interest term toggles (months): 0 = off
        zero_term_12: false,
        zero_term_24: true,
        zero_term_36: false,
        quote_validity_days: 30,
        workmanship_warranty_months: 12,
        google_reviews_url: '',
        trustpilot_url: '',
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
                    // Decode JSON finance_loan_terms into individual boolean toggles
                    let loanTerms: number[] = [60]
                    try {
                        const parsed = JSON.parse(data.finance_loan_terms ?? '[]')
                        if (Array.isArray(parsed)) loanTerms = parsed
                    } catch {}

                    setSettings((prev) => ({
                        ...prev,
                        ...data,
                        company_name: company.company_name || prev.company_name,
                        finance_deposit_percent: Number(data.finance_deposit_percent ?? 10),
                        loan_term_12: loanTerms.includes(12),
                        loan_term_24: loanTerms.includes(24),
                        loan_term_36: loanTerms.includes(36),
                        loan_term_48: loanTerms.includes(48),
                        loan_term_60: loanTerms.includes(60),
                        zero_term_12: Number(data.zero_percent_term_1) === 12 || Number(data.zero_percent_term_2) === 12 || Number(data.zero_percent_term_3) === 12,
                        zero_term_24: Number(data.zero_percent_term_1) === 24 || Number(data.zero_percent_term_2) === 24 || Number(data.zero_percent_term_3) === 24,
                        zero_term_36: Number(data.zero_percent_term_1) === 36 || Number(data.zero_percent_term_2) === 36 || Number(data.zero_percent_term_3) === 36,
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
                            <p className="text-sm text-slate-500">Finance Deposit</p>
                            <p className="mt-2 text-xl font-bold">{settings.finance_deposit_percent}%</p>
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
                                                className="w-auto"
                                                style={{ height: `${20 * (settings.logo_size / 100)}px` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <p className="mt-2 text-sm text-gray-500">
                                    Upload a logo or paste an image URL.
                                </p>

                                {settings.logo_url && (
                                    <div className="mt-4">
                                        <label className="mb-2 flex items-center justify-between font-medium">
                                            <span>Logo Size</span>
                                            <span className="text-sm font-normal text-slate-500">{settings.logo_size}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="25"
                                            max="300"
                                            step="5"
                                            value={settings.logo_size}
                                            onChange={(e) => setSettings({ ...settings, logo_size: Number(e.target.value) })}
                                            className="w-full accent-[var(--brand,#16a34a)]"
                                        />
                                        <p className="mt-2 text-sm text-gray-500">
                                            If your logo looks too small or too large in the sidebar, adjust it here.
                                        </p>
                                    </div>
                                )}

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
                                <label className="mb-2 block font-medium">Reply-To Email Address</label>
                                <input
                                    type="email"
                                    value={settings.reply_to_email}
                                    onChange={(e) => setSettings({ ...settings, reply_to_email: e.target.value })}
                                    placeholder="where customers can reply to quotes"
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
                        <div className="mt-6 space-y-6">
                            {/* Deposit + APR */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block font-medium">Deposit Required (%)</label>
                                    <p className="mb-2 text-xs text-slate-400">Applies to both the online quote calculator and surveyor quotes.</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={settings.finance_deposit_percent}
                                            onChange={(e) => setSettings({ ...settings, finance_deposit_percent: Number(e.target.value) })}
                                            className="w-28 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                        <span className="text-slate-500 font-medium">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-2 block font-medium">Interest Rate (APR %)</label>
                                    <p className="mb-2 text-xs text-slate-400">Used for interest-bearing loan calculations.</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={settings.apr}
                                            onChange={(e) => setSettings({ ...settings, apr: Number(e.target.value) })}
                                            className="w-28 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                        <span className="text-slate-500 font-medium">%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Interest-bearing loan terms */}
                            <div>
                                <label className="mb-2 block font-medium">Interest-Bearing Loan Terms</label>
                                <p className="mb-3 text-xs text-slate-400">Select which loan durations to offer customers at the APR rate above.</p>
                                <div className="flex flex-wrap gap-2">
                                    {([12, 24, 36, 48, 60] as const).map((m) => {
                                        const key = `loan_term_${m}` as keyof typeof settings
                                        const checked = !!settings[key]
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setSettings({ ...settings, [key]: !checked })}
                                                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                                                    checked
                                                        ? 'border-blue-600 bg-blue-600 text-white'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                                                }`}
                                            >
                                                {m} months
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* 0% interest terms */}
                            <div>
                                <label className="mb-2 block font-medium">0% Interest Terms</label>
                                <p className="mb-3 text-xs text-slate-400">Select which durations to offer at 0% interest (e.g. buy now pay later).</p>
                                <div className="flex flex-wrap gap-2">
                                    {([12, 24, 36] as const).map((m) => {
                                        const key = `zero_term_${m}` as keyof typeof settings
                                        const checked = !!settings[key]
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setSettings({ ...settings, [key]: !checked })}
                                                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                                                    checked
                                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
                                                }`}
                                            >
                                                {m} months
                                            </button>
                                        )
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => setSettings({ ...settings, zero_term_12: false, zero_term_24: false, zero_term_36: false })}
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-400 hover:border-red-200 hover:text-red-400 transition-colors"
                                    >
                                        None
                                    </button>
                                </div>
                            </div>

                            {/* FCA regulatory disclosure */}
                            <div>
                                <label className="mb-2 block font-medium">Finance Regulatory Disclosure</label>
                                <p className="mb-3 text-xs text-slate-400">
                                    Required by the FCA when you offer finance. Enter the exact wording your finance
                                    provider requires — it shows in full at the bottom of the finance section on every
                                    customer quote. Include your registered company name and address, company number,
                                    your firm reference number, and your credit broker&apos;s details.
                                </p>
                                <textarea
                                    rows={6}
                                    value={settings.finance_disclosure}
                                    onChange={(e) => setSettings({ ...settings, finance_disclosure: e.target.value })}
                                    placeholder="e.g. [COMPANY NAME] LIMITED, registered address …, company number … is an Introducer Appointed Representative of [PROVIDER]. Our firm reference number is …. [PROVIDER] is a trading style of … authorised and regulated by the Financial Conduct Authority (firm reference number …). [PROVIDER] are a credit broker, not a lender … All loans are subject to status."
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                        )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
                        </div>

                        <p className="mt-4 text-sm text-slate-500">
                            These show on every quote your customers receive — the validity date, your workmanship
                            guarantee, and a link to your reviews all appear automatically to build trust.
                        </p>
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

                                    // Encode loan term toggles to DB columns
                    const loanTerms: number[] = []
                    if (settings.loan_term_12) loanTerms.push(12)
                    if (settings.loan_term_24) loanTerms.push(24)
                    if (settings.loan_term_36) loanTerms.push(36)
                    if (settings.loan_term_48) loanTerms.push(48)
                    if (settings.loan_term_60) loanTerms.push(60)

                    const zeroTerms: (number | null)[] = [null, null, null]
                    const zero: number[] = []
                    if (settings.zero_term_12) zero.push(12)
                    if (settings.zero_term_24) zero.push(24)
                    if (settings.zero_term_36) zero.push(36)
                    zero.forEach((v, i) => { zeroTerms[i] = v })

                    const { loan_term_12, loan_term_24, loan_term_36, loan_term_48, loan_term_60,
                            zero_term_12, zero_term_24, zero_term_36, ...rest } = settings

                    const response = await fetch('/api/settings/tracking', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            ...rest,
                                            company_id: companyId,
                                            finance_loan_terms: JSON.stringify(loanTerms),
                                            zero_percent_term_1: zeroTerms[0],
                                            zero_percent_term_2: zeroTerms[1],
                                            zero_percent_term_3: zeroTerms[2],
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