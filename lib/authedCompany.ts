import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { IMPERSONATION_COOKIE, SUPER_ADMIN_COMPANY_ID } from '@/lib/superAdmin'

// Resolves the company an API request should be scoped to. Mirrors
// getCurrentCompany() (lib/getcurrentcompany.ts) — including super-admin
// impersonation — but returns null instead of redirecting on missing auth,
// since this is consumed by fetch() rather than a page navigation, where a
// 307 redirect body would break the caller silently.
export async function getAuthedCompanyId(): Promise<string | null> {
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return null

    const { data: ownedCompany } = await supabaseAuth
        .from('companies')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle()

    let realCompanyId = ownedCompany?.id ?? null

    if (!realCompanyId) {
        const adminClient = createAdminClient()
        const { data: membership } = await adminClient
            .from('company_members')
            .select('company_id')
            .eq('user_id', user.id)
            .not('accepted_at', 'is', null)
            .maybeSingle()

        realCompanyId = membership?.company_id ?? null
    }

    if (!realCompanyId) return null

    // Super-admin impersonation: same rule as getCurrentCompany().
    if (realCompanyId === SUPER_ADMIN_COMPANY_ID) {
        const cookieStore = await cookies()
        const impersonateId = cookieStore.get(IMPERSONATION_COOKIE)?.value
        if (impersonateId && impersonateId !== realCompanyId) {
            return impersonateId
        }
    }

    return realCompanyId
}
