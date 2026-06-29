import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'

export const INACTIVITY_EMAIL_FROM = process.env.INACTIVITY_EMAIL_FROM || 'Relode <hello@relode.io>'
export const INACTIVITY_LOGIN_URL = 'https://portal.relode.io/login'

export interface InactivityEmailSettings {
    enabled: boolean
    daysInactive: number
    subject: string
    body: string
}

const DEFAULT_SETTINGS: InactivityEmailSettings = {
    enabled: true,
    daysInactive: 3,
    subject: "We've missed you, {{company_name}}",
    body:
        "Hi {{company_name}},\n\n" +
        "You haven't logged into your Relode dashboard in a few days — just checking in to make sure everything's running smoothly.\n\n" +
        "Log back in here: {{login_url}}\n\n" +
        "Cheers,\nThe Relode Team",
}

// Settings live in a single-row table (id = 1) managed entirely through the
// Super Admin page. The admin client bypasses RLS, which is fine here since
// every write path re-checks isSuperAdmin server-side before calling this.
export async function getInactivityEmailSettings(): Promise<InactivityEmailSettings> {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

    if (error || !data) {
        return DEFAULT_SETTINGS
    }

    return {
        enabled: data.inactivity_email_enabled ?? DEFAULT_SETTINGS.enabled,
        daysInactive: data.inactivity_days ?? DEFAULT_SETTINGS.daysInactive,
        subject: data.inactivity_email_subject || DEFAULT_SETTINGS.subject,
        body: data.inactivity_email_body || DEFAULT_SETTINGS.body,
    }
}

export async function saveInactivityEmailSettings(settings: InactivityEmailSettings) {
    const adminClient = createAdminClient()

    const { error } = await adminClient
        .from('system_settings')
        .upsert({
            id: 1,
            inactivity_email_enabled: settings.enabled,
            inactivity_days: settings.daysInactive,
            inactivity_email_subject: settings.subject,
            inactivity_email_body: settings.body,
            updated_at: new Date().toISOString(),
        })

    if (error) {
        throw new Error(`Failed to save inactivity email settings: ${error.message}`)
    }
}

export function renderInactivityEmail(
    settings: InactivityEmailSettings,
    vars: { company_name: string; login_url: string }
) {
    const fill = (template: string) =>
        template
            .replaceAll('{{company_name}}', vars.company_name)
            .replaceAll('{{login_url}}', vars.login_url)

    return {
        subject: fill(settings.subject),
        body: fill(settings.body),
    }
}

// Shared by the daily cron job and the Super Admin "Send Test Email" button,
// so a test send is a faithful preview of exactly what the real thing does.
export async function sendInactivityEmail(
    to: string,
    settings: InactivityEmailSettings,
    vars: { company_name: string; login_url: string }
) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, body } = renderInactivityEmail(settings, vars)

    return resend.emails.send({
        from: INACTIVITY_EMAIL_FROM,
        to,
        subject,
        // Plain text body with line breaks preserved — keeps this simple
        // and easy to edit from the admin area without an HTML editor.
        html: body.split('\n').map((line) => `<p style="margin:0 0 12px 0;">${line || '&nbsp;'}</p>`).join(''),
    })
}
