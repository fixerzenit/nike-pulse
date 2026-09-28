begin;

-- Brooks is an additional tier-list brand. Keep purchase-context choices unchanged.
alter table public.brand_tier_rankings
  drop constraint if exists brand_tier_rankings_brand_v13_check;

alter table public.brand_tier_rankings
  add constraint brand_tier_rankings_brand_v14_check
  check (brand = any(array[
    'Nike','adidas','New Balance','ASICS','Salomon','On','Hoka','Puma',
    'Jordan','Converse','Vans','Reebok','Saucony','Under Armour','Brooks'
  ]::text[]));

-- Update the installed submit function while preserving all existing validation.
do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.submit_survey(jsonb)'::regprocedure)
    into definition;

  definition := replace(
    definition,
    'when ''1.4'' then 10',
    'when ''1.4'' then 11'
  );
  definition := replace(
    definition,
    '''Reebok'',''Saucony'',''Under Armour'']::text[]',
    '''Reebok'',''Saucony'',''Under Armour'',''Brooks'']::text[]'
  );
  definition := replace(
    definition,
    '''Under Armour'',''Reebok'']::text[])) then raise exception ''Brand not available in survey 1.3''',
    '''Under Armour'',''Reebok'',''Brooks'']::text[])) then raise exception ''Brand not available in survey 1.3'''
  );

  execute definition;
end $$;

commit;
