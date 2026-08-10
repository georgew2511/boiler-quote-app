-- Logos are uploaded as-is, and a white or very light logo disappears against
-- the white quote page — the company can't tell, because it looks correct to
-- them in the dark admin sidebar. Rather than guess a logo's brightness, let
-- them place it on a light or dark plate, tinted from their own secondary
-- colour so it reads as a brand element instead of a black box.
--
-- 'none' keeps the current behaviour, so existing companies are unaffected.
alter table company_settings
  add column if not exists logo_backdrop text not null default 'none'
  check (logo_backdrop in ('none', 'light', 'dark'));
