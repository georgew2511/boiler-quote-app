import { redirect } from 'next/navigation'

// Moved to /superadmin/companies as part of the dedicated superadmin area.
// This redirect keeps any bookmarked links to the old URL working.
export default function CompaniesRedirect() {
    redirect('/superadmin/companies')
}
