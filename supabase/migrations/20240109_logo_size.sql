-- Lets each company scale their uploaded logo up or down (as a percentage
-- of the default size) from the branding settings, instead of every company
-- being stuck with one fixed size regardless of their logo's proportions.
alter table company_settings add column if not exists logo_size int not null default 100 check (logo_size between 25 and 300);
