-- 0016_register_wizard.sql — account kind + all 10 app languages on profiles.
-- Run once in Supabase SQL Editor.
-- 1) user_kind for the registration wizard step 3 (citizen/tourist).
-- 2) language check must accept all 10 app locales (was en/ar only → writes
--    of fr/de/es/it/ru/tr/zh/nl from the language picker would fail).

alter table profiles add column if not exists user_kind text
  check (user_kind is null or user_kind in ('citizen', 'tourist'));

alter table profiles drop constraint if exists profiles_language_check;
alter table profiles add constraint profiles_language_check
  check (language in ('en', 'ar', 'fr', 'de', 'es', 'it', 'ru', 'tr', 'zh', 'nl'));
