import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getAuthedCompanyId } from '@/lib/authedCompany'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const companyId = await getAuthedCompanyId()
    if (!companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { active } = await req.json().catch(() => ({}))
    if (typeof active !== 'boolean') {
        return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('surveyors')
        .update({ active })
        .eq('id', id)
        .eq('company_id', companyId)
        .select('id')
        .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Surveyor not found' }, { status: 404 })
    return NextResponse.json({ success: true })
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const companyId = await getAuthedCompanyId()
    if (!companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('surveyors')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
        .select('id')
        .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Surveyor not found' }, { status: 404 })
    return NextResponse.json({ success: true })
}
