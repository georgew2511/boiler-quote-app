-- Surveyors table (field engineers per company, each with a unique public link token)
create table if not exists surveyors (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  email       text,
  token       text unique not null default encode(gen_random_bytes(16), 'hex'),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table surveyors enable row level security;

-- Authenticated company members can manage their own surveyors
create policy "Company members can manage their own surveyors"
  on surveyors for all
  using (company_id = (
    select c.id from companies c
    where c.owner_user_id = auth.uid()
    limit 1
  ));

-- Anyone (anon) can read a surveyor by token (used to load the public survey page)
create policy "Anyone can read a surveyor by token"
  on surveyors for select
  using (true);

-- Add surveyor columns to surveyor_quotes
alter table surveyor_quotes
  add column if not exists surveyor_id   uuid references surveyors(id),
  add column if not exists surveyor_name text;
