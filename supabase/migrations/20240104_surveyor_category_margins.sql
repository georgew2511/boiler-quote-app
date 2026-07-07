-- Per-company margin percentages applied on top of the cost prices entered on
-- surveyor_pricing_items (and the boiler trade price) when a surveyor builds a
-- quote. Stored per pricing category so different material types can carry
-- different margins. Labour is deliberately excluded — it has no margin row.
create table if not exists surveyor_category_margins (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  category       text not null,
  margin_percent numeric(6,2) not null default 0,
  unique(company_id, category)
);

alter table surveyor_category_margins enable row level security;

-- Mirrors the surveyor_pricing_items policy: owner-scoped. The app reads/writes
-- these with the service-role admin client (scoped to the company) because the
-- surveyor tool is used by team members too, not just the owner.
create policy "Company members can manage their own category margins"
  on surveyor_category_margins for all
  using (company_id = (
    select c.id from companies c
    where c.owner_user_id = auth.uid()
    limit 1
  ));
