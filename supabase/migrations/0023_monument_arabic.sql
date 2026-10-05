-- 0023_monument_arabic.sql - real Arabic descriptions for famous monuments.
-- Run once in Supabase SQL Editor.
-- Only fills description_ar when it is missing or still a [DEMO] placeholder,
-- matched by English name. Your auto-translate serves every other language.
-- Admins can refine any text later in Monuments > Edit.

update monuments set description_ar = 'البتراء مدينة أثرية منحوتة في الصخر الوردي، بناها الأنباط قبل أكثر من ألفي عام. تشتهر بالخزنة والدير والمسرح النبطي، وهي من عجائب الدنيا السبع الجديدة وموقع تراث عالمي لليونسكو.', updated_at = now()
where name_en = 'Petra' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'وادي رم صحراء ساحرة بجبالها الرملية الحمراء ووديانها الواسعة، ويعرف بوادي القمر. يقدم تجارب التخييم تحت النجوم ورحلات سيارات الدفع الرباعي وركوب الجمال والمناطيد.', updated_at = now()
where name_en = 'Wadi Rum' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'جرش من أفضل المدن الرومانية المحافظ عليها في العالم. تشتهر بشارع الأعمدة والمسرحين الشمالي والجنوبي وساحة البيضاوي، وتستضيف مهرجان جرش للثقافة والفنون كل صيف.', updated_at = now()
where name_en = 'Jerash' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'قلعة عمان موقع أثري على قمة جبل القلعة وسط العاصمة. تضم معبد هرقل والقصر الأموي ومتحف الآثار الأردني، وتطل على المدرج الروماني ووسط البلد.', updated_at = now()
where name_en = 'Amman Citadel' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'المدرج الروماني في وسط عمان، بني في القرن الثاني الميلادي ويتسع لستة آلاف متفرج. ما يزال يستضيف العروض والحفلات والفعاليات الثقافية حتى اليوم.', updated_at = now()
where name_en = 'Roman Theatre' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'البحر الميت أخفض بقعة على سطح الأرض. مياهه شديدة الملوحة تتيح الطفو على السطح، وطينه غني بالمعادن المفيدة للبشرة، وتحيط به المنتجعات الصحية والفنادق.', updated_at = now()
where name_en = 'Dead Sea' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'قلعة عجلون قلعة إسلامية بناها القائد صلاح الدين الأيوبي في القرن الثاني عشر لحماية طرق التجارة والحج. تطل على وادي الأردن وتضم متحفا أثريا.', updated_at = now()
where name_en = 'Ajloun Castle' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'قلعة الكرك من أكبر القلاع الصليبية في بلاد الشام، بنيت في القرن الثاني عشر. تشتهر بقاعاتها ومتاهاتها الحجرية وإطلالاتها الواسعة نحو البحر الميت.', updated_at = now()
where name_en = 'Karak Castle' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'مادبا مدينة الفسيفساء الأردنية. تشتهر بخارطة الأرض المقدسة الفسيفسائية في كنيسة القديس جاورجيوس، إضافة إلى كنائسها البيزنطية ومدارس الفسيفساء.', updated_at = now()
where name_en = 'Madaba' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'المغطس موقع عماد السيد المسيح على نهر الأردن. موقع حج مسيحي عالمي ومدرج على قائمة اليونسكو للتراث العالمي، تقام فيه الاحتفالات الدينية على مدار العام.', updated_at = now()
where name_en = 'Baptism Site' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'العقبة المدينة الساحلية الوحيدة في الأردن على البحر الأحمر. تشتهر بالشواطئ والغوص بين الشعاب المرجانية، إضافة إلى قلعتها التاريخية ومتاحفها البحرية.', updated_at = now()
where name_en = 'Aqaba' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'أم قيس مدينة أثرية رومانية على مرتفعات الشمال. تشتهر بشوارعها المرصوفة ومسرحيها وإطلالتها البانورامية على بحيرة طبريا وهضبة الجولان.', updated_at = now()
where name_en = 'Umm Qais' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'قصر عمرة من قصور الصحراء الأموية في البادية الشرقية. يشتهر بلوحاته الجدارية الفريدة التي تصور الحياة في العصر الأموي، وهو موقع تراث عالمي لليونسكو.', updated_at = now()
where name_en = 'Qasr Amra' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');

update monuments set description_ar = 'محمية ضانا الطبيعية من أجمل المحميات في الأردن. تمتد من المرتفعات إلى وادي عربة، وتضم قرية ضانا التاريخية ومسارات مشي خلابة وتنوعا حيويا نادرا.', updated_at = now()
where name_en = 'Dana' and (description_ar is null or description_ar = '' or description_ar like '[DEMO]%');
