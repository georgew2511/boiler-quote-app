import { NextRequest, NextResponse } from 'next/server'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createAdminClient } from '@/utils/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal.relode.io'

export async function POST(req: NextRequest) {
    try {
        const company = await getCurrentCompany()

        // Only owners and admins can invite
        if (company.memberRole === 'surveyor' || company.memberRole === 'viewer') {
            return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
        }

        const { email, role } = await req.json()
        if (!email || !role) return NextResponse.json({ error: 'email and role are required' }, { status: 400 })
        if (!['admin', 'surveyor', 'viewer'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Check for existing pending invite for this email
        const { data: existing } = await supabase
            .from('company_members')
            .select('id, accepted_at')
            .eq('company_id', company.id)
            .eq('invited_email', email.toLowerCase())
            .maybeSingle()

        if (existing?.accepted_at) {
            return NextResponse.json({ error: 'This person is already a team member' }, { status: 409 })
        }

        // Upsert — resend invite if already pending
        const { data: member, error } = await supabase
            .from('company_members')
            .upsert(
                {
                    company_id: company.id,
                    invited_email: email.toLowerCase(),
                    role,
                    invited_at: new Date().toISOString(),
                    accepted_at: null,
                    user_id: null,
                },
                { onConflict: 'company_id,invited_email', ignoreDuplicates: false }
            )
            .select('invite_token')
            .single()

        if (error || !member) {
            console.error('Invite insert error:', error)
            return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
        }

        const joinUrl = `${APP_URL}/join/${member.invite_token}`
        const companyName = company.company_name ?? 'your company'
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);margin:0 auto;">
    <tr><td style="background:#1e293b;padding:28px 36px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">You've been invited to join ${companyName}</h1>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">Role: ${roleLabel}</p>
    </td></tr>
    <tr><td style="padding:32px 36px;">
      <p style="font-size:15px;color:#374151;line-height:1.7;">
        You've been invited to access the ${companyName} portal on Relode. Click the button below to set up your account — it only takes a minute.
      </p>
      <div style="margin-top:28px;text-align:center;">
        <a href="${joinUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">
          Accept Invitation →
        </a>
      </div>
      <p style="margin-top:20px;font-size:12px;color:#9ca3af;text-align:center;">
        This link is unique to you. Don't share it.
      </p>
    </td></tr>
  </table>
</body></html>`

        try {
            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL ?? 'noreply@relode.io',
                to: email,
                subject: `You've been invited to join ${companyName} on Relode`,
                html,
            })
        } catch (emailErr) {
            console.error('Invite email failed:', emailErr)
            // Don't fail — invite row exists, they can resend
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
    }
}
