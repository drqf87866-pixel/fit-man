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

INSERT INTO exercises (id, name, category, target_muscle, is_custom, movement, equipment, image) VALUES
  -- Brust
  ('ex_bankdruecken'       , 'Bankdrücken (Langhantel)'    , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'freihantel'    , 'Barbell_Bench_Press_-_Medium_Grip'),
  ('ex_schraegbankdruecken', 'Schrägbankdrücken (KH)'      , 'Brust'    , 'Obere Brust'                   , 0, 'push'  , 'freihantel'    , 'Incline_Dumbbell_Press'),
  ('ex_butterfly'          , 'Butterfly / Cable Fly'       , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'maschine'      , 'Butterfly'),
  ('ex_liegestuetze'       , 'Liegestütze'                 , 'Brust'    , 'Brust, Trizeps'                , 0, 'push'  , 'koerpergewicht', 'Pushups'),
  ('ex_kh_bankdruecken'    , 'Bankdrücken (Kurzhantel)'    , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'freihantel'    , 'Dumbbell_Bench_Press'),
  ('ex_brustpresse'        , 'Brustpresse (Maschine)'      , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'maschine'      , 'Leverage_Chest_Press'),
  ('ex_negativbankdruecken', 'Negativbankdrücken'          , 'Brust'    , 'Untere Brust'                  , 0, 'push'  , 'freihantel'    , 'Decline_Barbell_Bench_Press'),

  -- Rücken
  ('ex_klimmzuege'         , 'Klimmzüge'                   , 'Rücken'   , 'Latissimus dorsi'              , 0, 'pull'  , 'koerpergewicht', 'Pullups'),
  ('ex_latzug'             , 'Latzug zur Brust'            , 'Rücken'   , 'Latissimus dorsi'              , 0, 'pull'  , 'maschine'      , 'Wide-Grip_Lat_Pulldown'),
  ('ex_langhantelrudern'   , 'Langhantelrudern'            , 'Rücken'   , 'Latissimus, Rhomboiden'        , 0, 'pull'  , 'freihantel'    , 'Bent_Over_Barbell_Row'),
  ('ex_kreuzheben'         , 'Kreuzheben'                  , 'Rücken'   , 'Rückenstrecker, Glutes'        , 0, 'pull'  , 'freihantel'    , 'Barbell_Deadlift'),
  ('ex_kabelrudern'        , 'Kabelrudern sitzend'         , 'Rücken'   , 'Mittlerer Rücken'              , 0, 'pull'  , 'maschine'      , 'Seated_Cable_Rows'),
  ('ex_hyperextension'     , 'Rückenstrecker (Hyperext.)'  , 'Rücken'   , 'Erector spinae'                , 0, 'pull'  , 'maschine'      , 'Hyperextensions_Back_Extensions'),
  ('ex_kh_rudern'          , 'Kurzhantelrudern einarmig'   , 'Rücken'   , 'Latissimus dorsi'              , 0, 'pull'  , 'freihantel'    , 'One-Arm_Dumbbell_Row'),
  ('ex_tbar_rudern'        , 'T-Bar-Rudern'                , 'Rücken'   , 'Mittlerer Rücken'              , 0, 'pull'  , 'freihantel'    , 'T-Bar_Row_with_Handle'),
  ('ex_maschinenrudern'    , 'Rudern an der Maschine'      , 'Rücken'   , 'Latissimus, Rhomboiden'        , 0, 'pull'  , 'maschine'      , 'Leverage_High_Row'),
  ('ex_shrugs'             , 'Shrugs (Nackenheben)'        , 'Rücken'   , 'Trapezius'                     , 0, 'pull'  , 'freihantel'    , 'Barbell_Shrug'),

  -- Beine
  ('ex_kniebeugen'         , 'Kniebeugen (Langhantel)'     , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'freihantel'    , 'Barbell_Full_Squat'),
  ('ex_beinpresse'         , 'Beinpresse'                  , 'Beine'    , 'Quadrizeps'                    , 0, 'push'  , 'maschine'      , 'Leg_Press'),
  ('ex_ausfallschritte'    , 'Ausfallschritte'             , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'koerpergewicht', 'Bodyweight_Walking_Lunge'),
  ('ex_beinstrecker'       , 'Beinstrecker'                , 'Beine'    , 'Quadrizeps'                    , 0, 'push'  , 'maschine'      , 'Leg_Extensions'),
  ('ex_beinbeuger'         , 'Beinbeuger'                  , 'Beine'    , 'Hamstrings'                    , 0, 'pull'  , 'maschine'      , 'Lying_Leg_Curls'),
  ('ex_wadenheben'         , 'Wadenheben stehend'          , 'Beine'    , 'Gastrocnemius'                 , 0, 'push'  , 'freihantel'    , 'Standing_Calf_Raises'),
  ('ex_rumaenisches_kh'    , 'Rumänisches Kreuzheben'      , 'Beine'    , 'Hamstrings, Glutes'            , 0, 'pull'  , 'freihantel'    , 'Romanian_Deadlift'),
  ('ex_frontkniebeugen'    , 'Frontkniebeugen'             , 'Beine'    , 'Quadrizeps'                    , 0, 'push'  , 'freihantel'    , 'Front_Barbell_Squat'),
  ('ex_bulgarian_split'    , 'Bulgarian Split Squat'       , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'koerpergewicht', 'Split_Squat_with_Dumbbells'),
  ('ex_goblet_squat'       , 'Goblet Squat'                , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'freihantel'    , 'Goblet_Squat'),
  ('ex_hip_thrust'         , 'Hip Thrust'                  , 'Beine'    , 'Gluteus maximus'               , 0, 'pull'  , 'freihantel'    , 'Barbell_Hip_Thrust'),
  ('ex_wadenheben_sitzend' , 'Wadenheben sitzend'          , 'Beine'    , 'Soleus'                        , 0, 'push'  , 'maschine'      , 'Seated_Calf_Raise'),

  -- Schultern
  ('ex_schulterdruecken'   , 'Schulterdrücken (Langh.)'    , 'Schultern', 'Deltoideus anterior'           , 0, 'push'  , 'freihantel'    , 'Barbell_Shoulder_Press'),
  ('ex_seitheben'          , 'Seitheben (Kurzhantel)'      , 'Schultern', 'Deltoideus lateralis'          , 0, 'push'  , 'freihantel'    , 'Side_Lateral_Raise'),
  ('ex_face_pulls'         , 'Face Pulls'                  , 'Schultern', 'Deltoideus posterior'          , 0, 'pull'  , 'maschine'      , 'Face_Pull'),
  ('ex_frontheben'         , 'Frontheben'                  , 'Schultern', 'Deltoideus anterior'           , 0, 'push'  , 'freihantel'    , 'Front_Dumbbell_Raise'),
  ('ex_kh_schulterdruecken', 'Schulterdrücken (Kurzhantel)', 'Schultern', 'Deltoideus anterior'           , 0, 'push'  , 'freihantel'    , 'Dumbbell_Shoulder_Press'),
  ('ex_arnold_press'       , 'Arnold Press'                , 'Schultern', 'Deltoideus anterior, lateralis', 0, 'push'  , 'freihantel'    , 'Arnold_Dumbbell_Press'),
  ('ex_reverse_butterfly'  , 'Reverse Butterfly'           , 'Schultern', 'Deltoideus posterior'          , 0, 'pull'  , 'maschine'      , 'Reverse_Machine_Flyes'),

  -- Arme
  ('ex_bizeps_curls'       , 'Bizeps-Curls (Langhantel)'   , 'Arme'     , 'Biceps brachii'                , 0, 'pull'  , 'freihantel'    , 'Barbell_Curl'),
  ('ex_hammer_curls'       , 'Hammer Curls'                , 'Arme'     , 'Brachialis, Brachiorad.'       , 0, 'pull'  , 'freihantel'    , 'Hammer_Curls'),
  ('ex_trizepsdruecken'    , 'Trizepsdrücken am Kabel'     , 'Arme'     , 'Triceps brachii'               , 0, 'push'  , 'maschine'      , 'Triceps_Pushdown'),
  ('ex_dips'               , 'Dips'                        , 'Arme'     , 'Trizeps, Brust'                , 0, 'push'  , 'koerpergewicht', 'Dips_-_Triceps_Version'),
  ('ex_kh_bizeps_curls'    , 'Bizeps-Curls (Kurzhantel)'   , 'Arme'     , 'Bizeps brachii'                , 0, 'pull'  , 'freihantel'    , 'Dumbbell_Bicep_Curl'),
  ('ex_scott_curls'        , 'Scott-Curls (SZ-Stange)'     , 'Arme'     , 'Bizeps brachii'                , 0, 'pull'  , 'freihantel'    , 'Preacher_Curl'),
  ('ex_stirndruecken'      , 'Stirndrücken (SZ-Stange)'    , 'Arme'     , 'Trizeps brachii'               , 0, 'push'  , 'freihantel'    , 'EZ-Bar_Skullcrusher'),
  ('ex_enges_bankdruecken' , 'Enges Bankdrücken'           , 'Arme'     , 'Trizeps brachii'               , 0, 'push'  , 'freihantel'    , 'Close-Grip_Barbell_Bench_Press'),

  -- Rumpf
  ('ex_plank'              , 'Plank (Unterarmstütz)'       , 'Rumpf'    , 'Rumpfstabilisation'            , 0, 'core'  , 'koerpergewicht', 'Plank'),
  ('ex_crunches'           , 'Crunches'                    , 'Rumpf'    , 'Rectus abdominis'              , 0, 'core'  , 'koerpergewicht', 'Crunches'),
  ('ex_beinheben'          , 'Beinheben hängend'           , 'Rumpf'    , 'Unterer Bauch'                 , 0, 'pull'  , 'koerpergewicht', 'Hanging_Leg_Raise'),
  ('ex_russian_twists'     , 'Russian Twists'              , 'Rumpf'    , 'Obliquus'                      , 0, 'core'  , 'koerpergewicht', 'Russian_Twist'),
  ('ex_cable_crunch'       , 'Crunches am Kabelzug'        , 'Rumpf'    , 'Rectus abdominis'              , 0, 'core'  , 'maschine'      , 'Cable_Crunch'),
  ('ex_side_plank'         , 'Seitstütz (Side Plank)'      , 'Rumpf'    , 'Obliquus'                      , 0, 'core'  , 'koerpergewicht', 'Side_Bridge'),
  ('ex_ab_wheel'           , 'Bauchroller (Ab Wheel)'      , 'Rumpf'    , 'Rectus abdominis'              , 0, 'core'  , 'koerpergewicht', 'Ab_Roller'),

  -- Cardio
  ('ex_rudergeraet'        , 'Rudergerät'                  , 'Cardio'   , 'Ganzkörper'                    , 0, 'pull'  , 'maschine'      , 'Rowing_Stationary'),
  ('ex_laufband'           , 'Laufband'                    , 'Cardio'   , 'Ausdauer'                      , 0, 'cardio', 'maschine'      , 'Running_Treadmill'),
  ('ex_crosstrainer'       , 'Crosstrainer'                , 'Cardio'   , 'Ganzkörper'                    , 0, 'cardio', 'maschine'      , 'Elliptical_Trainer'),
  ('ex_ergometer'          , 'Fahrradergometer'            , 'Cardio'   , 'Ausdauer'                      , 0, 'cardio', 'maschine'      , 'Bicycling_Stationary'),
  ('ex_seilspringen'       , 'Seilspringen'                , 'Cardio'   , 'Ausdauer, Waden'               , 0, 'cardio', 'koerpergewicht', 'Rope_Jumping')
ON CONFLICT(id) DO UPDATE SET
  name          = excluded.name,
  category      = excluded.category,
  target_muscle = excluded.target_muscle,
  movement      = excluded.movement,
  equipment     = excluded.equipment,
  image         = excluded.image;
