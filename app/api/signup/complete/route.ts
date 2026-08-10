import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

// The account whose boilers get copied into every new company on signup, so
// new users land with a working catalogue instead of an empty one. Currently
// the same id as SUPER_ADMIN_COMPANY_ID, but kept separate on purpose — these
// are two unrelated roles that happen to sit on one account today.
const TEMPLATE_COMPANY_ID = '6578dad8-9e8a-4189-abf7-d578bda4af47'

// Creates the company row and seeds its pricing and boilers for a user who has
// just signed up.
//
// This runs server-side on the service-role client because it cannot rely on
// the caller having a session: Supabase only returns one from signUp() when
// email confirmation is off, and with it on every one of these inserts used to
// fail as `anon` against the RLS policies — which silently broke signup for
// about three weeks in mid-2026.
//
// Unauthenticated by necessity (there is no session yet), so it is written to
// be safe without one:
//   - it only ever acts on a user id that already exists in auth
//   - it refuses if that user already has a company, making it idempotent and
//     safe to retry or to re-run as a backfill
//   - the company name, owner name and phone are read from the user's own auth
//     metadata, never from the request body, so a caller cannot set details on
//     an account that is not theirs
// The worst a bad actor can do is create the company row that the account was
// always going to get.
export async function POST(request: Request) {
    let userId: string

    try {
        ({ userId } = await request.json())
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!userId || typeof userId !== 'string') {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId)
    const user = userResult?.user

    if (userError || !user) {
        return NextResponse.json({ error: 'Unknown user' }, { status: 404 })
    }

    const { data: existing, error: existingError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_user_id', userId)
        .maybeSingle()

    if (existingError) {
        console.error('signup/complete: failed to check for existing company:', existingError.message)
        return NextResponse.json({ error: 'Failed to check existing company' }, { status: 500 })
    }

    // Already set up — treat as success so a retried signup doesn't error and
    // doesn't create a second company.
    if (existing) {
        return NextResponse.json({ companyId: existing.id, alreadyExisted: true })
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const companyName = typeof metadata.company_name === 'string' ? metadata.company_name.trim() : ''

    if (!companyName) {
        return NextResponse.json({ error: 'Account is missing a company name' }, { status: 400 })
    }

    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 14)

    // subscription_status and trial_ends_at are placeholders that keep new rows
    // shaped like existing ones — they say nothing about entitlement. Access is
    // granted by stripe_subscription_id, which stays null until a card is taken.
    const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
            company_name: companyName,
            owner_user_id: userId,
            subscription_status: 'trial',
            trial_ends_at: trialEndDate.toISOString(),
        })
        .select('id')
        .single()

    if (companyError || !company) {
        console.error('signup/complete: company insert failed:', companyError?.message)
        return NextResponse.json(
            { error: companyError?.message || 'Failed to create company' },
            { status: 500 }
        )
    }

    // Seeding is best-effort past this point: the account exists and can be
    // used, and an empty catalogue is recoverable from the admin panel, so a
    // failure here shouldn't fail the whole signup. Logged loudly instead.
    await seedPricing(supabase, company.id)
    await seedBoilers(supabase, company.id)

    return NextResponse.json({ companyId: company.id })
}

type AdminClient = ReturnType<typeof createAdminClient>

async function seedPricing(supabase: AdminClient, companyId: string) {
    const { data: defaults, error: readError } = await supabase
        .from('pricing')
        .select('name, value, key, category')
        .is('company_id', null)

    if (readError) {
        console.error('signup/complete: failed to read default pricing:', readError.message)
        return
    }
    if (!defaults?.length) return

    const { error } = await supabase
        .from('pricing')
        .insert(defaults.map((row) => ({ ...row, company_id: companyId })))

    if (error) {
        console.error('signup/complete: failed to seed pricing:', error.message)
    }
}

async function seedBoilers(supabase: AdminClient, companyId: string) {
    const { data: templates, error: readError } = await supabase
        .from('boilers')
        .select('name, tier, category, output, price, warranty, status, image')
        .eq('company_id', TEMPLATE_COMPANY_ID)

    if (readError) {
        console.error('signup/complete: failed to read template boilers:', readError.message)
        return
    }
    if (!templates?.length) return

    const { error } = await supabase
        .from('boilers')
        .insert(templates.map((boiler) => ({ ...boiler, company_id: companyId })))

    if (error) {
        console.error('signup/complete: failed to seed boilers:', error.message)
    }
}
