import type { createAdminClient } from '@/utils/supabase/admin'
import { shouldAdvanceStage } from '@/lib/pipelineStages'

type AdminClient = ReturnType<typeof createAdminClient>

// Postgres "column does not exist". The surveyor_quotes.lead_id column arrives
// in 20240114_surveyor_quote_lead_link.sql, and migrations here are applied by
// hand — so tolerate its absence rather than failing a quote over it.
const UNDEFINED_COLUMN = '42703'

export interface SurveyIdentity {
    name: string
    email: string
    phone: string
    postcode: string
}

export interface MatchedLead {
    id: number
    pipeline_stage: string | null
}

// Phone numbers are typed by hand at both ends — "07700 900 000", "+447700900000",
// "07700900000" are all the same customer. Compare the last 9 digits, which
// survives the leading 0 / +44 difference on UK numbers.
function phoneKey(phone: string | null | undefined): string {
    const digits = String(phone ?? '').replace(/\D/g, '')
    return digits.length >= 9 ? digits.slice(-9) : ''
}

// Most recent leads first, and capped: this is a fallback scan for companies
// whose customer typed a different email at the survey than on the website, not
// a search feature. A sole trader's pipeline is well under this.
const PHONE_SCAN_LIMIT = 500

/**
 * Work out which CRM lead a surveyor quote belongs to.
 *
 * Preference order, most to least trustworthy:
 *   1. An explicit lead_id — the surveyor opened the wizard from the lead card.
 *   2. Email match within the company.
 *   3. Phone match within the company (digits only, see phoneKey).
 *
 * Returns null when the survey is for someone who was never in the CRM — a
 * doorstep job, or a lead that only ever existed on paper.
 */
export async function resolveLeadForQuote(
    supabase: AdminClient,
    companyId: string,
    leadId: number | null,
    identity: SurveyIdentity
): Promise<MatchedLead | null> {
    if (leadId) {
        // Scoped by company_id as well as id: this value arrives from the
        // public /survey/[token] page, so it must never reach across companies.
        const { data } = await supabase
            .from('leads')
            .select('id, pipeline_stage')
            .eq('id', leadId)
            .eq('company_id', companyId)
            .maybeSingle()

        if (data) return data as MatchedLead
    }

    const email = identity.email?.trim()
    if (email) {
        const { data } = await supabase
            .from('leads')
            .select('id, pipeline_stage')
            .eq('company_id', companyId)
            .ilike('email', email)
            .order('created_at', { ascending: false })
            .limit(1)

        if (data?.[0]) return data[0] as MatchedLead
    }

    const key = phoneKey(identity.phone)
    if (key) {
        const { data } = await supabase
            .from('leads')
            .select('id, pipeline_stage, phone')
            .eq('company_id', companyId)
            .not('phone', 'is', null)
            .order('created_at', { ascending: false })
            .limit(PHONE_SCAN_LIMIT)

        const match = (data ?? []).find((l: any) => phoneKey(l.phone) === key)
        if (match) return { id: match.id, pipeline_stage: match.pipeline_stage }
    }

    return null
}

export interface SurveyLeadPrefill {
    leadId: number
    customerName: string
    customerEmail: string
    customerPhone: string
    postcode: string
}

/**
 * Load the lead behind a `?lead_id=` survey launch, for prefilling the wizard's
 * customer step. Always scoped to `companyId` — the public /survey/[token] page
 * has no session, so the company comes from the surveyor's token and a lead id
 * outside it must resolve to nothing rather than leak customer details.
 *
 * Returns null for a missing, malformed or out-of-company id; the surveyor then
 * just fills the customer step in by hand, as before.
 */
export async function loadSurveyLead(
    supabase: AdminClient,
    companyId: string,
    leadIdParam: string | null | undefined
): Promise<SurveyLeadPrefill | null> {
    const leadId = Number(leadIdParam)
    if (!leadIdParam || !Number.isInteger(leadId) || leadId <= 0) return null

    const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, postcode')
        .eq('id', leadId)
        .eq('company_id', companyId)
        .maybeSingle()

    if (error) {
        console.error('Failed to load lead for survey prefill:', error.message)
        return null
    }

    if (!data) return null

    return {
        leadId: data.id,
        customerName: data.name ?? '',
        customerEmail: data.email ?? '',
        customerPhone: data.phone ?? '',
        postcode: data.postcode ?? '',
    }
}

