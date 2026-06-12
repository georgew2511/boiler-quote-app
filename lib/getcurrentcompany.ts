import { supabase } from '@/lib/supabase'
import { createClient } from '@/utils/supabase/server'

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
        throw new Error(
            `User not authenticated. Supabase error: ${userError?.message || 'No session found'}`
        )
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

    const company = companies[0]

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
    }
}
