-- ---------------------------------------------------------------------------
-- Seed Data: Standard-Übungsbibliothek (is_custom = 0)
-- Idempotent: kann mehrfach ausgeführt werden, ohne Duplikate zu erzeugen.
--
--   wrangler d1 execute fit-man-db --local  --file=./seed.sql
--   wrangler d1 execute fit-man-db --remote --file=./seed.sql
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO exercises (id, name, category, target_muscle, is_custom) VALUES
  -- Brust
  ('ex_bankdruecken',        'Bankdrücken (Langhantel)',   'Brust',    'Pectoralis major',        0),
  ('ex_schraegbankdruecken', 'Schrägbankdrücken (KH)',     'Brust',    'Obere Brust',             0),
  ('ex_butterfly',           'Butterfly / Cable Fly',      'Brust',    'Pectoralis major',        0),
  ('ex_liegestuetze',        'Liegestütze',                'Brust',    'Brust, Trizeps',          0),

  -- Rücken
  ('ex_klimmzuege',          'Klimmzüge',                  'Rücken',   'Latissimus dorsi',        0),
  ('ex_latzug',              'Latzug zur Brust',           'Rücken',   'Latissimus dorsi',        0),
  ('ex_langhantelrudern',    'Langhantelrudern',           'Rücken',   'Latissimus, Rhomboiden',  0),
  ('ex_kreuzheben',          'Kreuzheben',                 'Rücken',   'Rückenstrecker, Glutes',  0),
  ('ex_kabelrudern',         'Kabelrudern sitzend',        'Rücken',   'Mittlerer Rücken',        0),
  ('ex_hyperextension',      'Rückenstrecker (Hyperext.)', 'Rücken',   'Erector spinae',          0),

  -- Beine
  ('ex_kniebeugen',          'Kniebeugen (Langhantel)',    'Beine',    'Quadrizeps, Glutes',      0),
  ('ex_beinpresse',          'Beinpresse',                 'Beine',    'Quadrizeps',              0),
  ('ex_ausfallschritte',     'Ausfallschritte',            'Beine',    'Quadrizeps, Glutes',      0),
  ('ex_beinstrecker',        'Beinstrecker',               'Beine',    'Quadrizeps',              0),
  ('ex_beinbeuger',          'Beinbeuger',                 'Beine',    'Hamstrings',              0),
  ('ex_wadenheben',          'Wadenheben stehend',         'Beine',    'Gastrocnemius',           0),
  ('ex_rumaenisches_kh',     'Rumänisches Kreuzheben',     'Beine',    'Hamstrings, Glutes',      0),

  -- Schultern
  ('ex_schulterdruecken',    'Schulterdrücken (Langh.)',   'Schultern','Deltoideus anterior',     0),
  ('ex_seitheben',           'Seitheben (Kurzhantel)',     'Schultern','Deltoideus lateralis',    0),
  ('ex_face_pulls',          'Face Pulls',                 'Schultern','Deltoideus posterior',    0),
  ('ex_frontheben',          'Frontheben',                 'Schultern','Deltoideus anterior',     0),

  -- Arme
  ('ex_bizeps_curls',        'Bizeps-Curls (Langhantel)',  'Arme',     'Biceps brachii',          0),
  ('ex_hammer_curls',        'Hammer Curls',               'Arme',     'Brachialis, Brachiorad.', 0),
  ('ex_trizepsdruecken',     'Trizepsdrücken am Kabel',    'Arme',     'Triceps brachii',         0),
  ('ex_dips',                'Dips',                       'Arme',     'Trizeps, Brust',          0),

  -- Rumpf
  ('ex_plank',               'Plank (Unterarmstütz)',      'Rumpf',    'Rumpfstabilisation',      0),
  ('ex_crunches',            'Crunches',                   'Rumpf',    'Rectus abdominis',        0),
  ('ex_beinheben',           'Beinheben hängend',          'Rumpf',    'Unterer Bauch',           0),
  ('ex_russian_twists',      'Russian Twists',             'Rumpf',    'Obliquus',                0),

  -- Cardio
  ('ex_rudergeraet',         'Rudergerät',                 'Cardio',   'Ganzkörper',              0),
  ('ex_laufband',            'Laufband',                   'Cardio',   'Ausdauer',                0);
