-- Master catalogue of surveyor pricing items added by the platform admin
-- (demo@relode.io, see lib/superAdmin.ts PLATFORM_ADMIN_USER_ID). Every row
-- here gets rolled out as a per-company row in surveyor_pricing_items so it
-- shows up in every company's pricing editor and quote calculator, while
-- each company keeps its own editable price for it. This table is also
-- read by app/api/surveyor/pricing/route.ts so new signups and "restore
-- missing defaults" pick up admin-added items alongside the hardcoded
-- DEFAULT_PRICING list.
create table if not exists surveyor_pricing_master_items (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  name        text not null,
  key         text not null unique,
  price       numeric(10,2) not null default 0,
  unit        text not null default 'each',
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

alter table surveyor_pricing_master_items enable row level security;

-- Every authenticated user can read the catalogue (app reads it to seed
-- pricing for all companies), but only the platform admin can write to it.
-- The app itself uses the service-role client and enforces the same check
-- in code (see app/admin/surveyor-pricing/page.tsx), so this is defense in
-- depth rather than the sole enforcement point.
create policy "Authenticated users can read master pricing items"
  on surveyor_pricing_master_items for select
  to authenticated
  using (true);

create policy "Only platform admin can insert master pricing items"
  on surveyor_pricing_master_items for insert
  to authenticated
  with check (auth.uid() = '745aaeae-fbb3-4bf1-8e83-eddd8cb9ebe3');

create policy "Only platform admin can update master pricing items"
  on surveyor_pricing_master_items for update
  to authenticated
  using (auth.uid() = '745aaeae-fbb3-4bf1-8e83-eddd8cb9ebe3');

create policy "Only platform admin can delete master pricing items"
  on surveyor_pricing_master_items for delete
  to authenticated
  using (auth.uid() = '745aaeae-fbb3-4bf1-8e83-eddd8cb9ebe3');
