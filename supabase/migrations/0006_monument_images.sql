-- 0006_monument_images.sql — real monument photos (Wikimedia Commons, verified HTTP 200).
-- Idempotent: only fills rows that have no image yet. Safe to re-run.

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Al_Deir_Petra.JPG/1280px-Al_Deir_Petra.JPG', updated_at = now()
where name_en = 'Petra' and (image_url is null or image_url = '');

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Mountain_in_Wadi_Rum%2C_Jordan.jpg/1280px-Mountain_in_Wadi_Rum%2C_Jordan.jpg', updated_at = now()
where name_en = 'Wadi Rum' and (image_url is null or image_url = '');

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Oval_Plaza_%28Forum_Romanum%2C_Gerasa_-_Jerash%2C_Jordan%29_-_%D8%B3%D8%A7%D8%AD%D8%A9_%D8%A7%D9%84%D9%86%D8%AF%D9%88%D8%A9%2C_%D8%AC%D8%B1%D8%B4.jpg/1280px-Oval_Plaza_%28Forum_Romanum%2C_Gerasa_-_Jerash%2C_Jordan%29_-_%D8%B3%D8%A7%D8%AD%D8%A9_%D8%A7%D9%84%D9%86%D8%AF%D9%88%D8%A9%2C_%D8%AC%D8%B1%D8%B4.jpg', updated_at = now()
where name_en = 'Jerash' and (image_url is null or image_url = '');

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Amman_Citadel.jpg/1280px-Amman_Citadel.jpg', updated_at = now()
where name_en = 'Amman Citadel' and (image_url is null or image_url = '');

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Roman_theater_of_Amman_01.jpg/1280px-Roman_theater_of_Amman_01.jpg', updated_at = now()
where name_en = 'Roman Theatre' and (image_url is null or image_url = '');

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Dead_Sea_beach_00.JPG/1280px-Dead_Sea_beach_00.JPG', updated_at = now()
where name_en = 'Dead Sea' and (image_url is null or image_url = '');

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/AQABA_2.png/1280px-AQABA_2.png', updated_at = now()
where name_en = 'Aqaba' and (image_url is null or image_url = '');

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Ajloun_Castle.jpg/1280px-Ajloun_Castle.jpg', updated_at = now()
where name_en = 'Ajloun Castle' and (image_url is null or image_url = '');
