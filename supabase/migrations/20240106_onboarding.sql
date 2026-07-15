-- Tracks progress through the post-signup "getting started" guide shown in
-- the admin portal. onboarding_step is the index of the next step to show
-- (0 = not started, length of ONBOARDING_STEPS = finished); onboarding_dismissed
-- lets a company opt out of ever seeing it again.
alter table companies
  add column if not exists onboarding_step integer not null default 0,
  add column if not exists onboarding_dismissed boolean not null default false;
