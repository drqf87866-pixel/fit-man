-- ---------------------------------------------------------------------------
-- Seed Data: Standard-Übungsbibliothek (is_custom = 0)
-- Idempotent: kann mehrfach ausgeführt werden, ohne Duplikate zu erzeugen.
--
--   wrangler d1 execute fit-man-db --local  --file=./seed.sql
--   wrangler d1 execute fit-man-db --remote --file=./seed.sql
--
-- Enthält Push/Pull- und Equipment-Tags. Ein UPDATE-Block versorgt auch
-- bereits vorhandene Zeilen aus früheren Seeds.
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO exercises (id, name, category, target_muscle, is_custom, movement, equipment) VALUES
  -- Brust
  ('ex_bankdruecken',        'Bankdrücken (Langhantel)',   'Brust',    'Pectoralis major',        0, 'push', 'freihantel'),
  ('ex_schraegbankdruecken', 'Schrägbankdrücken (KH)',     'Brust',    'Obere Brust',             0, 'push', 'freihantel'),
  ('ex_butterfly',           'Butterfly / Cable Fly',      'Brust',    'Pectoralis major',        0, 'push', 'maschine'),
  ('ex_liegestuetze',        'Liegestütze',                'Brust',    'Brust, Trizeps',          0, 'push', 'koerpergewicht'),

  -- Rücken
  ('ex_klimmzuege',          'Klimmzüge',                  'Rücken',   'Latissimus dorsi',        0, 'pull', 'koerpergewicht'),
  ('ex_latzug',              'Latzug zur Brust',           'Rücken',   'Latissimus dorsi',        0, 'pull', 'maschine'),
  ('ex_langhantelrudern',    'Langhantelrudern',           'Rücken',   'Latissimus, Rhomboiden',  0, 'pull', 'freihantel'),
  ('ex_kreuzheben',          'Kreuzheben',                 'Rücken',   'Rückenstrecker, Glutes',  0, 'pull', 'freihantel'),
  ('ex_kabelrudern',         'Kabelrudern sitzend',        'Rücken',   'Mittlerer Rücken',        0, 'pull', 'maschine'),
  ('ex_hyperextension',      'Rückenstrecker (Hyperext.)', 'Rücken',   'Erector spinae',          0, 'pull', 'maschine'),

  -- Beine
  ('ex_kniebeugen',          'Kniebeugen (Langhantel)',    'Beine',    'Quadrizeps, Glutes',      0, '', 'freihantel'),
  ('ex_beinpresse',          'Beinpresse',                 'Beine',    'Quadrizeps',              0, '', 'maschine'),
  ('ex_ausfallschritte',     'Ausfallschritte',            'Beine',    'Quadrizeps, Glutes',      0, '', 'koerpergewicht'),
  ('ex_beinstrecker',        'Beinstrecker',               'Beine',    'Quadrizeps',              0, '', 'maschine'),
  ('ex_beinbeuger',          'Beinbeuger',                 'Beine',    'Hamstrings',              0, '', 'maschine'),
  ('ex_wadenheben',          'Wadenheben stehend',         'Beine',    'Gastrocnemius',           0, '', 'freihantel'),
  ('ex_rumaenisches_kh',     'Rumänisches Kreuzheben',     'Beine',    'Hamstrings, Glutes',      0, '', 'freihantel'),

  -- Schultern
  ('ex_schulterdruecken',    'Schulterdrücken (Langh.)',   'Schultern','Deltoideus anterior',     0, 'push', 'freihantel'),
  ('ex_seitheben',           'Seitheben (Kurzhantel)',     'Schultern','Deltoideus lateralis',    0, 'push', 'freihantel'),
  ('ex_face_pulls',          'Face Pulls',                 'Schultern','Deltoideus posterior',    0, 'pull', 'maschine'),
  ('ex_frontheben',          'Frontheben',                 'Schultern','Deltoideus anterior',     0, 'push', 'freihantel'),

  -- Arme
  ('ex_bizeps_curls',        'Bizeps-Curls (Langhantel)',  'Arme',     'Biceps brachii',          0, 'pull', 'freihantel'),
  ('ex_hammer_curls',        'Hammer Curls',               'Arme',     'Brachialis, Brachiorad.', 0, 'pull', 'freihantel'),
  ('ex_trizepsdruecken',     'Trizepsdrücken am Kabel',    'Arme',     'Triceps brachii',         0, 'push', 'maschine'),
  ('ex_dips',                'Dips',                       'Arme',     'Trizeps, Brust',          0, 'push', 'koerpergewicht'),

  -- Rumpf
  ('ex_plank',               'Plank (Unterarmstütz)',      'Rumpf',    'Rumpfstabilisation',      0, '', 'koerpergewicht'),
  ('ex_crunches',            'Crunches',                   'Rumpf',    'Rectus abdominis',        0, '', 'koerpergewicht'),
  ('ex_beinheben',           'Beinheben hängend',          'Rumpf',    'Unterer Bauch',           0, '', 'koerpergewicht'),
  ('ex_russian_twists',      'Russian Twists',             'Rumpf',    'Obliquus',                0, '', 'koerpergewicht'),

  -- Cardio
  ('ex_rudergeraet',         'Rudergerät',                 'Cardio',   'Ganzkörper',              0, '', 'maschine'),
  ('ex_laufband',            'Laufband',                   'Cardio',   'Ausdauer',                0, '', 'maschine');

