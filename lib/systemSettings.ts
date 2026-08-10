import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { fillTemplate, textToHtml } from '@/lib/emailTemplate'

export const INACTIVITY_EMAIL_FROM = process.env.INACTIVITY_EMAIL_FROM || 'Relode <hello@relode.io>'
export const INACTIVITY_LOGIN_URL = 'https://portal.relode.io/login'

// New-lead notifications always come from the Relode domain (verified in
// Resend) rather than the company's own from_email — this is Relode telling
// the customer about their lead, not the company emailing a homeowner.
export const LEAD_EMAIL_FROM = process.env.LEAD_EMAIL_FROM || 'Relode <noreply@relode.io>'
export const LEAD_DASHBOARD_URL = 'https://portal.relode.io/admin/leads'

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
    return {
        subject: fillTemplate(settings.subject, vars),
        body: fillTemplate(settings.body, vars),
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
        html: textToHtml(body),
    })
}

export interface LeadEmailSettings {
    enabled: boolean
    subject: string
    body: string
}

export interface LeadEmailVars {
    company_name: string
    lead_name: string
    lead_email: string
    lead_phone: string
    lead_postcode: string
    lead_boiler: string
    lead_price: string
    dashboard_url: string
}

const DEFAULT_LEAD_EMAIL: LeadEmailSettings = {
    enabled: true,
    subject: 'New lead: {{lead_name}} ({{lead_postcode}})',
    body:
        'Hi {{company_name}},\n\n' +
        "You've got a new lead.\n\n" +
        'Name: {{lead_name}}\n' +
        'Email: {{lead_email}}\n' +
        'Phone: {{lead_phone}}\n' +
        'Postcode: {{lead_postcode}}\n' +
        'Boiler: {{lead_boiler}}\n' +
        'Quoted price: {{lead_price}}\n\n' +
        'View it here: {{dashboard_url}}\n\n' +
        'Cheers,\nThe Relode Team',
}

export async function getLeadEmailSettings(): Promise<LeadEmailSettings> {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient.from('system_settings').select('*').eq('id', 1).maybeSingle()

    if (error || !data) {
        return DEFAULT_LEAD_EMAIL
    }

    return {
        enabled: data.lead_email_enabled ?? DEFAULT_LEAD_EMAIL.enabled,
        subject: data.lead_email_subject || DEFAULT_LEAD_EMAIL.subject,
        body: data.lead_email_body || DEFAULT_LEAD_EMAIL.body,
    }
}

export async function saveLeadEmailSettings(settings: LeadEmailSettings) {
    const adminClient = createAdminClient()

    const { error } = await adminClient.from('system_settings').upsert({
        id: 1,
        lead_email_enabled: settings.enabled,
        lead_email_subject: settings.subject,
        lead_email_body: settings.body,
        updated_at: new Date().toISOString(),
    })

    if (error) {
        throw new Error(`Failed to save lead email settings: ${error.message}`)
    }
}

export function renderLeadEmail(settings: LeadEmailSettings, vars: LeadEmailVars) {
    return {
        subject: fillTemplate(settings.subject, vars as unknown as Record<string, string>),
        body: fillTemplate(settings.body, vars as unknown as Record<string, string>),
    }
}

// Shared by the /api/notify-lead route and the Super Admin "Send Test Email"
// button, so a test send is a faithful preview of the real thing.
export async function sendLeadEmail(to: string, settings: LeadEmailSettings, vars: LeadEmailVars) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, body } = renderLeadEmail(settings, vars)

    return resend.emails.send({
        from: LEAD_EMAIL_FROM,
        to,
        subject,
        html: textToHtml(body),
    })
}
