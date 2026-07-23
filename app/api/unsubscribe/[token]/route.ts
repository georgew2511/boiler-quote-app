import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Public, unauthenticated — reached by clicking the unsubscribe link in a
// campaign email. Flips marketing_unsubscribed so future campaign sends
// skip this company (see lib/campaignSegments.ts).
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params
    const adminClient = createAdminClient()

    const { data: company, error } = await adminClient
        .from('companies')
        .update({ marketing_unsubscribed: true })
        .eq('unsubscribe_token', token)
        .select('company_name')
        .maybeSingle()

    if (error || !company) {
        return new NextResponse(page('This unsubscribe link is invalid or has expired.'), {
            status: 404,
            headers: { 'Content-Type': 'text/html' },
        })
    }

    return new NextResponse(page(`You've been unsubscribed from Relode marketing emails.`), {
        headers: { 'Content-Type': 'text/html' },
    })
}

function page(message: string) {
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f7fb;">
  <div style="max-width: 420px; text-align: center; padding: 32px;">
    <p style="font-size: 16px; color: #1e293b;">${message}</p>
  </div>
</body></html>`
}
