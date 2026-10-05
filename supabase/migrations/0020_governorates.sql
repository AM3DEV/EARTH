-- 0020_governorates.sql - governorate column for the Near Event governorate system.
-- Run once in Supabase SQL Editor.
-- Admin picks a governorate when creating a company/event; the client app
-- GPS-detects the tourist's governorate and Near Event shows only the
-- companies + events of that governorate.
alter table companies add column if not exists governorate text;
alter table events add column if not exists governorate text;

do $$ begin
  alter table companies add constraint companies_governorate_check
    check (governorate is null or governorate in
      ('amman','balqa','zarqa','madaba','karak','jerash','ajloun','mafraq','irbid','aqaba','maan','tafilah'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table events add constraint events_governorate_check
    check (governorate is null or governorate in
      ('amman','balqa','zarqa','madaba','karak','jerash','ajloun','mafraq','irbid','aqaba','maan','tafilah'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_companies_governorate on companies(governorate);
create index if not exists idx_events_governorate on events(governorate);

-- Best-effort backfill for existing rows from lat/lng (same boxes as the app detector).
update companies set governorate = case
  when lat between 32.20 and 32.45 and lng between 35.60 and 35.95 then 'ajloun'
  when lat between 32.10 and 32.40 and lng between 35.75 and 36.05 then 'jerash'
  when lat between 32.35 and 32.80 and lng between 35.60 and 36.05 then 'irbid'
  when lat between 31.85 and 32.20 and lng between 35.55 and 35.95 then 'balqa'
  when lat between 31.55 and 31.90 and lng between 35.60 and 36.00 then 'madaba'
  when lat between 31.60 and 32.15 and lng between 35.70 and 36.35 then 'amman'
  when lat between 31.60 and 32.30 and lng between 36.00 and 37.60 then 'zarqa'
  when lat between 30.95 and 31.55 and lng between 35.50 and 36.10 then 'karak'
  when lat between 30.60 and 31.10 and lng between 35.40 and 35.90 then 'tafilah'
  when lat between 29.80 and 31.10 and lng between 35.00 and 37.60 then 'maan'
  when lat between 29.20 and 29.90 and lng between 34.90 and 35.40 then 'aqaba'
  when lat between 31.80 and 33.40 and lng between 36.00 and 39.30 then 'mafraq'
  else null end
where governorate is null and lat is not null and lng is not null;

update events set governorate = case
  when lat between 32.20 and 32.45 and lng between 35.60 and 35.95 then 'ajloun'
  when lat between 32.10 and 32.40 and lng between 35.75 and 36.05 then 'jerash'
  when lat between 32.35 and 32.80 and lng between 35.60 and 36.05 then 'irbid'
  when lat between 31.85 and 32.20 and lng between 35.55 and 35.95 then 'balqa'
  when lat between 31.55 and 31.90 and lng between 35.60 and 36.00 then 'madaba'
  when lat between 31.60 and 32.15 and lng between 35.70 and 36.35 then 'amman'
  when lat between 31.60 and 32.30 and lng between 36.00 and 37.60 then 'zarqa'
  when lat between 30.95 and 31.55 and lng between 35.50 and 36.10 then 'karak'
  when lat between 30.60 and 31.10 and lng between 35.40 and 35.90 then 'tafilah'
  when lat between 29.80 and 31.10 and lng between 35.00 and 37.60 then 'maan'
  when lat between 29.20 and 29.90 and lng between 34.90 and 35.40 then 'aqaba'
  when lat between 31.80 and 33.40 and lng between 36.00 and 39.30 then 'mafraq'
  else null end
where governorate is null and lat is not null and lng is not null;
