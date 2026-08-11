-- Link a surveyor quote back to the CRM lead it was raised against, so a quote
-- created in the field can move that lead through the pipeline automatically
-- instead of someone remembering to drag the card.
--
-- Note the type: leads.id is a bigint identity column, unlike the uuid primary
-- keys used by the surveyor_* tables.
alter table surveyor_quotes
  add column if not exists lead_id bigint references leads(id) on delete set null;

-- Lookups are always scoped to a company ("show me this lead's quotes"), so
-- lead the index with company_id to match the existing access pattern.
create index if not exists surveyor_quotes_company_lead_idx
  on surveyor_quotes (company_id, lead_id);
