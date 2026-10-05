-- 0024_remove_demo.sql - strip the [DEMO] seed prefix from live text.
-- Run once in Supabase SQL Editor.
update monuments set
  name_en = ltrim(replace(coalesce(name_en, ''), '[DEMO]', '')),
  name_ar = ltrim(replace(coalesce(name_ar, ''), '[DEMO]', '')),
  description_en = ltrim(replace(coalesce(description_en, ''), '[DEMO]', '')),
  description_ar = ltrim(replace(coalesce(description_ar, ''), '[DEMO]', '')),
  updated_at = now()
where name_en like '%[DEMO]%' or name_ar like '%[DEMO]%'
   or description_en like '%[DEMO]%' or description_ar like '%[DEMO]%';

update companies set
  name_en = ltrim(replace(coalesce(name_en, ''), '[DEMO]', '')),
  name_ar = ltrim(replace(coalesce(name_ar, ''), '[DEMO]', '')),
  description_en = ltrim(replace(coalesce(description_en, ''), '[DEMO]', '')),
  description_ar = ltrim(replace(coalesce(description_ar, ''), '[DEMO]', '')),
  updated_at = now()
where name_en like '%[DEMO]%' or name_ar like '%[DEMO]%'
   or description_en like '%[DEMO]%' or description_ar like '%[DEMO]%';

update events set
  title_en = ltrim(replace(coalesce(title_en, ''), '[DEMO]', '')),
  title_ar = ltrim(replace(coalesce(title_ar, ''), '[DEMO]', '')),
  description_en = ltrim(replace(coalesce(description_en, ''), '[DEMO]', '')),
  description_ar = ltrim(replace(coalesce(description_ar, ''), '[DEMO]', '')),
  updated_at = now()
where title_en like '%[DEMO]%' or title_ar like '%[DEMO]%'
   or description_en like '%[DEMO]%' or description_ar like '%[DEMO]%';

update services set
  name_en = ltrim(replace(coalesce(name_en, ''), '[DEMO]', '')),
  name_ar = ltrim(replace(coalesce(name_ar, ''), '[DEMO]', '')),
  description_en = ltrim(replace(coalesce(description_en, ''), '[DEMO]', '')),
  description_ar = ltrim(replace(coalesce(description_ar, ''), '[DEMO]', '')),
  updated_at = now()
where name_en like '%[DEMO]%' or name_ar like '%[DEMO]%'
   or description_en like '%[DEMO]%' or description_ar like '%[DEMO]%';

-- Purge auto-translations that were cached from [DEMO] sources;
-- they re-translate cleanly on next view.
delete from place_translations
where source_text like '%[DEMO]%' or translated_text like '%[DEMO]%';
