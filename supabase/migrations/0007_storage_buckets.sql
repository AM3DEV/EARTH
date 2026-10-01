-- 0007_storage_buckets.sql — create Storage buckets (policies were defined in 0003).
-- Buckets cannot be created by RLS policies; they must exist first.
-- Idempotent: safe to re-run.

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('monuments', 'monuments', true),
  ('events', 'events', true),
  ('companies', 'companies', true),
  ('services', 'services', true),
  ('categories', 'categories', true)
on conflict (id) do nothing;
