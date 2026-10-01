-- 0005_seed.sql — clearly-marked DEMO data. Prices intentionally NULL (never invent real-world prices).
-- Mark: description prefix [DEMO]

insert into categories (name_en, name_ar, type) values
  ('Archaeological Sites','مواقع أثرية','monument'),
  ('Events','فعاليات','event'),
  ('Nature','طبيعة','monument'),
  ('Restaurants','مطاعم','company'),
  ('Hotels','فنادق','company'),
  ('Activities','أنشطة','company'),
  ('Tourist Services','خدمات سياحية','company')
on conflict do nothing;

-- Monuments (demo, price NULL)
insert into monuments (name_en, name_ar, description_en, description_ar, location, lat, lng, price, opening_hours) values
  ('Petra','البترا','[DEMO] Ancient Nabataean city, UNESCO site.','[DEMO] مدينة نبطية أثرية.','Ma''an',30.3285,35.4444,NULL,'06:00-18:00'),
  ('Wadi Rum','وادي رم','[DEMO] Desert valley with dramatic sandstone.','[DEMO] وادي صحراوي ساحر.','Aqaba',29.5321,35.4194,NULL,NULL),
  ('Jerash','جرش','[DEMO] Roman ruins, among best preserved.','[DEMO] آثار رومانية محفوظة.','Jerash',32.2723,35.8912,NULL,'08:00-19:00'),
  ('Amman Citadel','قلعة عمان','[DEMO] Historic hilltop citadel.','[DEMO] قلعة تاريخية وسط عمان.','Amman',31.9539,35.9344,NULL,'08:00-19:00'),
  ('Roman Theatre','المدرج الروماني','[DEMO] 2nd-century theatre downtown.','[DEMO] مسرح روماني وسط البلد.','Amman',31.9514,35.9393,NULL,'08:00-19:00'),
  ('Dead Sea','البحر الميت','[DEMO] Lowest point on earth.','[DEMO] أخفض نقطة على الأرض.','Madaba',31.4979,35.5484,NULL,NULL),
  ('Aqaba','العقبة','[DEMO] Red Sea resort city.','[DEMO] مدينة ساحلية على البحر الأحمر.','Aqaba',29.5321,35.0067,NULL,NULL),
  ('Ajloun Castle','قلعة عجلون','[DEMO] 12th-century hilltop castle.','[DEMO] قلعة من القرن الثاني عشر.','Ajloun',32.3258,35.7269,NULL,'08:00-19:00')
on conflict do nothing;

-- Demo companies (searchable on map; lat/lng set)
insert into companies (name_en, name_ar, location, lat, lng, phone, active, verified) values
  ('Amman Tours','جولات عمان','Amman',31.9539,35.9106,'+96260000001',true,true),
  ('Amman Restaurant','مطعم عمان','Amman',31.9539,35.9300,'+96260000002',true,false),
  ('Amman Hotel','فندق عمان','Amman',31.9600,35.9300,'+96260000003',true,true),
  ('Aqaba Diving Center','مركز العقبة للغوص','Aqaba',29.5321,35.0067,'+96260000004',true,true),
  ('Arabian Desert Tours','جولات الصحراء العربية','Wadi Rum',29.5321,35.4194,'+96260000005',true,false),
  ('Al Petra Travel','البترا للسفر','Petra',30.3285,35.4444,'+96260000006',true,true)
on conflict do nothing;

-- Default role permissions
insert into role_permissions (role, permission) values
  ('admin','manage_companies'),('admin','manage_events'),('admin','manage_services'),
  ('admin','manage_bookings'),('admin','manage_prices'),('admin','manage_discounts'),
  ('admin','manage_promotions'),('admin','manage_support_pricing'),
  ('admin','view_reviews'),('admin','view_own_logs'),('admin','manage_settings'),
  ('boss_admin','manage_companies'),('boss_admin','manage_events'),('boss_admin','manage_services'),
  ('boss_admin','manage_bookings'),('boss_admin','manage_prices'),('boss_admin','manage_discounts'),
  ('boss_admin','manage_promotions'),('boss_admin','manage_support_pricing'),
  ('boss_admin','view_reviews'),('boss_admin','view_own_logs'),('boss_admin','view_all_logs'),
  ('boss_admin','manage_administrators'),('boss_admin','manage_settings')
on conflict (role, permission) do nothing;

insert into app_settings (key, value) values
  ('support_defaults', '{"radiusKm": 25, "maxDiscount": 30, "durationHours": 48}'::jsonb),
  ('pricing_thresholds', '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb)
on conflict (key) do nothing;
