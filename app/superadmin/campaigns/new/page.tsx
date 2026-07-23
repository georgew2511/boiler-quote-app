import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { SEGMENT_LABELS, CampaignSegment } from '@/lib/campaignSegments'
import { executeCampaignSend, sendTestCampaignEmail } from '@/lib/campaigns'

export default async function NewCampaignPage({
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

    async function sendNow(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        const subject = (formData.get('subject') as string || '').trim()
        const body = (formData.get('body') as string || '').trim()
        const segment = formData.get('segment') as string

        if (!subject || !body) {
            throw new Error('Subject and body are required')
        }

        const adminClient = createAdminClient()
        const { data: campaign, error } = await adminClient
            .from('campaigns')
            .insert({ subject, body, segment, status: 'draft' })
            .select()
            .single()

        if (error || !campaign) {
            throw new Error(`Failed to create campaign: ${error?.message}`)
        }

        await executeCampaignSend(campaign.id)

        redirect('/superadmin/campaigns')
    }

    async function schedule(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        const subject = (formData.get('subject') as string || '').trim()
        const body = (formData.get('body') as string || '').trim()
        const segment = formData.get('segment') as string
        const scheduledAt = formData.get('scheduledAt') as string

        if (!subject || !body || !scheduledAt) {
            throw new Error('Subject, body and a scheduled time are required')
        }

        const adminClient = createAdminClient()
        const { error } = await adminClient.from('campaigns').insert({
            subject,
            body,
            segment,
            status: 'scheduled',
            scheduled_at: new Date(scheduledAt).toISOString(),
        })

        if (error) {
            throw new Error(`Failed to schedule campaign: ${error.message}`)
        }

        redirect('/superadmin/campaigns')
    }

    async function sendTest(formData: FormData) {
        'use server'

        const requestingCompany = await getCurrentCompany()
        if (!requestingCompany.isSuperAdmin) {
            throw new Error('Not authorized')
        }

        const subject = (formData.get('subject') as string || '').trim()
        const body = (formData.get('body') as string || '').trim()
        const customEmail = (formData.get('testEmailAddress') as string || '').trim()

        let toEmail = customEmail
        if (!toEmail) {
            const adminClient = createAdminClient()
            const { data: userData } = await adminClient.auth.admin.getUserById(requestingCompany.owner_user_id)
            toEmail = userData?.user?.email || ''
        }

        if (!toEmail) {
            redirect(`/superadmin/campaigns/new?testEmailError=${encodeURIComponent('Could not find your account email')}`)
        }

        const { error: sendError } = await sendTestCampaignEmail(
            toEmail,
            { subject, body },
            requestingCompany.company_name
        )

        if (sendError) {
            redirect(`/superadmin/campaigns/new?testEmailError=${encodeURIComponent(sendError.message)}`)
        }

        redirect(`/superadmin/campaigns/new?testEmail=${encodeURIComponent(toEmail)}`)
    }

    return (
        <main>
            <h1 className="text-4xl font-bold">New Campaign</h1>
            <p className="mt-2 text-gray-600">
                Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{'{{company_name}}'}</code>{' '}
                and <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{'{{login_url}}'}</code> as placeholders —
                an unsubscribe link is appended automatically.
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

            <form action={sendNow} className="mt-6 max-w-2xl space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Segment</label>
                    <select
                        name="segment"
                        defaultValue="trial"
                        className="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                        {(Object.keys(SEGMENT_LABELS) as CampaignSegment[]).map((s) => (
                            <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                    <input
                        type="text"
                        name="subject"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
                    <textarea
                        name="body"
                        rows={10}
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

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Schedule for <span className="text-slate-400">(optional — leave blank to send immediately)</span>
                    </label>
                    <input
                        type="datetime-local"
                        name="scheduledAt"
                        className="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                        type="submit"
                        formAction={sendTest}
                        className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Send Test Email
                    </button>
                    <button
                        type="submit"
                        formAction={schedule}
                        className="rounded-xl border border-blue-600 bg-blue-50 px-6 py-3 font-semibold text-blue-700 hover:bg-blue-100"
                        title="Uses the 'Schedule for' time above"
                    >
                        Schedule
                    </button>
                    <button
                        type="submit"
                        className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
                    >
                        Send Now
                    </button>
                </div>
            </form>
        </main>
    )
}
