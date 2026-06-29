import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { IMPERSONATION_COOKIE, SUPER_ADMIN_COMPANY_ID } from '@/lib/superAdmin'

export async function getCurrentCompany() {
    console.log('GET CURRENT COMPANY CALLED')
    const supabaseAuth = await createClient()
    console.log('SUPABASE SERVER CLIENT CREATED')
    const {
        data: { user },
        error: userError,
    } = await supabaseAuth.auth.getUser()

    console.log('SERVER USER:', user)
    console.log('AUTH USER ID:', user?.id)
    console.log('SERVER USER ERROR:', userError)

    if (!user) {
        redirect('/login')
    }

    const { data: companies, error } = await supabaseAuth
        .from('companies')
        .select('*')
        .eq('owner_user_id', user.id)

    console.log('MATCHING COMPANIES:', companies)
    console.log('COMPANY ERROR:', error)

    if (error) {
        throw new Error(`Failed to load company: ${error.message}`)
    }

    if (!companies || companies.length === 0) {
        throw new Error('No company found for this user')
    }

    const realCompany = companies[0]
    const isSuperAdmin = realCompany.id === SUPER_ADMIN_COMPANY_ID

    // Records that this account is actively using the dashboard, so the
    // inactivity-email cron can tell who's gone quiet. Uses the admin client
    // (bypasses RLS) since this is internal bookkeeping, not user input —
    // swallow errors so a missing column/table never breaks the page itself.
    createAdminClient()
        .from('companies')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', realCompany.id)
        .then(({ error: lastSeenError }) => {
            if (lastSeenError) console.error('Failed to update last_seen_at:', lastSeenError)
        })

    // The super-admin account can "log in as" any company by setting a cookie.
    // The cookie is only ever honoured for the super-admin's own login — anyone
    // else's cookie value (however it got set) is ignored.
    let company = realCompany
    let impersonating = false

    if (isSuperAdmin) {
        const cookieStore = await cookies()
        const impersonateId = cookieStore.get(IMPERSONATION_COOKIE)?.value

        if (impersonateId && impersonateId !== realCompany.id) {
            const { data: impersonatedCompany } = await supabaseAuth
                .from('companies')
                .select('*')
                .eq('id', impersonateId)
                .single()

            if (impersonatedCompany) {
                company = impersonatedCompany
                impersonating = true
            }
        }
    }

    const { data: settings, error: settingsError } = await supabaseAuth
        .from('company_settings')
        .select('*')
        .eq('company_name', company.company_name)

    console.log('SETTINGS:', settings)
    console.log('SETTINGS ERROR:', settingsError)
    console.log('COMPANY NAME:', company.company_name)

    const settingsRecord = Array.isArray(settings)
        ? settings.find((s: any) => s.logo_url)
        : settings

    const logoUrl = settingsRecord?.logo_url || null

    return {
        ...company,
        logo_url: logoUrl || null,
        isSuperAdmin,
        isImpersonating: impersonating,
        realCompanyId: realCompany.id,
    }
}
