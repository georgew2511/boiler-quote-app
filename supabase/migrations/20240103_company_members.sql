-- ─────────────────────────────────────────────────────────────────────────────
-- Company members (staff accounts per company with roles)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists company_members (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,  -- null until accepted
  role          text not null default 'viewer'
                  check (role in ('owner', 'admin', 'surveyor', 'viewer')),
  invited_email text not null,
  invite_token  text unique not null default encode(gen_random_bytes(24), 'hex'),
  invited_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  unique(company_id, user_id)
);

alter table company_members enable row level security;

-- Owner can manage their company's members
create policy "Company owners can manage members"
  on company_members for all
  using (
    company_id = (
      select id from companies where owner_user_id = auth.uid() limit 1
    )
  );

-- Members can read their own membership row
create policy "Members can read own membership"
  on company_members for select
  using (user_id = auth.uid());

-- Anyone can read a pending invite by token (for the /join page)
create policy "Anyone can read pending invite by token"
  on company_members for select
  using (accepted_at is null);


-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: returns the company_id for the currently authenticated user,
-- whether they are the owner or an accepted member.
-- All RLS policies should use this instead of checking owner_user_id directly.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function get_my_company_id()
returns uuid language sql stable security definer as $$
  select coalesce(
    -- Owner path
    (select id from companies where owner_user_id = auth.uid() limit 1),
    -- Member path (accepted invites only)
    (select company_id from company_members
     where user_id = auth.uid() and accepted_at is not null limit 1)
  )
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Update surveyor table RLS policies to use get_my_company_id()
-- (tables we created in earlier migrations)
-- ─────────────────────────────────────────────────────────────────────────────

-- surveyor_pricing_items
drop policy if exists "Company members can manage their own pricing items" on surveyor_pricing_items;
create policy "Company members can manage their own pricing items"
  on surveyor_pricing_items for all
  using (company_id = get_my_company_id());

-- surveyor_quotes (keep the anon read policy)
drop policy if exists "Company members can manage their own surveyor quotes" on surveyor_quotes;
create policy "Company members can manage their own surveyor quotes"
  on surveyor_quotes for all
  using (company_id = get_my_company_id());

-- surveyors
drop policy if exists "Company members can manage their own surveyors" on surveyors;
create policy "Company members can manage their own surveyors"
  on surveyors for all
  using (company_id = get_my_company_id());


-- ─────────────────────────────────────────────────────────────────────────────
-- The following tables were created via the Supabase dashboard, not via
-- migrations. Run the DROP/CREATE blocks below in the SQL editor to update
-- their policies so that company members can access them.
--
-- leads, boilers, pricing_items, company_settings
-- ─────────────────────────────────────────────────────────────────────────────
-- (These are provided as comments; run them manually after confirming the
--  exact existing policy names in your Supabase dashboard)

-- EXAMPLE — adapt policy names to match what exists in your project:
--
-- drop policy if exists "Users can manage their company leads" on leads;
-- create policy "Users can manage their company leads" on leads
--   for all using (company_id = get_my_company_id());
--
-- drop policy if exists "Users can manage their company boilers" on boilers;
-- create policy "Users can manage their company boilers" on boilers
--   for all using (company_id = get_my_company_id());
--
-- drop policy if exists "Users can manage their company settings" on company_settings;
-- create policy "Users can manage their company settings" on company_settings
--   for all using (company_id = get_my_company_id());
