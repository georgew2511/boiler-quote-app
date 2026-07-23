-- "Anyone can read a surveyor by token" (using (true)) granted blanket SELECT
-- access to every row in `surveyors` for any authenticated (or anon) client,
-- not just a lookup scoped to a specific token — any company's staff could
-- run `supabase.from('surveyors').select('*')` from the browser and see every
-- other company's surveyor names, emails, and survey link tokens.
--
-- The public /survey/[token] page never actually relied on this policy — it
-- reads via the service-role admin client, which bypasses RLS entirely. So
-- the policy was both unused for its stated purpose and an active leak.
drop policy if exists "Anyone can read a surveyor by token" on surveyors;
