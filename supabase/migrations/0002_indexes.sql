-- 0002_indexes.sql
create extension if not exists pg_trgm;

-- Company search (server-side, scalable)
create index if not exists idx_companies_name_en_trgm on companies using gin (name_en gin_trgm_ops);
create index if not exists idx_companies_name_ar_trgm on companies using gin (name_ar gin_trgm_ops);
create index if not exists idx_companies_category on companies (category_id);
create index if not exists idx_companies_active on companies (active) where active = true;

create index if not exists idx_events_category on events (category_id);
create index if not exists idx_events_active on events (active) where active = true;
create index if not exists idx_events_start on events (start_at);
create index if not exists idx_events_geo on events (lat, lng);

create index if not exists idx_services_company on services (company_id);
create index if not exists idx_services_category on services (category_id);
create index if not exists idx_services_available on services (available) where available = true;

create index if not exists idx_bookings_user on bookings (user_id);
create index if not exists idx_bookings_service on bookings (service_id);
create index if not exists idx_bookings_date on bookings (booking_date);
create index if not exists idx_bookings_status on bookings (status);

create index if not exists idx_reviews_target on reviews (target_type, target_id);
create index if not exists idx_favorites_user on favorites (user_id);

create index if not exists idx_support_source on event_support_discounts (source_event_id);
create index if not exists idx_support_target on event_support_discounts (target_event_id);
create index if not exists idx_support_status on event_support_discounts (status);

create index if not exists idx_promo_event on event_promotions (event_id);
create index if not exists idx_promo_status on event_promotions (status);
create index if not exists idx_promo_window on event_promotions (start_at, end_at);

create index if not exists idx_profiles_username on profiles (username);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);
create index if not exists idx_logs_admin on admin_activity_logs (admin_user_id, created_at desc);

-- Discovery view: active promoted events first, then relevance (date, freshness, rating)
create or replace view event_discovery as
select e.*,
  (select count(*) > 0 from event_promotions p
    where p.event_id = e.id and p.status = 'active'
      and (p.start_at is null or p.start_at <= now())
      and (p.end_at is null or p.end_at >= now())) as is_promoted,
  (select max(p.priority) from event_promotions p
    where p.event_id = e.id and p.status = 'active'
      and (p.start_at is null or p.start_at <= now())
      and (p.end_at is null or p.end_at >= now())) as promo_priority
from events e
where e.active = true
order by is_promoted desc, promo_priority desc nulls last, e.start_at asc nulls last, e.created_at desc;
