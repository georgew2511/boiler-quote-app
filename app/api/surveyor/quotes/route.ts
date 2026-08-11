import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { normalizeQuoteResult } from '@/lib/surveyor/types'
import { getAuthedCompanyId } from '@/lib/authedCompany'
import { syncLeadForQuote } from '@/lib/surveyor/leadSync'
import { sendQuoteEmail } from '@/lib/surveyor/quoteEmail'

export async function POST(req: NextRequest) {
    try {
        const { survey, quoteResult, companyId, surveyorId, surveyorName, leadId, send } = await req.json()

        // Saving and emailing are separate acts. Previewing a quote saves it so
        // the surveyor can open /q/<id>, but the customer must not hear about it
        // until the surveyor presses "Email to customer" — opt in explicitly.
        const shouldSend = send === true

        const supabase = createAdminClient()

        // companyId here comes from the public /survey/[token] flow, where it was
        // already resolved server-side from the surveyor's token (see
        // app/survey/[token]/page.tsx) — that page has no logged-in session, so we
        // can't require auth here. Cross-check the surveyor actually belongs to the
        // claimed company so a tampered client can't inject quotes into another company.
        if (surveyorId) {
            const { data: surveyorRow } = await supabase
                .from('surveyors')
                .select('company_id')
                .eq('id', surveyorId)
                .maybeSingle()

            if (!surveyorRow || surveyorRow.company_id !== companyId) {
                return NextResponse.json({ error: 'Invalid surveyor for company' }, { status: 403 })
            }
        }

        const totals: number[] = quoteResult.options.map((o: { total: number }) => o.total)

        const { data: quote, error } = await supabase
            .from('surveyor_quotes')
            .insert({
                company_id: companyId,
                customer_name: survey.customerName,
                customer_email: survey.customerEmail,
                customer_phone: survey.customerPhone,
                postcode: survey.postcode,
                survey_data: survey,
                line_items: quoteResult,
                // Legacy columns from the fixed 3-tier model — kept populated
                // (using min/max across however many options were chosen) so
                // older admin views and reports that read them don't break.
                low_total: Math.min(...totals),
                high_total: Math.max(...totals),
                mid_total: totals[Math.floor((totals.length - 1) / 2)],
                status: shouldSend ? 'SENT' : 'DRAFT',
                email_sent_at: shouldSend ? new Date().toISOString() : null,
                notes: survey.specialNotes ?? '',
                surveyor_id: surveyorId ?? null,
                surveyor_name: surveyorName ?? null,
            })
            .select('id')
            .single()

        if (error) {
            console.error('Failed to create surveyor quote:', error)
            return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
        }

        const quoteId = quote.id

        // Push the CRM forward: the survey has been done and priced, so the lead
        // belongs in "Survey Complete" — true whether or not the surveyor has
        // emailed it yet. Best-effort by design: the quote is already saved, and
        // a pipeline hiccup must never cost the surveyor the work they just did
        // on a doorstep.
        try {
            await syncLeadForQuote(supabase, {
                companyId,
                quoteId,
                leadId: Number.isInteger(leadId) ? leadId : null,
                identity: {
                    name: survey.customerName,
                    email: survey.customerEmail,
                    phone: survey.customerPhone,
                    postcode: survey.postcode,
                },
                targetStage: 'Survey Complete',
                // Highest option quoted, so the card carries a value even
                // before the customer picks one.
                extra: { quote_price: Math.max(...totals) },
            })
        } catch (leadError) {
            console.error('Lead pipeline sync failed for quote', quoteId, leadError)
        }

        if (shouldSend) {
            try {
                await sendQuoteEmail(supabase, {
                    quoteId,
                    companyId,
                    customerName: survey.customerName,
                    customerEmail: survey.customerEmail,
                    optionCount: quoteResult.options.length,
                })
            } catch (emailError) {
                console.error('Email send failed:', emailError)
                // Don't fail the whole request — quote was saved
            }
        }

        return NextResponse.json({ id: quoteId })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        const companyId = await getAuthedCompanyId()
        if (!companyId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('surveyor_quotes')
            .select('id, created_at, customer_name, customer_email, customer_phone, postcode, low_total, high_total, line_items, status, email_sent_at, accepted_tier, accepted_at, last_viewed_at, view_count, notes, surveyor_id, surveyor_name')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Derive the option count from line_items rather than trusting a fixed
        // column — older quotes are still in the {low,mid,high} shape.
        const withOptionCounts = (data ?? []).map((row: any) => {
            const { line_items, ...rest } = row
            const optionCount = normalizeQuoteResult(line_items).options.length
            return { ...rest, option_count: optionCount }
        })

        return NextResponse.json(withOptionCounts)
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }
}
