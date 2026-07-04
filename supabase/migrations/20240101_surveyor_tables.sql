-- Surveyor pricing items (per company, overridable defaults)
create table if not exists surveyor_pricing_items (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  category    text not null,
  name        text not null,
  key         text not null,
  price       numeric(10,2) not null default 0,
  unit        text not null default 'each',
  active      boolean not null default true,
  unique(company_id, key)
);

alter table surveyor_pricing_items enable row level security;

create policy "Company members can manage their own pricing items"
  on surveyor_pricing_items for all
  using (company_id = (
    select c.id from companies c
    where c.owner_user_id = auth.uid()
    limit 1
  ));

-- Surveyor quotes (created by field engineers, viewed by customers)
create table if not exists surveyor_quotes (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  customer_name   text not null default '',
  customer_email  text not null default '',
  customer_phone  text not null default '',
  postcode        text not null default '',
  survey_data     jsonb not null default '{}',
  line_items      jsonb not null default '{}',
  low_boiler_id   text not null default '',
  mid_boiler_id   text not null default '',
  high_boiler_id  text not null default '',
  low_total       numeric(10,2) not null default 0,
  mid_total       numeric(10,2) not null default 0,
  high_total      numeric(10,2) not null default 0,
  status          text not null default 'DRAFT',
  email_sent_at   timestamptz,
  accepted_tier   text,
  accepted_at     timestamptz,
  last_viewed_at  timestamptz,
  view_count      int not null default 0,
  notes           text
);

alter table surveyor_quotes enable row level security;

-- Authenticated company members can manage their quotes
create policy "Company members can manage their own surveyor quotes"
  on surveyor_quotes for all
  using (company_id = (
    select c.id from companies c
    where c.owner_user_id = auth.uid()
    limit 1
  ));

-- Customers (anon) can read a specific quote by ID (for the public quote page)
create policy "Anyone can read a surveyor quote by id"
  on surveyor_quotes for select
  using (true);

-- Trigger to auto-update updated_at
create or replace function update_surveyor_quotes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger surveyor_quotes_updated_at
  before update on surveyor_quotes
  for each row execute function update_surveyor_quotes_updated_at();
