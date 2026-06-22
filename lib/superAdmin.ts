// The one account that's allowed to view and "log in as" any other company.
// Kept as a single constant (rather than a DB flag) to match the existing
// TEMPLATE_COMPANY_ID pattern used for signup seeding.
export const SUPER_ADMIN_COMPANY_ID = '6578dad8-9e8a-4189-abf7-d578bda4af47'

export const IMPERSONATION_COOKIE = 'impersonate_company_id'
