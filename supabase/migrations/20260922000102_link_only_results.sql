-- Upgrade existing installations created with the former Supabase Auth dashboard.
begin;
drop policy if exists "Approved admins read responses" on public.survey_responses;
drop policy if exists "Approved admins read rankings" on public.brand_tier_rankings;
drop table if exists public.admin_users;
revoke all on public.survey_responses, public.brand_tier_rankings from anon, authenticated;
grant all on public.survey_responses, public.brand_tier_rankings to service_role;
commit;
