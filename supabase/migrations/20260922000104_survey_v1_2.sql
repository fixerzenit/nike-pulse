-- Version 1.2 uses ten selected brands and a common 0-10 score system.
-- Existing 1.0 and 1.1 scores retain their original ranges and meanings.
begin;
alter table public.survey_responses drop constraint survey_version_supported;
alter table public.survey_responses add constraint survey_version_supported check (survey_version in ('1.0','1.1','1.2'));

do $$
declare field text; legacy_max integer;
begin
  foreach field in array array['interest_sport','interest_sneakers','interest_fashion','interest_pop_culture','overall_perception','perception_change','culture_score','product_innovation_score'] loop
    legacy_max := case when field like 'interest_%' then 5 else 7 end;
    execute format('alter table public.survey_responses drop constraint if exists %I', 'survey_responses_' || field || '_check');
    execute format('alter table public.survey_responses add constraint %I check ((survey_version = ''1.2'' and %I between 0 and 10) or (survey_version <> ''1.2'' and %I between 1 and %s))', field || '_scale_by_version', field, field, legacy_max);
  end loop;
  foreach field in array array['attribute_performance','attribute_innovation','attribute_lifestyle','attribute_for_athletes','attribute_for_normal_people','attribute_product_led','attribute_culture_led'] loop
    execute format('alter table public.survey_responses drop constraint if exists %I', 'survey_responses_' || field || '_check');
    execute format('alter table public.survey_responses add constraint %I check ((survey_version = ''1.0'' and %I is null) or (survey_version = ''1.1'' and %I between 1 and 7) or (survey_version = ''1.2'' and %I between 0 and 10))', field || '_scale_by_version', field, field, field);
  end loop;
end $$;

alter table public.survey_responses drop constraint reasons_when_changed;
alter table public.survey_responses add constraint reasons_when_changed check (
  (survey_version = '1.2' and ((perception_change = 5 and jsonb_array_length(perception_change_reasons) = 0) or (perception_change <> 5 and jsonb_array_length(perception_change_reasons) between 1 and 10)))
  or
  (survey_version <> '1.2' and ((perception_change = 4 and jsonb_array_length(perception_change_reasons) = 0) or (perception_change <> 4 and jsonb_array_length(perception_change_reasons) between 1 and 10)))
);
alter table public.survey_responses add constraint v12_required_fields check (survey_version <> '1.2' or (apparel_purchase_consideration is not null and attribute_performance is not null and attribute_innovation is not null and attribute_lifestyle is not null and attribute_for_athletes is not null and attribute_for_normal_people is not null and attribute_product_led is not null and attribute_culture_led is not null));
alter table public.survey_responses add constraint v12_feeling_choices check (survey_version <> '1.2' or (nike_used_to_feel = any(array['Bold','Innovative','Performance-focused','Style-driven','Accessible','Predictable','Out of touch']::text[]) and nike_today_feels = any(array['Bold','Innovative','Performance-focused','Style-driven','Accessible','Predictable','Out of touch']::text[])));

create or replace function public.submit_survey(payload jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid; incoming public.survey_responses; tier_key text; tier_value text;
begin
 if jsonb_typeof(payload->'brand_tiers') <> 'object' or
    (select count(*) from jsonb_object_keys(payload->'brand_tiers')) <> (case payload->>'survey_version' when '1.2' then 10 when '1.1' then 13 else 8 end) then
   raise exception 'Exactly % brand rankings required', (case payload->>'survey_version' when '1.2' then 10 when '1.1' then 13 else 8 end);
 end if;
 for tier_key, tier_value in select * from jsonb_each_text(payload->'brand_tiers') loop
   if not (tier_key = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma','Jordan','Converse','Vans','Reebok','Saucony']::text[])) or tier_value not in ('S','A','B','C','—') then raise exception 'Invalid brand tier'; end if;
   if payload->>'survey_version' = '1.2' and not (tier_key = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma','Jordan','Converse']::text[])) then raise exception 'Brand not available in survey 1.2'; end if;
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
