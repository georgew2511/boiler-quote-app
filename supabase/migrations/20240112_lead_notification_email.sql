-- Notification email sent to a company when a new lead lands in their app.
-- Subject/body are edited in the Super Admin area, matching the existing
-- inactivity-email settings that already live in this single-row table.
alter table system_settings add column if not exists lead_email_enabled boolean not null default true;
alter table system_settings add column if not exists lead_email_subject text;
alter table system_settings add column if not exists lead_email_body text;

-- Stamped once the notification for a lead has been sent. The send route is
-- callable from the public calculator (no auth — the person filling in the
-- form isn't logged in), so this doubles as the idempotency guard: a lead can
-- only ever trigger one email, no matter how many times the route is hit.
alter table leads add column if not exists notification_sent_at timestamptz;
