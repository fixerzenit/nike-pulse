begin;

alter table public.survey_responses
  drop constraint ceo_change_by_version;

alter table public.survey_responses
  add constraint ceo_change_by_version check (
    survey_version = '1.4'
    or length(trim(ceo_change)) between 1 and 180
  );

commit;
