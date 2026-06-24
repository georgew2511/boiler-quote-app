import { createClient } from '@supabase/supabase-js'

// Service-role client that bypasses RLS. Server-side only — never import
// this into client components or expose the key to the browser.
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}