-- ---------------------------------------------------------------------------
-- Nachträgliche Tags für bereits existierende Zeilen (idempotenter Update)
-- ---------------------------------------------------------------------------
UPDATE exercises
SET movement = CASE id
    WHEN 'ex_bankdruecken' THEN 'push'
    WHEN 'ex_schraegbankdruecken' THEN 'push'
    WHEN 'ex_butterfly' THEN 'push'
    WHEN 'ex_liegestuetze' THEN 'push'
    WHEN 'ex_klimmzuege' THEN 'pull'
    WHEN 'ex_latzug' THEN 'pull'
    WHEN 'ex_langhantelrudern' THEN 'pull'
    WHEN 'ex_kreuzheben' THEN 'pull'
    WHEN 'ex_kabelrudern' THEN 'pull'
    WHEN 'ex_hyperextension' THEN 'pull'
    WHEN 'ex_kniebeugen' THEN ''
    WHEN 'ex_beinpresse' THEN ''
    WHEN 'ex_ausfallschritte' THEN ''
    WHEN 'ex_beinstrecker' THEN ''
    WHEN 'ex_beinbeuger' THEN ''
    WHEN 'ex_wadenheben' THEN ''
    WHEN 'ex_rumaenisches_kh' THEN ''
    WHEN 'ex_schulterdruecken' THEN 'push'
    WHEN 'ex_seitheben' THEN 'push'
    WHEN 'ex_face_pulls' THEN 'pull'
    WHEN 'ex_frontheben' THEN 'push'
    WHEN 'ex_bizeps_curls' THEN 'pull'
    WHEN 'ex_hammer_curls' THEN 'pull'
    WHEN 'ex_trizepsdruecken' THEN 'push'
    WHEN 'ex_dips' THEN 'push'
    WHEN 'ex_plank' THEN ''
    WHEN 'ex_crunches' THEN ''
    WHEN 'ex_beinheben' THEN ''
    WHEN 'ex_russian_twists' THEN ''
    WHEN 'ex_rudergeraet' THEN ''
    WHEN 'ex_laufband' THEN ''
END,
    equipment = CASE id
    WHEN 'ex_bankdruecken' THEN 'freihantel'
    WHEN 'ex_schraegbankdruecken' THEN 'freihantel'
    WHEN 'ex_butterfly' THEN 'maschine'
    WHEN 'ex_liegestuetze' THEN 'koerpergewicht'
    WHEN 'ex_klimmzuege' THEN 'koerpergewicht'
    WHEN 'ex_latzug' THEN 'maschine'
    WHEN 'ex_langhantelrudern' THEN 'freihantel'
    WHEN 'ex_kreuzheben' THEN 'freihantel'
    WHEN 'ex_kabelrudern' THEN 'maschine'
    WHEN 'ex_hyperextension' THEN 'maschine'
    WHEN 'ex_kniebeugen' THEN 'freihantel'
    WHEN 'ex_beinpresse' THEN 'maschine'
    WHEN 'ex_ausfallschritte' THEN 'koerpergewicht'
    WHEN 'ex_beinstrecker' THEN 'maschine'
    WHEN 'ex_beinbeuger' THEN 'maschine'
    WHEN 'ex_wadenheben' THEN 'freihantel'
    WHEN 'ex_rumaenisches_kh' THEN 'freihantel'
    WHEN 'ex_schulterdruecken' THEN 'freihantel'
    WHEN 'ex_seitheben' THEN 'freihantel'
    WHEN 'ex_face_pulls' THEN 'maschine'
    WHEN 'ex_frontheben' THEN 'freihantel'
    WHEN 'ex_bizeps_curls' THEN 'freihantel'
    WHEN 'ex_hammer_curls' THEN 'freihantel'
    WHEN 'ex_trizepsdruecken' THEN 'maschine'
    WHEN 'ex_dips' THEN 'koerpergewicht'
    WHEN 'ex_plank' THEN 'koerpergewicht'
    WHEN 'ex_crunches' THEN 'koerpergewicht'
    WHEN 'ex_beinheben' THEN 'koerpergewicht'
    WHEN 'ex_russian_twists' THEN 'koerpergewicht'
    WHEN 'ex_rudergeraet' THEN 'maschine'
    WHEN 'ex_laufband' THEN 'maschine'
END
WHERE id IN (
    'ex_bankdruecken',
    'ex_schraegbankdruecken',
    'ex_butterfly',
    'ex_liegestuetze',
    'ex_klimmzuege',
    'ex_latzug',
    'ex_langhantelrudern',
    'ex_kreuzheben',
    'ex_kabelrudern',
    'ex_hyperextension',
    'ex_kniebeugen',
    'ex_beinpresse',
    'ex_ausfallschritte',
    'ex_beinstrecker',
    'ex_beinbeuger',
    'ex_wadenheben',
    'ex_rumaenisches_kh',
    'ex_schulterdruecken',
    'ex_seitheben',
    'ex_face_pulls',
    'ex_frontheben',
    'ex_bizeps_curls',
    'ex_hammer_curls',
    'ex_trizepsdruecken',
    'ex_dips',
    'ex_plank',
    'ex_crunches',
    'ex_beinheben',
    'ex_russian_twists',
    'ex_rudergeraet',
    'ex_laufband'
);
