import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import CustomerQuote from '@/components/surveyor/quote/CustomerQuote'
import { mapCompanySettings, DEFAULT_SETTINGS, normalizeQuoteResult } from '@/lib/surveyor/types'
import type { SurveyData } from '@/lib/surveyor/types'

interface Props {
    params: Promise<{ id: string }>
}

export default async function CustomerQuotePage({ params }: Props) {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: record } = await supabase
        .from('surveyor_quotes')
        .select('*')
        .eq('id', id)
        .single()

    if (!record) notFound()

    // Fire-and-forget view tracking
    supabase
        .from('surveyor_quotes')
        .update({
            last_viewed_at: new Date().toISOString(),
            view_count: (record.view_count ?? 0) + 1,
        })
        .eq('id', id)
        .then(({ error }) => {
            if (error) console.error('View tracking failed:', error)
        })

    const { data: rawSettings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', record.company_id)
        .maybeSingle()

    // Older quotes were saved in the fixed {low,mid,high} shape — normalize so
    // links sent before flexible boiler options shipped still render.
    const quoteResult = normalizeQuoteResult(record.line_items)
    const survey: SurveyData = record.survey_data as SurveyData
    const settings = rawSettings ? mapCompanySettings(rawSettings) : DEFAULT_SETTINGS

    return (
        <CustomerQuote
            quoteId={id}
            quoteResult={quoteResult}
            survey={survey}
            createdAt={record.created_at}
            settings={settings}
        />
    )
}
