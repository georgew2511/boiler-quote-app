import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import {
    getInactivityEmailSettings,
    saveInactivityEmailSettings,
    sendInactivityEmail,
    INACTIVITY_LOGIN_URL,
    getLeadEmailSettings,
    saveLeadEmailSettings,
    sendLeadEmail,
    LEAD_DASHBOARD_URL,
} from '@/lib/systemSettings'

export default async function SuperAdminSettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ testEmail?: string; testEmailError?: string }>
}) {
    const { testEmail, testEmailError } = await searchParams
    const company = await getCurrentCompany()

    if (!company.isSuperAdmin) {
        return (
            <main className="p-8">
                <h1 className="text-2xl font-bold text-red-600">Access denied</h1>
            </main>
        )
    }

    const inactivityEmailSettings = await getInactivityEmailSettings()
    const leadEmailSettings = await getLeadEmailSettings()

    async function saveInactivitySettings(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        await saveInactivityEmailSettings({
            enabled: formData.get('enabled') === 'on',
            daysInactive: Number(formData.get('daysInactive')) || 3,
            subject: (formData.get('subject') as string) || '',
            body: (formData.get('body') as string) || '',
        })

        redirect('/superadmin/settings')
    }

    async function sendTestInactivityEmail(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        // Sends whatever is currently typed in the form — including unsaved
        // edits — so you can preview a change before committing to it.
        const draftSettings = {
            enabled: formData.get('enabled') === 'on',
            daysInactive: Number(formData.get('daysInactive')) || 3,
            subject: (formData.get('subject') as string) || '',
            body: (formData.get('body') as string) || '',
        }

        const customEmail = (formData.get('testEmailAddress') as string || '').trim()
        let toEmail = customEmail

        if (!toEmail) {
            const adminClient = createAdminClient()
            const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
                requestingCompany.owner_user_id
            )
            toEmail = userData?.user?.email || ''

            if (userError || !toEmail) {
                redirect(`/superadmin/settings?testEmailError=${encodeURIComponent('Could not find your account email')}`)
            }
        }

        const { error: sendError } = await sendInactivityEmail(toEmail, draftSettings, {
            company_name: requestingCompany.company_name,
            login_url: INACTIVITY_LOGIN_URL,
        })

        if (sendError) {
            redirect(`/superadmin/settings?testEmailError=${encodeURIComponent(sendError.message)}`)
        }

        redirect(`/superadmin/settings?testEmail=${encodeURIComponent(toEmail)}`)
    }

    async function saveLeadSettings(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        await saveLeadEmailSettings({
            enabled: formData.get('leadEnabled') === 'on',
            subject: (formData.get('leadSubject') as string) || '',
            body: (formData.get('leadBody') as string) || '',
        })

        redirect('/superadmin/settings')
    }

    async function sendTestLeadEmail(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        // Sends what's currently typed, including unsaved edits — same as the
        // inactivity test button above.
        const draftSettings = {
            enabled: formData.get('leadEnabled') === 'on',
            subject: (formData.get('leadSubject') as string) || '',
            body: (formData.get('leadBody') as string) || '',
        }

        const customEmail = ((formData.get('leadTestEmailAddress') as string) || '').trim()
        let toEmail = customEmail

        if (!toEmail) {
            const adminClient = createAdminClient()
            const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
                requestingCompany.owner_user_id,
            )
            toEmail = userData?.user?.email || ''

            if (userError || !toEmail) {
                redirect(
                    `/superadmin/settings?testEmailError=${encodeURIComponent('Could not find your account email')}`,
                )
            }
        }

        const { error: sendError } = await sendLeadEmail(toEmail, draftSettings, {
            company_name: requestingCompany.company_name,
            lead_name: 'Jane Example',
            lead_email: 'jane@example.com',
            lead_phone: '07700 900123',
            lead_postcode: 'GU1 1AA',
            lead_boiler: 'Worcester Bosch 4000 25kW',
            lead_price: '£2,450',
            dashboard_url: LEAD_DASHBOARD_URL,
        })

        if (sendError) {
            redirect(`/superadmin/settings?testEmailError=${encodeURIComponent(sendError.message)}`)
        }

        redirect(`/superadmin/settings?testEmail=${encodeURIComponent(toEmail)}`)
    }

    return (
        <main>
            <h1 className="text-4xl font-bold">Settings</h1>
            <p className="mt-2 text-gray-600">Platform-wide automation settings.</p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold">Inactivity Email</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Automatically nudges a company's owner by email once they've gone quiet on the dashboard.
                    Runs once a day. Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{'{{company_name}}'}</code>{' '}
                    and <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{'{{login_url}}'}</code> as placeholders
                    in the subject or body — they'll be filled in automatically for each company.
                </p>

                {testEmail && (
                    <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                        ✓ Test email sent to {testEmail} — check your inbox to see how it looks.
                    </div>
                )}
                {testEmailError && (
                    <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                        Failed to send test email: {testEmailError}
                    </div>
                )}

                <form action={saveInactivitySettings} className="mt-6 space-y-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                            type="checkbox"
                            name="enabled"
                            defaultChecked={inactivityEmailSettings.enabled}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Send inactivity emails
                    </label>

                    <div className="max-w-xs">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Send after this many days of inactivity
                        </label>
                        <input
                            type="number"
                            name="daysInactive"
                            min={1}
                            defaultValue={inactivityEmailSettings.daysInactive}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                        <input
                            type="text"
                            name="subject"
                            defaultValue={inactivityEmailSettings.subject}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
                        <textarea
                            name="body"
                            rows={8}
                            defaultValue={inactivityEmailSettings.body}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Test email address <span className="text-slate-400">(optional — defaults to your own account email)</span>
                        </label>
                        <input
                            type="email"
                            name="testEmailAddress"
                            placeholder="you@example.com"
                            className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="submit"
                            className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
                        >
                            Save
                        </button>
                        <button
                            type="submit"
                            formAction={sendTestInactivityEmail}
                            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                            title="Sends using whatever's currently in the fields above, without saving"
                        >
                            Send Test Email
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold">New Lead Email</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Sent from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">noreply@relode.io</code> the
                    moment a lead lands in a company&apos;s app. Goes to the notification address set in their Settings,
                    falling back to the email the account signed up with. Preview/test leads never trigger it.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                    Placeholders:{' '}
                    {[
                        '{{company_name}}',
                        '{{lead_name}}',
                        '{{lead_email}}',
                        '{{lead_phone}}',
                        '{{lead_postcode}}',
                        '{{lead_boiler}}',
                        '{{lead_price}}',
                        '{{dashboard_url}}',
                    ].map((p) => (
                        <code key={p} className="mr-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                            {p}
                        </code>
                    ))}
                </p>

                <form action={saveLeadSettings} className="mt-6 space-y-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                            type="checkbox"
                            name="leadEnabled"
                            defaultChecked={leadEmailSettings.enabled}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Send new lead emails
                    </label>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                        <input
                            type="text"
                            name="leadSubject"
                            defaultValue={leadEmailSettings.subject}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
                        <textarea
                            name="leadBody"
                            rows={12}
                            defaultValue={leadEmailSettings.body}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Test email address{' '}
                            <span className="text-slate-400">(optional — defaults to your own account email)</span>
                        </label>
                        <input
                            type="email"
                            name="leadTestEmailAddress"
                            placeholder="you@example.com"
                            className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="submit"
                            className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
                        >
                            Save
                        </button>
                        <button
                            type="submit"
                            formAction={sendTestLeadEmail}
                            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                            title="Sends using whatever's currently in the fields above, without saving"
                        >
                            Send Test Email
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}
