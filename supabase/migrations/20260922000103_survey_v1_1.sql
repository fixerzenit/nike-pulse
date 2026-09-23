-- Version 1.1 keeps older responses and expands choices without silently reinterpreting them.
begin;
alter table public.survey_responses drop constraint if exists survey_responses_survey_version_check;
alter table public.survey_responses add constraint survey_version_supported check (survey_version in ('1.0','1.1'));
alter table public.survey_responses add column apparel_purchase_consideration integer check (apparel_purchase_consideration between 0 and 10);
alter table public.survey_responses add column attribute_performance integer check (attribute_performance between 1 and 7);
alter table public.survey_responses add column attribute_innovation integer check (attribute_innovation between 1 and 7);
alter table public.survey_responses add column attribute_lifestyle integer check (attribute_lifestyle between 1 and 7);
alter table public.survey_responses add column attribute_for_athletes integer check (attribute_for_athletes between 1 and 7);
alter table public.survey_responses add column attribute_for_normal_people integer check (attribute_for_normal_people between 1 and 7);
alter table public.survey_responses add column attribute_product_led integer check (attribute_product_led between 1 and 7);
alter table public.survey_responses add column attribute_culture_led integer check (attribute_culture_led between 1 and 7);
alter table public.survey_responses alter column tension_performance_lifestyle drop not null;
alter table public.survey_responses alter column tension_innovator_follower drop not null;
alter table public.survey_responses alter column tension_athletes_everyone drop not null;
alter table public.survey_responses alter column tension_fresh_familiar drop not null;
alter table public.survey_responses alter column tension_product_marketing drop not null;
alter table public.survey_responses alter column tension_setting_following_culture drop not null;
-- Replace version-1 selection caps; older rows remain valid.
do $$
declare item record;
begin
 for item in select conname from pg_constraint
   where conrelid = 'public.survey_responses'::regclass and contype = 'c'
     and (pg_get_constraintdef(oid) like '%valid_choices(perception_change_reasons%'
       or pg_get_constraintdef(oid) like '%valid_choices(nike_strengths%'
       or pg_get_constraintdef(oid) like '%valid_choices(nike_weaknesses%'
       or pg_get_constraintdef(oid) like '%jsonb_array_length(perception_change_reasons)%')
 loop execute format('alter table public.survey_responses drop constraint %I', item.conname); end loop;
end $$;
alter table public.survey_responses add constraint reasons_choices check (public.valid_choices(perception_change_reasons,array['Products','Design','Innovation','Marketing / storytelling','Athletes & partnerships','Cultural relevance','Competition from other brands','Brand values','Price / value','Other']::text[],0,10));
alter table public.survey_responses add constraint strengths_choices check (public.valid_choices(nike_strengths,array['Performance products','Product innovation','Product design','Sneakers / lifestyle','Athlete partnerships','Marketing & storytelling','Fashion / collaborations','Culture','Community','Brand heritage']::text[],1,10));
alter table public.survey_responses add constraint weaknesses_choices check (public.valid_choices(nike_weaknesses,array['Performance products','Product innovation','Product design','Sneakers / lifestyle','Athlete partnerships','Marketing & storytelling','Fashion / collaborations','Culture','Community','Brand heritage']::text[],1,10));
alter table public.survey_responses add constraint reasons_when_changed check ((perception_change = 4 and jsonb_array_length(perception_change_reasons) = 0) or (perception_change <> 4 and jsonb_array_length(perception_change_reasons) between 1 and 10));
alter table public.survey_responses add constraint v11_required_fields check (survey_version <> '1.1' or (apparel_purchase_consideration is not null and attribute_performance is not null and attribute_innovation is not null and attribute_lifestyle is not null and attribute_for_athletes is not null and attribute_for_normal_people is not null and attribute_product_led is not null and attribute_culture_led is not null));
alter table public.survey_responses add constraint v11_feeling_choices check (survey_version <> '1.1' or (nike_used_to_feel = any(array['Bold','Innovative','Performance-focused','Style-driven','Accessible','Predictable','Out of touch']::text[]) and nike_today_feels = any(array['Bold','Innovative','Performance-focused','Style-driven','Accessible','Predictable','Out of touch']::text[])));
alter table public.brand_tier_rankings drop constraint if exists brand_tier_rankings_brand_check;
alter table public.brand_tier_rankings add constraint brand_tier_rankings_brand_v11_check check (brand = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma','Jordan','Converse','Vans','Reebok','Saucony']::text[]));
create or replace function public.submit_survey(payload jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid; incoming public.survey_responses; tier_key text; tier_value text;
begin
 if jsonb_typeof(payload->'brand_tiers') <> 'object' or
    (select count(*) from jsonb_object_keys(payload->'brand_tiers')) <> (case when payload->>'survey_version' = '1.1' then 13 else 8 end) then
   raise exception 'Exactly % brand rankings required', (case when payload->>'survey_version' = '1.1' then 13 else 8 end);
 end if;
 for tier_key, tier_value in select * from jsonb_each_text(payload->'brand_tiers') loop
   if not (tier_key = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma','Jordan','Converse','Vans','Reebok','Saucony']::text[])) or tier_value not in ('S','A','B','C','—') then raise exception 'Invalid brand tier'; end if;
 end loop;
 incoming := jsonb_populate_record(null::public.survey_responses, payload - 'culture_product_gap' - 'brand_tiers');
 insert into public.survey_responses (id,session_id,survey_version,started_at,created_at,completed_at,completion_seconds,is_synthetic,age_group,work_field,last_nike_purchase,country_code,country_name,work_field_other,perception_change_other,interest_sport,interest_sneakers,interest_fashion,interest_pop_culture,overall_perception,perception_change,culture_score,product_innovation_score,purchase_consideration,tension_performance_lifestyle,tension_innovator_follower,tension_athletes_everyone,tension_fresh_familiar,tension_product_marketing,tension_setting_following_culture,perception_change_reasons,nike_strengths,nike_weaknesses,nike_used_to_feel,nike_today_feels,ceo_change,apparel_purchase_consideration,attribute_performance,attribute_innovation,attribute_lifestyle,attribute_for_athletes,attribute_for_normal_people,attribute_product_led,attribute_culture_led)
 values (incoming.id,incoming.session_id,incoming.survey_version,incoming.started_at,incoming.created_at,incoming.completed_at,incoming.completion_seconds,incoming.is_synthetic,incoming.age_group,incoming.work_field,incoming.last_nike_purchase,incoming.country_code,incoming.country_name,incoming.work_field_other,incoming.perception_change_other,incoming.interest_sport,incoming.interest_sneakers,incoming.interest_fashion,incoming.interest_pop_culture,incoming.overall_perception,incoming.perception_change,incoming.culture_score,incoming.product_innovation_score,incoming.purchase_consideration,incoming.tension_performance_lifestyle,incoming.tension_innovator_follower,incoming.tension_athletes_everyone,incoming.tension_fresh_familiar,incoming.tension_product_marketing,incoming.tension_setting_following_culture,incoming.perception_change_reasons,incoming.nike_strengths,incoming.nike_weaknesses,incoming.nike_used_to_feel,incoming.nike_today_feels,incoming.ceo_change,incoming.apparel_purchase_consideration,incoming.attribute_performance,incoming.attribute_innovation,incoming.attribute_lifestyle,incoming.attribute_for_athletes,incoming.attribute_for_normal_people,incoming.attribute_product_led,incoming.attribute_culture_led)
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
commit;
