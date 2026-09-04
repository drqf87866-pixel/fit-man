-- ---------------------------------------------------------------------------
-- Seed Data: Standard-Übungsbibliothek (is_custom = 0)
--
--   wrangler d1 execute fit-man-db --local  --file=./seed.sql
--   wrangler d1 execute fit-man-db --remote --file=./seed.sql
--
-- Idempotent per UPSERT: neue Übungen werden angelegt, bereits vorhandene auf
-- den Stand dieser Datei gebracht. Dadurch steht jede Übung genau EINMAL in
-- dieser Datei – ein separater UPDATE-Block für nachträglich ergänzte Spalten
-- (und das damit verbundene Auseinanderlaufen) entfällt.
--
-- `is_custom` wird bewusst NICHT überschrieben: eigene Übungen der App tragen
-- IDs der Form ex_<uuid> und können mit diesen Slugs ohnehin nicht kollidieren.
-- ---------------------------------------------------------------------------

INSERT INTO exercises (id, name, category, target_muscle, is_custom, movement, equipment) VALUES
  -- Brust
  ('ex_bankdruecken'       , 'Bankdrücken (Langhantel)'    , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'freihantel'),
  ('ex_schraegbankdruecken', 'Schrägbankdrücken (KH)'      , 'Brust'    , 'Obere Brust'                   , 0, 'push'  , 'freihantel'),
  ('ex_butterfly'          , 'Butterfly / Cable Fly'       , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'maschine'),
  ('ex_liegestuetze'       , 'Liegestütze'                 , 'Brust'    , 'Brust, Trizeps'                , 0, 'push'  , 'koerpergewicht'),
  ('ex_kh_bankdruecken'    , 'Bankdrücken (Kurzhantel)'    , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'freihantel'),
  ('ex_brustpresse'        , 'Brustpresse (Maschine)'      , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'maschine'),
  ('ex_negativbankdruecken', 'Negativbankdrücken'          , 'Brust'    , 'Untere Brust'                  , 0, 'push'  , 'freihantel'),

  -- Rücken
  ('ex_klimmzuege'         , 'Klimmzüge'                   , 'Rücken'   , 'Latissimus dorsi'              , 0, 'pull'  , 'koerpergewicht'),
  ('ex_latzug'             , 'Latzug zur Brust'            , 'Rücken'   , 'Latissimus dorsi'              , 0, 'pull'  , 'maschine'),
  ('ex_langhantelrudern'   , 'Langhantelrudern'            , 'Rücken'   , 'Latissimus, Rhomboiden'        , 0, 'pull'  , 'freihantel'),
  ('ex_kreuzheben'         , 'Kreuzheben'                  , 'Rücken'   , 'Rückenstrecker, Glutes'        , 0, 'pull'  , 'freihantel'),
  ('ex_kabelrudern'        , 'Kabelrudern sitzend'         , 'Rücken'   , 'Mittlerer Rücken'              , 0, 'pull'  , 'maschine'),
  ('ex_hyperextension'     , 'Rückenstrecker (Hyperext.)'  , 'Rücken'   , 'Erector spinae'                , 0, 'pull'  , 'maschine'),
  ('ex_kh_rudern'          , 'Kurzhantelrudern einarmig'   , 'Rücken'   , 'Latissimus dorsi'              , 0, 'pull'  , 'freihantel'),
  ('ex_tbar_rudern'        , 'T-Bar-Rudern'                , 'Rücken'   , 'Mittlerer Rücken'              , 0, 'pull'  , 'freihantel'),
  ('ex_maschinenrudern'    , 'Rudern an der Maschine'      , 'Rücken'   , 'Latissimus, Rhomboiden'        , 0, 'pull'  , 'maschine'),
  ('ex_shrugs'             , 'Shrugs (Nackenheben)'        , 'Rücken'   , 'Trapezius'                     , 0, 'pull'  , 'freihantel'),

  -- Beine
  ('ex_kniebeugen'         , 'Kniebeugen (Langhantel)'     , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'freihantel'),
  ('ex_beinpresse'         , 'Beinpresse'                  , 'Beine'    , 'Quadrizeps'                    , 0, 'push'  , 'maschine'),
  ('ex_ausfallschritte'    , 'Ausfallschritte'             , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'koerpergewicht'),
  ('ex_beinstrecker'       , 'Beinstrecker'                , 'Beine'    , 'Quadrizeps'                    , 0, 'push'  , 'maschine'),
  ('ex_beinbeuger'         , 'Beinbeuger'                  , 'Beine'    , 'Hamstrings'                    , 0, 'pull'  , 'maschine'),
  ('ex_wadenheben'         , 'Wadenheben stehend'          , 'Beine'    , 'Gastrocnemius'                 , 0, 'push'  , 'freihantel'),
  ('ex_rumaenisches_kh'    , 'Rumänisches Kreuzheben'      , 'Beine'    , 'Hamstrings, Glutes'            , 0, 'pull'  , 'freihantel'),
  ('ex_frontkniebeugen'    , 'Frontkniebeugen'             , 'Beine'    , 'Quadrizeps'                    , 0, 'push'  , 'freihantel'),
  ('ex_bulgarian_split'    , 'Bulgarian Split Squat'       , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'koerpergewicht'),
  ('ex_goblet_squat'       , 'Goblet Squat'                , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'freihantel'),
  ('ex_hip_thrust'         , 'Hip Thrust'                  , 'Beine'    , 'Gluteus maximus'               , 0, 'pull'  , 'freihantel'),
  ('ex_wadenheben_sitzend' , 'Wadenheben sitzend'          , 'Beine'    , 'Soleus'                        , 0, 'push'  , 'maschine'),

  -- Schultern
  ('ex_schulterdruecken'   , 'Schulterdrücken (Langh.)'    , 'Schultern', 'Deltoideus anterior'           , 0, 'push'  , 'freihantel'),
  ('ex_seitheben'          , 'Seitheben (Kurzhantel)'      , 'Schultern', 'Deltoideus lateralis'          , 0, 'push'  , 'freihantel'),
  ('ex_face_pulls'         , 'Face Pulls'                  , 'Schultern', 'Deltoideus posterior'          , 0, 'pull'  , 'maschine'),
  ('ex_frontheben'         , 'Frontheben'                  , 'Schultern', 'Deltoideus anterior'           , 0, 'push'  , 'freihantel'),
  ('ex_kh_schulterdruecken', 'Schulterdrücken (Kurzhantel)', 'Schultern', 'Deltoideus anterior'           , 0, 'push'  , 'freihantel'),
  ('ex_arnold_press'       , 'Arnold Press'                , 'Schultern', 'Deltoideus anterior, lateralis', 0, 'push'  , 'freihantel'),
  ('ex_reverse_butterfly'  , 'Reverse Butterfly'           , 'Schultern', 'Deltoideus posterior'          , 0, 'pull'  , 'maschine'),

  -- Arme
  ('ex_bizeps_curls'       , 'Bizeps-Curls (Langhantel)'   , 'Arme'     , 'Biceps brachii'                , 0, 'pull'  , 'freihantel'),
  ('ex_hammer_curls'       , 'Hammer Curls'                , 'Arme'     , 'Brachialis, Brachiorad.'       , 0, 'pull'  , 'freihantel'),
  ('ex_trizepsdruecken'    , 'Trizepsdrücken am Kabel'     , 'Arme'     , 'Triceps brachii'               , 0, 'push'  , 'maschine'),
  ('ex_dips'               , 'Dips'                        , 'Arme'     , 'Trizeps, Brust'                , 0, 'push'  , 'koerpergewicht'),
  ('ex_kh_bizeps_curls'    , 'Bizeps-Curls (Kurzhantel)'   , 'Arme'     , 'Bizeps brachii'                , 0, 'pull'  , 'freihantel'),
  ('ex_scott_curls'        , 'Scott-Curls (SZ-Stange)'     , 'Arme'     , 'Bizeps brachii'                , 0, 'pull'  , 'freihantel'),
  ('ex_stirndruecken'      , 'Stirndrücken (SZ-Stange)'    , 'Arme'     , 'Trizeps brachii'               , 0, 'push'  , 'freihantel'),
  ('ex_enges_bankdruecken' , 'Enges Bankdrücken'           , 'Arme'     , 'Trizeps brachii'               , 0, 'push'  , 'freihantel'),

  -- Rumpf
  ('ex_plank'              , 'Plank (Unterarmstütz)'       , 'Rumpf'    , 'Rumpfstabilisation'            , 0, 'core'  , 'koerpergewicht'),
  ('ex_crunches'           , 'Crunches'                    , 'Rumpf'    , 'Rectus abdominis'              , 0, 'core'  , 'koerpergewicht'),
  ('ex_beinheben'          , 'Beinheben hängend'           , 'Rumpf'    , 'Unterer Bauch'                 , 0, 'pull'  , 'koerpergewicht'),
  ('ex_russian_twists'     , 'Russian Twists'              , 'Rumpf'    , 'Obliquus'                      , 0, 'core'  , 'koerpergewicht'),
  ('ex_cable_crunch'       , 'Crunches am Kabelzug'        , 'Rumpf'    , 'Rectus abdominis'              , 0, 'core'  , 'maschine'),
  ('ex_side_plank'         , 'Seitstütz (Side Plank)'      , 'Rumpf'    , 'Obliquus'                      , 0, 'core'  , 'koerpergewicht'),
  ('ex_ab_wheel'           , 'Bauchroller (Ab Wheel)'      , 'Rumpf'    , 'Rectus abdominis'              , 0, 'core'  , 'koerpergewicht'),

  -- Cardio
  ('ex_rudergeraet'        , 'Rudergerät'                  , 'Cardio'   , 'Ganzkörper'                    , 0, 'pull'  , 'maschine'),
  ('ex_laufband'           , 'Laufband'                    , 'Cardio'   , 'Ausdauer'                      , 0, 'cardio', 'maschine'),
  ('ex_crosstrainer'       , 'Crosstrainer'                , 'Cardio'   , 'Ganzkörper'                    , 0, 'cardio', 'maschine'),
  ('ex_ergometer'          , 'Fahrradergometer'            , 'Cardio'   , 'Ausdauer'                      , 0, 'cardio', 'maschine'),
  ('ex_seilspringen'       , 'Seilspringen'                , 'Cardio'   , 'Ausdauer, Waden'               , 0, 'cardio', 'koerpergewicht')
ON CONFLICT(id) DO UPDATE SET
  name          = excluded.name,
  category      = excluded.category,
  target_muscle = excluded.target_muscle,
  movement      = excluded.movement,
  equipment     = excluded.equipment;
