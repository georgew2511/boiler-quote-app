import { NextRequest, NextResponse } from 'next/server'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import { createAdminClient } from '@/utils/supabase/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
    try {
        const company = await getCurrentCompany()
        if (company.memberRole === 'surveyor' || company.memberRole === 'viewer') {
            return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
        }

        const { memberId } = await params
        const { role } = await req.json()
        if (!['admin', 'surveyor', 'viewer'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const { error } = await supabase
            .from('company_members')
            .update({ role })
            .eq('id', memberId)
            .eq('company_id', company.id) // scope to own company

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
    try {
        const company = await getCurrentCompany()
        if (company.memberRole === 'surveyor' || company.memberRole === 'viewer') {
            return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
        }

        const { memberId } = await params
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('company_members')
            .delete()
            .eq('id', memberId)
            .eq('company_id', company.id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }
}
