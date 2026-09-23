-- Version 1.4 adds quick purchase context and a ranked weakness; the final comment is optional.
begin;
alter table public.survey_responses drop constraint survey_version_supported;
alter table public.survey_responses add constraint survey_version_supported check (survey_version in ('1.0','1.1','1.2','1.3','1.4'));
alter table public.survey_responses add column priority_weakness text;
alter table public.survey_responses add column recent_purchase_brand text;
alter table public.survey_responses add column recent_purchase_reason text;
alter table public.survey_responses drop constraint survey_responses_ceo_change_check;
alter table public.survey_responses add constraint ceo_change_by_version check (
  (survey_version = '1.4' and length(trim(ceo_change)) <= 180)
  or (survey_version <> '1.4' and length(trim(ceo_change)) between 1 and 180)
);
-- Earlier versions required free text when selecting Other. Version 1.4 does not.
do $$
declare item record;
begin
  for item in select conname from pg_constraint
    where conrelid = 'public.survey_responses'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) like '%work_field <> ''Other''%'
        or pg_get_constraintdef(oid) like '%perception_change_reasons ? ''Other''%')
  loop execute format('alter table public.survey_responses drop constraint %I', item.conname); end loop;
end $$;
alter table public.survey_responses add constraint work_field_other_by_version check (
  survey_version = '1.4' or work_field <> 'Other' or length(trim(work_field_other)) > 0
);
alter table public.survey_responses add constraint change_other_by_version check (
  survey_version = '1.4' or not (perception_change_reasons ? 'Other') or length(trim(perception_change_other)) > 0
);
alter table public.survey_responses add constraint v14_quick_answers check (
  survey_version <> '1.4' or (
    apparel_purchase_consideration is not null and attribute_performance is not null
    and attribute_innovation is not null and attribute_audience is not null
    and attribute_focus is not null and attribute_lifestyle is null
    and attribute_for_athletes is null and attribute_for_normal_people is null
    and attribute_product_led is null and attribute_culture_led is null
    and priority_weakness = any(array['Performance products','Product innovation','Product design','Sneakers / lifestyle','Athlete partnerships','Marketing & storytelling','Fashion / collaborations','Culture','Community','Brand heritage']::text[])
    and nike_weaknesses ? priority_weakness
    and recent_purchase_brand = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma','Under Armour','Reebok','Another brand','No recent purchase']::text[])
    and recent_purchase_reason = any(array['','Comfort / fit','Performance','Design / style','Price / value','Quality / durability','Brand image','Recommendation','Availability']::text[])
    and ((recent_purchase_brand = 'No recent purchase' and recent_purchase_reason = '')
      or (recent_purchase_brand <> 'No recent purchase' and recent_purchase_reason <> ''))
    and nike_used_to_feel = any(array['Bold','Innovative','Performance-focused','Style-driven','Accessible','Predictable','Out of touch','Confident','Creative','Premium','Everyday','Inspiring']::text[])
    and nike_today_feels = any(array['Bold','Innovative','Performance-focused','Style-driven','Accessible','Predictable','Out of touch','Confident','Creative','Premium','Everyday','Inspiring']::text[])
  )
);
do $$
declare field text; legacy_max integer;
begin
  foreach field in array array['interest_sport','interest_sneakers','interest_fashion','interest_pop_culture','overall_perception','perception_change','culture_score','product_innovation_score'] loop
    legacy_max := case when field like 'interest_%' then 5 else 7 end;
    execute format('alter table public.survey_responses drop constraint %I', field || '_scale_by_version');
    execute format('alter table public.survey_responses add constraint %I check ((survey_version in (''1.2'',''1.3'',''1.4'') and %I between 0 and 10) or (survey_version in (''1.0'',''1.1'') and %I between 1 and %s))', field || '_scale_by_version', field, field, legacy_max);
  end loop;
  foreach field in array array['attribute_performance','attribute_innovation'] loop
    execute format('alter table public.survey_responses drop constraint %I', field || '_scale_by_version');
    execute format('alter table public.survey_responses add constraint %I check ((survey_version = ''1.0'' and %I is null) or (survey_version = ''1.1'' and %I between 1 and 7) or (survey_version in (''1.2'',''1.3'',''1.4'') and %I between 0 and 10))', field || '_scale_by_version', field, field, field);
  end loop;
  foreach field in array array['attribute_lifestyle','attribute_for_athletes','attribute_for_normal_people','attribute_product_led','attribute_culture_led'] loop
    execute format('alter table public.survey_responses drop constraint %I', field || '_scale_by_version');
    execute format('alter table public.survey_responses add constraint %I check ((survey_version in (''1.0'',''1.3'',''1.4'') and %I is null) or (survey_version = ''1.1'' and %I between 1 and 7) or (survey_version = ''1.2'' and %I between 0 and 10))', field || '_scale_by_version', field, field, field);
  end loop;
