-- Pricing item keys the platform admin has deleted. Deleting an item removes
-- it from every company's surveyor_pricing_items, but items in the hardcoded
-- DEFAULT_PRICING list (app/api/surveyor/pricing/route.ts) would otherwise be
-- re-added by "Restore missing defaults" or by a new company signing up.
-- Recording the key here keeps it deleted permanently: the seed route filters
-- these out, so a deleted item never reappears for anyone.
create table if not exists surveyor_pricing_suppressed_keys (
  key         text primary key,
  deleted_by  uuid not null references auth.users(id),
  deleted_at  timestamptz not null default now()
);

alter table surveyor_pricing_suppressed_keys enable row level security;

-- Readable by any authenticated user (the seed route filters against it),
-- writable only by the platform admin. The app uses the service-role client
-- and enforces the same check in code (app/admin/surveyor-pricing/page.tsx),
-- so these policies are defense in depth rather than the sole gate.
create policy "Authenticated users can read suppressed pricing keys"
  on surveyor_pricing_suppressed_keys for select
  to authenticated
  using (true);

create policy "Only platform admin can insert suppressed pricing keys"
  on surveyor_pricing_suppressed_keys for insert
  to authenticated
  with check (auth.uid() = '745aaeae-fbb3-4bf1-8e83-eddd8cb9ebe3');

create policy "Only platform admin can delete suppressed pricing keys"
  on surveyor_pricing_suppressed_keys for delete
  to authenticated
  using (auth.uid() = '745aaeae-fbb3-4bf1-8e83-eddd8cb9ebe3');
