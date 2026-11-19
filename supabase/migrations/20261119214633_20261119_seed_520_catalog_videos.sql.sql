/*
# Seed 520 catalog videos with French titles

1. Purpose
- Pre-fills the `public.videos` catalog with 520 entries (13 channels x 40 episodes),
  each with a French title, so the app has a full catalog without the admin uploading
  every file. Playback uses the official YouTube embed of a small pool of popular
  public videos that allow integration (same approach as reference catalogs).

2. Tables modified
- `public.videos`: inserts 520 rows with channel_id values prefixed with `seed-`
  (e.g. `seed-nature`) so seeded rows are identifiable and never duplicated.
- The unique constraint on `youtube_id` is dropped: the same source video can appear
  under several catalog entries (like any VOD catalog reusing episodes). Existing rows
  keep all their data.

3. Security
- No policy change: public read and admin-only writes remain as previously applied.

4. Idempotency
- The DO block exits without inserting if any `seed-%` row already exists.
*/

ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_youtube_id_key;

DO $$
DECLARE
  themes text[] := ARRAY[
    'Les paysages d''Afrique','La faune de la savane','Les oiseaux du monde','Les forêts tropicales','Les grands fleuves','La vie sous-marine','Les volcans du monde','Les aurores polaires',
    'Recettes africaines traditionnelles','Les plats du quotidien','Pâtisserie maison','Cuisine healthy','Saveurs épicées','Desserts faciles','Cuisine de fêtes','Bases de la cuisine',
    'Escapades à Dakar','Merveilles d''Europe','Îles paradisiaques','Road-trips en Afrique','Villes à découvrir','Aventures en montagne','Plages de rêve','Conseils de voyage',
    'Créer son entreprise','Marketing digital','Gérer son budget','Investir intelligemment','E-commerce pour débutants','Réussir en ligne','Esprit entrepreneurial','Finances personnelles',
    'Mix afrobeat 2026','Coups de cœur gospel','Rythmes traditionnels','Hits du moment','Découvertes musicales','Ambiance zouk','Classiques intemporels','Scène urbaine',
    'Nouveautés high-tech','Intelligence artificielle','Astuces smartphone','Sécurité en ligne','Objets connectés','Réussir sur internet','Innovations du futur','Tutoriels informatiques',
    'Fitness à la maison','Exercices sans matériel','Football : le best-of','Préparation physique','Yoga pour tous','Cardio brûle-calories','Conseils d''un coach','Étirements du matin',
    'Tendances wax','Style au quotidien','Mode africaine moderne','Accessoires incontournables','Look de soirée','Conseils de style','Mode homme','Mode femme',
    'Traditions d''Afrique de l''Ouest','Histoires inspirantes','Contes et légendes','Patrimoine culturel','Portraits d''artistes','Fêtes et célébrations','Langues d''Afrique','Artisanat traditionnel',
    'Bases de la photographie','Photo au smartphone','Portraits réussis','Photo de paysage','Retouche facile','Matériel pour débutants','Photo de rue','Composition d''image',
    'Bien-être au quotidien','Nutrition équilibrée','Sommeil réparateur','Gestion du stress','Remèdes naturels','Hygiène de vie','Santé de la famille','Forme et énergie',
    'Apprendre l''anglais','Méthodes d''apprentissage','Maths pas à pas','Réviser efficacement','Perfectionnement en français','Culture générale','Informatique de base','Discours inspirants',
    'Chefs-d''œuvre africains','Making-of exclusifs','Court-métrages primés','Bandes-annonces 2026','Rencontres de réalisateurs','Cinéma classique','Effets spéciaux','Scènes cultes'
  ];
  channel_ids text[] := ARRAY['seed-nature','seed-cuisine','seed-voyage','seed-business','seed-musique','seed-technologie','seed-sport','seed-mode','seed-culture','seed-photo','seed-sante','seed-education','seed-cinema'];
  channel_names text[] := ARRAY['Nature','Cuisine','Voyage','Business','Musique','Technologie','Sport','Mode','Culture','Photo','Santé','Éducation','Cinéma'];
  vids text[] := ARRAY['aqz-KE-bpKQ','LXb3EKWsInQ','M7lc1UVf-VE','YE7VzlLtp-4'];
  c int;
  ep int;
  theme_count int := 8;
  episode_total int := 40;
  theme text;
BEGIN
  IF (SELECT count(*) FROM public.videos WHERE channel_id LIKE 'seed-%') > 0 THEN
    RETURN;
  END IF;
  FOR c IN 1..13 LOOP
    FOR ep IN 1..episode_total LOOP
      theme := themes[(c - 1) * theme_count + 1 + ((ep - 1) % theme_count)];
      INSERT INTO public.videos (channel_id, channel_name, youtube_id, title)
      VALUES (
        channel_ids[c],
        channel_names[c],
        vids[1 + ((c * 37 + ep * 11) % array_length(vids, 1))],
        theme || ' – Épisode ' || ep
      );
    END LOOP;
  END LOOP;
END $$;
