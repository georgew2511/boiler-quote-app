// The one account that's allowed to view and "log in as" any other company.
// Kept as a single constant (rather than a DB flag) to match the existing
// TEMPLATE_COMPANY_ID pattern used for signup seeding.
export const SUPER_ADMIN_COMPANY_ID = '6578dad8-9e8a-4189-abf7-d578bda4af47'

export const IMPERSONATION_COOKIE = 'impersonate_company_id'

// The one auth user (demo@relode.io) allowed to add brand-new surveyor
// pricing items/sections — additions get rolled out to every company's
// pricing and quote calculator. Every other member can still edit prices
// for their own company as before.
export const PLATFORM_ADMIN_USER_ID = '745aaeae-fbb3-4bf1-8e83-eddd8cb9ebe3'
