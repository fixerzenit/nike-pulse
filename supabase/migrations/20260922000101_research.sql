-- Apply in the Supabase SQL editor or with supabase db push.
begin;
create or replace function public.valid_choices(value jsonb, allowed text[], minimum integer, maximum integer)
returns boolean language sql immutable set search_path = '' as $$
 select case when jsonb_typeof(value) <> 'array' then false else
 jsonb_array_length(value) between minimum and maximum
 and not exists (select 1 from jsonb_array_elements(value) e where jsonb_typeof(e) <> 'string')
 and not exists (select 1 from jsonb_array_elements_text(value) e where not (e = any(allowed)))
 and (select count(*) = count(distinct e) from jsonb_array_elements_text(value) e)
 end;
$$;
create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  survey_version text not null check (survey_version = '1.0'),
  started_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  completion_seconds integer not null check (completion_seconds between 0 and 86400),
  is_synthetic boolean not null default false,
  age_group text not null check (age_group = any(array['18–24','25–34','35–44','45–54','55+']::text[])),
  work_field text not null check (work_field = any(array['Creative / Design','Fashion','Sport','Tech','Finance','Consulting','Marketing / Advertising','Media','Education / Research','Student','Other']::text[])),
  last_nike_purchase text not null check (last_nike_purchase = any(array['In the last 3 months','3–12 months ago','1–3 years ago','More than 3 years ago','Never']::text[])),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  country_name text not null check (length(country_name) between 1 and 100),
  work_field_other text not null default '' check (length(work_field_other)<=80),
  perception_change_other text not null default '' check (length(perception_change_other)<=80),
  interest_sport integer not null check (interest_sport between 1 and 5),
  interest_sneakers integer not null check (interest_sneakers between 1 and 5),
  interest_fashion integer not null check (interest_fashion between 1 and 5),
  interest_pop_culture integer not null check (interest_pop_culture between 1 and 5),
  overall_perception integer not null check (overall_perception between 1 and 7),
  perception_change integer not null check (perception_change between 1 and 7),
  culture_score integer not null check (culture_score between 1 and 7),
  product_innovation_score integer not null check (product_innovation_score between 1 and 7),
  purchase_consideration integer not null check (purchase_consideration between 0 and 10),
  tension_performance_lifestyle integer not null check (tension_performance_lifestyle between 1 and 7),
  tension_innovator_follower integer not null check (tension_innovator_follower between 1 and 7),
  tension_athletes_everyone integer not null check (tension_athletes_everyone between 1 and 7),
  tension_fresh_familiar integer not null check (tension_fresh_familiar between 1 and 7),
  tension_product_marketing integer not null check (tension_product_marketing between 1 and 7),
  tension_setting_following_culture integer not null check (tension_setting_following_culture between 1 and 7),
  culture_product_gap integer generated always as (culture_score - product_innovation_score) stored,
  perception_change_reasons jsonb not null check (public.valid_choices(perception_change_reasons,array['Products','Design','Innovation','Marketing / storytelling','Athletes & partnerships','Cultural relevance','Competition from other brands','Brand values','Price / value','Other']::text[],0,2)),
  nike_strengths jsonb not null check (public.valid_choices(nike_strengths,array['Performance products','Product innovation','Product design','Sneakers / lifestyle','Athlete partnerships','Marketing & storytelling','Fashion / collaborations','Culture','Community','Brand heritage']::text[],1,3)),
  nike_weaknesses jsonb not null check (public.valid_choices(nike_weaknesses,array['Performance products','Product innovation','Product design','Sneakers / lifestyle','Athlete partnerships','Marketing & storytelling','Fashion / collaborations','Culture','Community','Brand heritage']::text[],1,3)),
  nike_used_to_feel text not null check (length(trim(nike_used_to_feel)) between 1 and 40),
  nike_today_feels text not null check (length(trim(nike_today_feels)) between 1 and 40),
  ceo_change text not null check (length(trim(ceo_change)) between 1 and 180),
  check (work_field <> 'Other' or length(trim(work_field_other)) > 0),
  check ((perception_change = 4 and jsonb_array_length(perception_change_reasons) = 0) or (perception_change <> 4 and jsonb_array_length(perception_change_reasons) between 1 and 2)),
  check (not (perception_change_reasons ? 'Other') or length(trim(perception_change_other)) > 0)
);
create table public.brand_tier_rankings (
 id uuid primary key default gen_random_uuid(),
 response_id uuid not null references public.survey_responses(id) on delete cascade,
 brand text not null check (brand = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma']::text[])),
 tier text not null check (tier in ('S','A','B','C','—')),
 tier_score integer generated always as (case tier when 'S' then 4 when 'A' then 3 when 'B' then 2 when 'C' then 1 else 0 end) stored,
 unique(response_id,brand)
);
create index responses_created_at on public.survey_responses(created_at);
create index responses_country on public.survey_responses(country_code);
create index responses_age on public.survey_responses(age_group);
create index responses_work on public.survey_responses(work_field);
-- The unique constraint already indexes response_id in brand_tier_rankings.
alter table public.survey_responses enable row level security;
alter table public.brand_tier_rankings enable row level security;
revoke all on public.survey_responses, public.brand_tier_rankings from anon, authenticated;
-- No client-side read policy: the server checks the private URL, then reads with its service role.
-- All writes go through the server-only service role. No public insert policy.
create or replace function public.submit_survey(payload jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid; incoming public.survey_responses; tier_key text; tier_value text;
begin
 if jsonb_typeof(payload->'brand_tiers') <> 'object' or
    (select count(*) from jsonb_object_keys(payload->'brand_tiers')) <> 8 then
   raise exception 'Exactly eight brand rankings required';
 end if;
 for tier_key, tier_value in select * from jsonb_each_text(payload->'brand_tiers') loop
   if not (tier_key = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma']::text[])) or tier_value not in ('S','A','B','C','—') then raise exception 'Invalid brand tier'; end if;
 end loop;
 incoming := jsonb_populate_record(null::public.survey_responses, payload - 'culture_product_gap' - 'brand_tiers');
 insert into public.survey_responses (id,session_id,survey_version,started_at,created_at,completed_at,completion_seconds,is_synthetic,age_group,work_field,last_nike_purchase,country_code,country_name,work_field_other,perception_change_other,interest_sport,interest_sneakers,interest_fashion,interest_pop_culture,overall_perception,perception_change,culture_score,product_innovation_score,purchase_consideration,tension_performance_lifestyle,tension_innovator_follower,tension_athletes_everyone,tension_fresh_familiar,tension_product_marketing,tension_setting_following_culture,perception_change_reasons,nike_strengths,nike_weaknesses,nike_used_to_feel,nike_today_feels,ceo_change)
 values (incoming.id,incoming.session_id,incoming.survey_version,incoming.started_at,incoming.created_at,incoming.completed_at,incoming.completion_seconds,incoming.is_synthetic,incoming.age_group,incoming.work_field,incoming.last_nike_purchase,incoming.country_code,incoming.country_name,incoming.work_field_other,incoming.perception_change_other,incoming.interest_sport,incoming.interest_sneakers,incoming.interest_fashion,incoming.interest_pop_culture,incoming.overall_perception,incoming.perception_change,incoming.culture_score,incoming.product_innovation_score,incoming.purchase_consideration,incoming.tension_performance_lifestyle,incoming.tension_innovator_follower,incoming.tension_athletes_everyone,incoming.tension_fresh_familiar,incoming.tension_product_marketing,incoming.tension_setting_following_culture,incoming.perception_change_reasons,incoming.nike_strengths,incoming.nike_weaknesses,incoming.nike_used_to_feel,incoming.nike_today_feels,incoming.ceo_change)
 on conflict (session_id) do nothing returning id into saved_id;
 if saved_id is null then
   select id into saved_id from public.survey_responses where session_id = incoming.session_id;
   return saved_id;
 end if;
 insert into public.brand_tier_rankings(response_id,brand,tier)
 select saved_id,key,value from jsonb_each_text(payload->'brand_tiers');
 return saved_id;
end;
$$;
revoke all on function public.submit_survey(jsonb) from public, anon, authenticated;
grant execute on function public.submit_survey(jsonb) to service_role;
grant all on public.survey_responses, public.brand_tier_rankings to service_role;
commit;