end $$;
alter table public.survey_responses drop constraint reasons_when_changed;
alter table public.survey_responses add constraint reasons_when_changed check (
  (survey_version in ('1.2','1.3','1.4') and ((perception_change = 5 and jsonb_array_length(perception_change_reasons) = 0) or (perception_change <> 5 and jsonb_array_length(perception_change_reasons) between 1 and 10)))
  or (survey_version in ('1.0','1.1') and ((perception_change = 4 and jsonb_array_length(perception_change_reasons) = 0) or (perception_change <> 4 and jsonb_array_length(perception_change_reasons) between 1 and 10)))
);
create or replace function public.submit_survey(payload jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid; incoming public.survey_responses; tier_key text; tier_value text;
begin
 if jsonb_typeof(payload->'brand_tiers') <> 'object' or
    (select count(*) from jsonb_object_keys(payload->'brand_tiers')) <> (case payload->>'survey_version' when '1.4' then 10 when '1.3' then 10 when '1.2' then 10 when '1.1' then 13 else 8 end) then
   raise exception 'Exactly % brand rankings required', (case payload->>'survey_version' when '1.4' then 10 when '1.3' then 10 when '1.2' then 10 when '1.1' then 13 else 8 end);
 end if;
 for tier_key, tier_value in select * from jsonb_each_text(payload->'brand_tiers') loop
   if not (tier_key = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma','Jordan','Converse','Vans','Reebok','Saucony','Under Armour']::text[])) or tier_value not in ('S','A','B','C','—') then raise exception 'Invalid brand tier'; end if;
   if payload->>'survey_version' = '1.2' and not (tier_key = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma','Jordan','Converse']::text[])) then raise exception 'Brand not available in survey 1.2'; end if;
   if payload->>'survey_version' in ('1.3','1.4') and not (tier_key = any(array['Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma','Under Armour','Reebok']::text[])) then raise exception 'Brand not available in survey 1.3'; end if;
 end loop;
 incoming := jsonb_populate_record(null::public.survey_responses, payload - 'culture_product_gap' - 'brand_tiers');
 insert into public.survey_responses (id,session_id,survey_version,started_at,created_at,completed_at,completion_seconds,is_synthetic,age_group,work_field,last_nike_purchase,country_code,country_name,work_field_other,perception_change_other,interest_sport,interest_sneakers,interest_fashion,interest_pop_culture,overall_perception,perception_change,culture_score,product_innovation_score,purchase_consideration,tension_performance_lifestyle,tension_innovator_follower,tension_athletes_everyone,tension_fresh_familiar,tension_product_marketing,tension_setting_following_culture,perception_change_reasons,nike_strengths,nike_weaknesses,nike_used_to_feel,nike_today_feels,ceo_change,apparel_purchase_consideration,attribute_performance,attribute_innovation,attribute_lifestyle,attribute_for_athletes,attribute_for_normal_people,attribute_product_led,attribute_culture_led,attribute_audience,attribute_focus,priority_weakness,recent_purchase_brand,recent_purchase_reason)
 values (incoming.id,incoming.session_id,incoming.survey_version,incoming.started_at,incoming.created_at,incoming.completed_at,incoming.completion_seconds,incoming.is_synthetic,incoming.age_group,incoming.work_field,incoming.last_nike_purchase,incoming.country_code,incoming.country_name,incoming.work_field_other,incoming.perception_change_other,incoming.interest_sport,incoming.interest_sneakers,incoming.interest_fashion,incoming.interest_pop_culture,incoming.overall_perception,incoming.perception_change,incoming.culture_score,incoming.product_innovation_score,incoming.purchase_consideration,incoming.tension_performance_lifestyle,incoming.tension_innovator_follower,incoming.tension_athletes_everyone,incoming.tension_fresh_familiar,incoming.tension_product_marketing,incoming.tension_setting_following_culture,incoming.perception_change_reasons,incoming.nike_strengths,incoming.nike_weaknesses,incoming.nike_used_to_feel,incoming.nike_today_feels,incoming.ceo_change,incoming.apparel_purchase_consideration,incoming.attribute_performance,incoming.attribute_innovation,incoming.attribute_lifestyle,incoming.attribute_for_athletes,incoming.attribute_for_normal_people,incoming.attribute_product_led,incoming.attribute_culture_led,incoming.attribute_audience,incoming.attribute_focus,incoming.priority_weakness,incoming.recent_purchase_brand,incoming.recent_purchase_reason)
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
