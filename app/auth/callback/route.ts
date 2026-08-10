import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Where the email-confirmation link lands. Without this route the link had
// nothing to exchange its code with: @supabase/ssr's browser client uses the
// PKCE flow, so Supabase redirects back with a ?code= (or a ?token_hash=,
// depending on the email template) that something server-side has to turn into
// a session. Previously it redirected to whatever Site URL was configured and
// no route handled either parameter.
//
// Both parameter styles are accepted so this keeps working whichever template
// the project is using.
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)

    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    // Supabase puts its own failures in the query string before we ever get a
    // chance to exchange anything — an expired or already-used link arrives as
    // error_code=otp_expired.
    const errorCode = searchParams.get('error_code')
    if (errorCode) {
        return NextResponse.redirect(`${origin}/auth/link-expired?reason=${encodeURIComponent(errorCode)}`)
    }

    const supabase = await createClient()

    // If they're already signed in, whatever the link did or didn't do is
    // moot — send them on rather than to an error page.
    const { data: { user: existingUser } } = await supabase.auth.getUser()
    if (existingUser) {
        return NextResponse.redirect(`${origin}/admin`)
    }

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${origin}/admin`)
        }
        console.error('auth/callback: code exchange failed:', error.message)
        return NextResponse.redirect(`${origin}/auth/link-expired?reason=exchange_failed`)
    }

    if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
            type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'email_change',
            token_hash: tokenHash,
        })
        if (!error) {
            return NextResponse.redirect(`${origin}/admin`)
        }
        console.error('auth/callback: verifyOtp failed:', error.message)
        return NextResponse.redirect(`${origin}/auth/link-expired?reason=${encodeURIComponent(error.code || 'verify_failed')}`)
    }

    return NextResponse.redirect(`${origin}/auth/link-expired?reason=missing_token`)
}
