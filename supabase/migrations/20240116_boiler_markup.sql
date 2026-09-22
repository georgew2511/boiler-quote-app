-- Boiler markup and supplier price imports.
--
-- boilers.price is the boiler's TRADE price (what the installer pays their
-- merchant). The surveyor tool has always treated it that way, marking it up
-- by the company's BOILER margin in surveyor_category_margins. The online
-- quote calculator used to show it to customers as-is. From here on both use
-- the same rule:
--
--   customer price = price × (1 + markup / 100)
--   markup         = boilers.markup_percent, or the company BOILER margin when null

-- Per-boiler override. Null means "use the company-wide boiler markup".
alter table boilers
  add column if not exists markup_percent numeric(6,2);

-- Whether the online calculator applies the markup. Existing companies may
-- have typed selling prices into Boilers, so they start with this OFF and turn
-- it on from Pricing once they've confirmed their prices are trade prices;
-- otherwise their live online quotes would jump by their margin overnight.
-- The column is added with default false (backfilling every existing company),
-- then the default flips to true so companies created after this migration
-- get the markup from day one.
alter table companies
  add column if not exists calculator_applies_boiler_markup boolean not null default false;

alter table companies
  alter column calculator_applies_boiler_markup set default true;

-- Remembers which supplier line maps to which boiler, so the second import
-- from the same merchant matches exactly instead of fuzzily. match_key is a
-- normalised part number when the supplier gives one, otherwise the
-- normalised description (see lib/supplierImport.ts).
create table if not exists boiler_supplier_aliases (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  boiler_id     bigint not null references boilers(id) on delete cascade,
  match_key     text not null,
  supplier_text text not null,
  created_at    timestamptz not null default now(),
  unique(company_id, match_key)
);

create index if not exists boiler_supplier_aliases_company_id_idx
  on boiler_supplier_aliases(company_id);

alter table boiler_supplier_aliases enable row level security;

-- Owner-scoped like the other per-company tables. The app reads/writes these
-- with the service-role client, scoped to the company, so team members work too.
create policy "Company members can manage their own supplier aliases"
  on boiler_supplier_aliases for all
  using (company_id = (
    select c.id from companies c
    where c.owner_user_id = auth.uid()
    limit 1
  ));
