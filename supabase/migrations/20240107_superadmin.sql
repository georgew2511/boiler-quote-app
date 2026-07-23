-- ─────────────────────────────────────────────────────────────────────────────
-- Superadmin area: bug report persistence, marketing campaigns, unsubscribe
-- ─────────────────────────────────────────────────────────────────────────────
--
-- These tables are only ever read/written via createAdminClient() (service
-- role, bypasses RLS) from server-only code under app/superadmin/** that
-- already re-checks isSuperAdmin before touching that client. RLS is enabled
-- with no policies (default-deny), matching system_settings — this blocks
-- any accidental anon/session-client access while imposing no burden on the
-- admin-client path that bypasses RLS entirely.

create table if not exists bug_reports (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid references companies(id) on delete set null,
  company_name   text not null,
  reporter_email text not null,
  page_url       text,
  message        text not null,
  status         text not null default 'new' check (status in ('new', 'investigating', 'resolved')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table bug_reports enable row level security;

create table if not exists campaigns (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  body             text not null,
  segment          text not null check (segment in ('all', 'trial', 'active', 'past_due', 'cancelled')),
  status           text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  recipient_count  int not null default 0,
  sent_count       int not null default 0,
  created_at       timestamptz not null default now()
);
alter table campaigns enable row level security;

-- Per-company unsubscribe state. A flag (not a separate opt-out table)
-- since there's only ever one marketing audience per company, and a stable
-- unsubscribe_token gives every campaign email the same per-company link
-- without needing to mint a new token per send.
alter table companies add column if not exists marketing_unsubscribed boolean not null default false;
alter table companies add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

-- Per-send tracking so a campaign can't double-send to the same company and
-- so the campaigns list can show real sent/failed counts.
create table if not exists campaign_sends (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  company_id   uuid not null references companies(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error        text,
  sent_at      timestamptz,
  unique(campaign_id, company_id)
);
alter table campaign_sends enable row level security;
