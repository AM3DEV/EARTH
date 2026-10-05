-- 0021_sub_companies.sql - small companies inside a big company.
-- Run once in Supabase SQL Editor.
-- A company row can point at a parent company; admin creates sub-companies
-- from the parent's edit page, clients see them as Branches on the detail page.
alter table companies add column if not exists parent_company_id uuid references companies(id) on delete cascade;
create index if not exists idx_companies_parent on companies(parent_company_id);
