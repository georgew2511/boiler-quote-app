import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthedCompanyId } from '@/lib/authedCompany'
import { createAdminClient } from '@/utils/supabase/admin'
import { fileKind, ImportError, readSupplierQuote, type ImportBoiler } from '@/lib/supplierImport'

// Reading a long PDF price list can take a minute or two.
export const maxDuration = 300

// Vercel rejects request bodies over 4.5MB before they reach this handler;
// the import page shrinks photos client-side to stay under this.
const MAX_BYTES = 4 * 1024 * 1024

export async function POST(request: NextRequest) {
    const companyId = await getAuthedCompanyId()
    if (!companyId) {
        return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: 'Choose a file to upload' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'That file is over 4MB. Try a smaller export or split it up.' }, { status: 400 })
    }
    if (!fileKind(file)) {
        return NextResponse.json({ error: 'Upload a PDF, photo, CSV or Excel (.xlsx) file' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const [{ data: boilers, error: boilersError }, { data: aliasRows }] = await Promise.all([
        supabase
            .from('boilers')
            .select('id, name, manufacturer, output, category, price, markup_percent')
            .eq('company_id', companyId),
        supabase
            .from('boiler_supplier_aliases')
            .select('match_key, boiler_id')
            .eq('company_id', companyId),
    ])

    if (boilersError) {
        console.error('import-quote: failed to load boilers:', boilersError.message)
        return NextResponse.json({ error: 'Failed to load your boilers' }, { status: 500 })
    }
    if (!boilers?.length) {
        return NextResponse.json({ error: 'Add some boilers to your catalogue before importing prices' }, { status: 400 })
    }

    const aliases = new Map<string, number>((aliasRows ?? []).map((a) => [a.match_key, Number(a.boiler_id)]))

    try {
        const lines = await readSupplierQuote(file, boilers as ImportBoiler[], aliases)
        return NextResponse.json({ lines })
    } catch (err) {
        if (err instanceof ImportError) {
            return NextResponse.json({ error: err.message }, { status: 422 })
        }
        if (err instanceof Anthropic.RateLimitError) {
            return NextResponse.json({ error: 'Too many imports at once. Try again in a minute.' }, { status: 429 })
        }
        if (err instanceof Anthropic.APIError) {
            console.error(`import-quote: Anthropic API error ${err.status}:`, err.message)
            return NextResponse.json({ error: 'The quote reader is unavailable right now. Try again shortly.' }, { status: 502 })
        }
        console.error('import-quote: unexpected error:', err)
        return NextResponse.json({ error: 'Something went wrong reading that file' }, { status: 500 })
    }
}
