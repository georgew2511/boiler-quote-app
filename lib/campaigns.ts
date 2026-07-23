import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { fillTemplate, textToHtml } from '@/lib/emailTemplate'
import { getSegmentCompanies, CampaignSegment } from '@/lib/campaignSegments'

export const CAMPAIGN_EMAIL_FROM = process.env.RESEND_FROM_EMAIL || 'Relode <hello@relode.io>'
export const CAMPAIGN_LOGIN_URL = 'https://portal.relode.io/login'
const UNSUBSCRIBE_BASE_URL = 'https://portal.relode.io/api/unsubscribe'

// Shared by the "Send Now" server action and the scheduled-send cron, so a
// campaign sends the exact same way regardless of when it's triggered.
export async function executeCampaignSend(campaignId: string) {
    const adminClient = createAdminClient()

    const { data: campaign, error: campaignError } = await adminClient
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

    if (campaignError || !campaign) {
        throw new Error(`Campaign not found: ${campaignError?.message}`)
    }

    const recipients = await getSegmentCompanies(campaign.segment as CampaignSegment)

    if (recipients.length > 0) {
        await adminClient
            .from('campaign_sends')
            .upsert(
                recipients.map((c) => ({ campaign_id: campaignId, company_id: c.id })),
                { onConflict: 'campaign_id,company_id', ignoreDuplicates: true }
            )
    }

    await adminClient
        .from('campaigns')
        .update({ status: 'sending', recipient_count: recipients.length })
        .eq('id', campaignId)

    let sentCount = 0

    for (const company of recipients) {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(company.owner_user_id)
        const ownerEmail = userData?.user?.email

        if (userError || !ownerEmail) {
            await adminClient
                .from('campaign_sends')
                .update({ status: 'failed', error: userError?.message || 'No owner email found' })
                .eq('campaign_id', campaignId)
                .eq('company_id', company.id)
            continue
        }

        const unsubscribeUrl = `${UNSUBSCRIBE_BASE_URL}/${company.unsubscribe_token}`
        const vars = { company_name: company.company_name, login_url: CAMPAIGN_LOGIN_URL }
        const subject = fillTemplate(campaign.subject, vars)
        const body = fillTemplate(campaign.body, vars)
        const html =
            textToHtml(body) +
            `<p style="margin-top:24px;font-size:12px;color:#94a3b8;">You're receiving this because you have a Relode account. ` +
            `<a href="${unsubscribeUrl}" style="color:#94a3b8;">Unsubscribe</a></p>`

        const resend = new Resend(process.env.RESEND_API_KEY)
        const { error: sendError } = await resend.emails.send({
            from: CAMPAIGN_EMAIL_FROM,
            to: ownerEmail,
            subject,
            html,
        })

        if (sendError) {
            await adminClient
                .from('campaign_sends')
                .update({ status: 'failed', error: sendError.message })
                .eq('campaign_id', campaignId)
                .eq('company_id', company.id)
            continue
        }

        await adminClient
            .from('campaign_sends')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('campaign_id', campaignId)
            .eq('company_id', company.id)

        sentCount += 1
    }

    await adminClient
        .from('campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: sentCount })
        .eq('id', campaignId)

    return { recipientCount: recipients.length, sentCount }
}

// Sends the draft content to a single address without touching any DB rows
// — used for the "Send Test Email" preview button.
export async function sendTestCampaignEmail(
    to: string,
    campaign: { subject: string; body: string },
    companyName: string
) {
    const vars = { company_name: companyName, login_url: CAMPAIGN_LOGIN_URL }
    const subject = fillTemplate(campaign.subject, vars)
    const body = fillTemplate(campaign.body, vars)
    const html =
        textToHtml(body) +
        `<p style="margin-top:24px;font-size:12px;color:#94a3b8;">You're receiving this because you have a Relode account. ` +
        `<a href="#" style="color:#94a3b8;">Unsubscribe</a> (link is inert in test sends)</p>`

    const resend = new Resend(process.env.RESEND_API_KEY)
    return resend.emails.send({ from: CAMPAIGN_EMAIL_FROM, to, subject, html })
}
