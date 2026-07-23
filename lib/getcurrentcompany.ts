import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { IMPERSONATION_COOKIE, SUPER_ADMIN_COMPANY_ID } from '@/lib/superAdmin'

export type MemberRole = 'owner' | 'admin' | 'surveyor' | 'viewer'

export async function getCurrentCompany() {
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
        redirect('/')
    }

    // Try owner first
    const { data: ownedCompanies } = await supabaseAuth
        .from('companies')
        .select('*')
        .eq('owner_user_id', user.id)

    let realCompany: any = ownedCompanies?.[0] ?? null
    let memberRole: MemberRole = 'owner'

    // If not an owner, check company_members
    if (!realCompany) {
        const adminClient = createAdminClient()
        const { data: membership } = await adminClient
            .from('company_members')
            .select('company_id, role, companies(*)')
            .eq('user_id', user.id)
            .not('accepted_at', 'is', null)
            .maybeSingle()

        if (!membership) {
            // No company and no membership — redirect to login
            redirect('/')
        }

        realCompany = membership.companies as any
        memberRole = membership.role as MemberRole
    }

    const isSuperAdmin = realCompany.id === SUPER_ADMIN_COMPANY_ID

    // Record activity (fire and forget)
    createAdminClient()
        .from('companies')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', realCompany.id)
        .then(({ error }) => { if (error) console.error('Failed to update last_seen_at:', error) })

    // Super-admin impersonation
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

    // Fetch logo from company_settings. logo_size is a newer column — fall
    // back to just logo_url if that migration hasn't been applied yet.
    const adminClient = createAdminClient()
    let { data: settings, error: settingsError } = await adminClient
        .from('company_settings')
        .select('logo_url, logo_size')
        .eq('company_id', company.id)
        .maybeSingle()

    if (settingsError?.code === '42703') {
        ({ data: settings } = await adminClient
            .from('company_settings')
            .select('logo_url')
            .eq('company_id', company.id)
            .maybeSingle())
    }

    return {
        ...company,
        logo_url: settings?.logo_url ?? null,
        logo_size: settings?.logo_size ?? 100,
        memberRole,
        isSuperAdmin,
        isImpersonating: impersonating,
        realCompanyId: realCompany.id,
    }
}
