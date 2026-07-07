-- Customisable FCA finance regulatory disclosure shown on customer quotes when
-- finance is offered. Free text so each company can enter the exact wording
-- required by their finance provider (introducer FRN, registered address,
-- company number, credit broker details — all of which vary per company).
alter table company_settings
  add column if not exists finance_disclosure text;