/**
 * Move a lead to `targetStage`, but only if that's forward progress.
 * `extra` columns (boiler name, quote value) are written either way — those
 * are facts about the quote, not a claim about where the job has got to.
 */
export async function advanceLeadStage(
    supabase: AdminClient,
    companyId: string,
    lead: MatchedLead,
    targetStage: string,
    extra: Record<string, any> = {}
): Promise<void> {
    const update: Record<string, any> = {
        ...extra,
        last_updated: new Date().toISOString(),
    }

    // pipeline_stage only — `status` is left alone deliberately. It carries
    // non-stage markers ('Test' for preview leads, 'Photos Uploaded'), and
    // overwriting it would strip the Test badge off a preview lead.
    if (shouldAdvanceStage(lead.pipeline_stage, targetStage)) {
        update.pipeline_stage = targetStage
    }

    const { error } = await supabase
        .from('leads')
        .update(update)
        .eq('id', lead.id)
        .eq('company_id', companyId)

    if (error) throw new Error(`Failed to advance lead ${lead.id}: ${error.message}`)
}

/**
 * Create a lead for a survey that had no CRM record behind it, landing it
 * straight into `stage` so doorstep and phone-booked jobs still show up on the
 * pipeline instead of living only in the quotes list.
 */
export async function createLeadFromSurvey(
    supabase: AdminClient,
    companyId: string,
    identity: SurveyIdentity,
    stage: string
): Promise<MatchedLead | null> {
    const { data, error } = await supabase
        .from('leads')
        .insert({
            company_id: companyId,
            name: identity.name,
            email: identity.email,
            phone: identity.phone,
            postcode: identity.postcode,
            status: stage,
            pipeline_stage: stage,
            source: 'Surveyor Tool',
            last_updated: new Date().toISOString(),
        })
        .select('id, pipeline_stage')
        .single()

    if (error) throw new Error(`Failed to create lead from survey: ${error.message}`)

    return data as MatchedLead
}

async function linkQuoteToLead(
    supabase: AdminClient,
    quoteId: string,
    leadId: number
): Promise<void> {
    const { error } = await supabase
        .from('surveyor_quotes')
        .update({ lead_id: leadId })
        .eq('id', quoteId)

    if (error && error.code !== UNDEFINED_COLUMN) {
        throw new Error(`Failed to link quote ${quoteId} to lead ${leadId}: ${error.message}`)
    }

    if (error?.code === UNDEFINED_COLUMN) {
        console.warn('surveyor_quotes.lead_id missing — run migration 20240114_surveyor_quote_lead_link.sql')
    }
}

/**
 * Point of entry for the quote-created path: find or create the lead, link the
 * quote to it, and move it to `targetStage`.
 *
 * Callers should treat this as best-effort — a CRM sync failing must not lose
 * the surveyor their quote, which has already been saved and emailed by then.
 */
export async function syncLeadForQuote(
    supabase: AdminClient,
    opts: {
        companyId: string
        quoteId: string
        leadId: number | null
        identity: SurveyIdentity
        targetStage: string
        extra?: Record<string, any>
    }
): Promise<number | null> {
    const { companyId, quoteId, leadId, identity, targetStage, extra } = opts

    let lead = await resolveLeadForQuote(supabase, companyId, leadId, identity)

    if (!lead) {
        lead = await createLeadFromSurvey(supabase, companyId, identity, targetStage)
        if (!lead) return null
        await linkQuoteToLead(supabase, quoteId, lead.id)
        // Freshly created at targetStage — nothing to advance, but still record
        // any quote details the caller passed.
        if (extra && Object.keys(extra).length > 0) {
            await advanceLeadStage(supabase, companyId, lead, targetStage, extra)
        }
        return lead.id
    }

    await linkQuoteToLead(supabase, quoteId, lead.id)
    await advanceLeadStage(supabase, companyId, lead, targetStage, extra)

    return lead.id
}
