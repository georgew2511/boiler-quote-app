import { redirect } from 'next/navigation'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import SuperAdminChrome from './SuperAdminChrome'

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const company = await getCurrentCompany()

    if (!company.isSuperAdmin) {
        redirect('/admin')
    }

    return (
        <SuperAdminChrome
            isImpersonating={company.isImpersonating}
            impersonatingName={company.isImpersonating ? company.company_name : null}
        >
            {children}
        </SuperAdminChrome>
    )
}
