import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/utils/supabase/server'
import { getCurrentCompany } from '@/lib/getcurrentcompany'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const companyId = searchParams.get('company_id')

        if (!companyId) {
            return NextResponse.json(
                { error: 'company_id is required' },
                { status: 400 }
            )
        }

        // finance_disclosure and logo_size are added by later migrations; keep
        // them separate so we can gracefully drop them from the query if the
        // columns aren't there yet.
        const baseColumns = [
            'company_name', 'logo_url', 'primary_colour', 'secondary_colour',
            'phone_number', 'email_address', 'website', 'from_email', 'reply_to_email',
            'lead_notification_email', 'gtm_id', 'ga4_id', 'vat_registered',
            'finance_enabled', 'minimum_deposit', 'finance_deposit_percent',
            'finance_loan_terms', 'apr', 'zero_percent_term_1', 'zero_percent_term_2',
            'zero_percent_term_3', 'quote_validity_days', 'workmanship_warranty_months',
            'google_reviews_url', 'trustpilot_url',
        ]
        const optionalColumns = ['finance_disclosure', 'logo_size']

        let { data, error } = await supabase
            .from('company_settings')
            .select([...baseColumns, ...optionalColumns].join(', '))
            .eq('company_id', companyId)
            .maybeSingle()

        // 42703 = undefined_column. Retry dropping optional columns one at a
        // time so existing settings still load before every migration has
        // been applied.
        let remainingOptional = [...optionalColumns]
        while (error?.code === '42703' && remainingOptional.length > 0) {
            remainingOptional = remainingOptional.slice(0, -1)
            ;({ data, error } = await supabase
                .from('company_settings')
                .select([...baseColumns, ...remainingOptional].join(', '))
                .eq('company_id', companyId)
                .maybeSingle())
        }

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(data || {})
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to load company settings' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const company = await getCurrentCompany()
        const supabase = await createClient()

        const body = await request.json()
        console.log('Saving company settings:', body)

        // Ignore any company_id the client sends — always write to the
        // authenticated user's own company to prevent cross-tenant writes.
        const { company_id: _ignored, ...settingsData } = body
        const company_id = company.id

        const { data: existing, error: existingError } = await supabase
            .from('company_settings')
            .select('id')
            .eq('company_id', company_id)
            .maybeSingle()

        if (existingError) {
            return NextResponse.json({ error: existingError.message }, { status: 500 })
        }

        // finance_disclosure and logo_size are added by later migrations —
        // drop them one at a time on an undefined-column error so the rest of
        // the settings still persist before every migration has been applied.
        // 42703 = undefined_column (raw Postgres), PGRST204 = PostgREST's
        // "column not found in schema cache" — insert/update surface the
        // latter, select() surfaces the former. Check both.
        const optionalColumns = ['finance_disclosure', 'logo_size']
        let data = { ...settingsData }

        if (existing?.id) {
            let error
            do {
                ;({ error } = await supabase
                    .from('company_settings')
                    .update(data)
                    .eq('company_id', company_id))

                if (error?.code !== '42703' && error?.code !== 'PGRST204') break
                const droppable = optionalColumns.find((c) => c in data)
                if (!droppable) break
                const { [droppable]: _drop, ...rest } = data
                data = rest
            } while (error)

            if (error) {
                console.error('Company settings update error:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
        } else {
            let error
            do {
                ;({ error } = await supabase
                    .from('company_settings')
                    .insert([{ ...data, company_id }]))

                if (error?.code !== '42703' && error?.code !== 'PGRST204') break
                const droppable = optionalColumns.find((c) => c in data)
                if (!droppable) break
                const { [droppable]: _drop, ...rest } = data
                data = rest
            } while (error)

            if (error) {
                console.error('Company settings insert error:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Company settings save failed:', error)
        return NextResponse.json(
            { error: 'Failed to save company settings' },
            { status: 500 }
        )
    }
}