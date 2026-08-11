import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { normalizeQuoteResult } from '@/lib/surveyor/types'
import { sendQuoteEmail } from '@/lib/surveyor/quoteEmail'

/**
 * Email an already-saved quote to the customer.
 *
 * Previewing saves a DRAFT so the surveyor can open /q/<id> without the customer
 * hearing anything; this is the deliberate act that actually sends it. The
 * surveyor can still edit line items between the two, so an updated quoteResult
 * may be posted along with it — otherwise a preview-then-tweak-then-send would
 * email the customer the pre-tweak prices.
 *
 * Unauthenticated for the same reason as the create and accept routes: the
 * public /survey/[token] flow has no session, and the quote's uuid is the
 * capability.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        const { quoteResult } = await req.json().catch(() => ({ quoteResult: null }))

        const supabase = createAdminClient()

        const { data: quote, error } = await supabase
            .from('surveyor_quotes')
            .select('id, company_id, customer_name, customer_email, line_items')
            .eq('id', id)
            .maybeSingle()

        if (error || !quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
        }

        let lineItems = quote.line_items

        if (quoteResult?.options?.length) {
            const totals: number[] = quoteResult.options.map((o: { total: number }) => o.total)

            const { error: updateError } = await supabase
                .from('surveyor_quotes')
                .update({
                    line_items: quoteResult,
                    low_total: Math.min(...totals),
                    high_total: Math.max(...totals),
                    mid_total: totals[Math.floor((totals.length - 1) / 2)],
                })
                .eq('id', id)

            if (updateError) {
                console.error('Failed to update quote before sending:', updateError)
                return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
            }

            lineItems = quoteResult
        }

        // Unlike the create route, a failure here is the failure — the surveyor
        // pressed "Email to customer" and nothing else happened, so don't report
        // success.
        await sendQuoteEmail(supabase, {
            quoteId: id,
            companyId: quote.company_id,
            customerName: quote.customer_name,
            customerEmail: quote.customer_email,
            optionCount: normalizeQuoteResult(lineItems).options.length,
        })

        await supabase
            .from('surveyor_quotes')
            .update({ status: 'SENT', email_sent_at: new Date().toISOString() })
            .eq('id', id)

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('Failed to send quote', id, e)
        return NextResponse.json({ error: 'Failed to send quote to customer' }, { status: 500 })
    }
}
