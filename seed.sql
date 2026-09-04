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

INSERT INTO exercises (id, name, category, target_muscle, is_custom, movement, equipment, image, description) VALUES
  -- Brust
  ('ex_bankdruecken'       , 'Bankdrücken (Langhantel)'    , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'freihantel'    , 'Barbell_Bench_Press_-_Medium_Grip',
   'Flach auf der Bank liegend die Langhantel schulterbreit bis leicht darüber greifen und kontrolliert zur Brustmitte absenken. Aus dem unteren Punkt kraftvoll nach oben drücken, ohne die Ellenbogen ganz durchzustrecken. Die Schulterblätter bleiben die ganze Zeit zusammengezogen und die Füße fest am Boden.'),
  ('ex_schraegbankdruecken', 'Schrägbankdrücken (KH)'      , 'Brust'    , 'Obere Brust'                   , 0, 'push'  , 'freihantel'    , 'Incline_Dumbbell_Press',
   'Auf der 30-45° geneigten Bank die Kurzhanteln auf Brusthöhe halten und nach oben zusammenführen. Je steiler die Bank, desto stärker arbeitet die vordere Schulter statt der oberen Brust. Die Hanteln unten nur so weit absenken, wie die Schulter schmerzfrei mitgeht.'),
  ('ex_butterfly'          , 'Butterfly / Cable Fly'       , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'maschine'      , 'Butterfly',
   'Mit leicht gebeugten Ellenbogen die Arme auf Brusthöhe vor dem Körper zusammenführen und die Brust dabei bewusst zusammenziehen. Die Bewegung kommt allein aus dem Schultergelenk, der Ellenbogenwinkel bleibt konstant. Am Endpunkt kurz halten und langsam zurückführen.'),
  ('ex_liegestuetze'       , 'Liegestütze'                 , 'Brust'    , 'Brust, Trizeps'                , 0, 'push'  , 'koerpergewicht', 'Pushups',
   'Hände etwas breiter als schulterbreit, Körper von Kopf bis Ferse in einer Linie. Den Körper absenken, bis die Brust knapp über dem Boden ist, dann nach oben drücken. Bauch und Gesäß anspannen, damit das Becken nicht durchhängt.'),
  ('ex_kh_bankdruecken'    , 'Bankdrücken (Kurzhantel)'    , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'freihantel'    , 'Dumbbell_Bench_Press',
   'Wie beim Langhantel-Bankdrücken, aber mit zwei Kurzhanteln – dadurch größerer Bewegungsradius und beide Seiten müssen gleich viel leisten. Die Hanteln auf Brusthöhe absenken und nach oben leicht zusammenführen. Gut geeignet, um Seitenunterschiede auszugleichen.'),
  ('ex_brustpresse'        , 'Brustpresse (Maschine)'      , 'Brust'    , 'Pectoralis major'              , 0, 'push'  , 'maschine'      , 'Leverage_Chest_Press',
   'An der Maschine sitzend die Griffe auf Brusthöhe nach vorn drücken und kontrolliert zurückführen. Die geführte Bewegung macht die Übung anfängerfreundlich und erlaubt sicheres Training bis nah ans Muskelversagen. Sitzhöhe so einstellen, dass die Griffe auf Höhe der Brustmitte liegen.'),
  ('ex_negativbankdruecken', 'Negativbankdrücken'          , 'Brust'    , 'Untere Brust'                  , 0, 'push'  , 'freihantel'    , 'Decline_Barbell_Bench_Press',
   'Auf der negativ geneigten Bank die Hantel zum unteren Brustbereich absenken und nach oben drücken. Der Fokus liegt auf der unteren Brust, die Schulter wird weniger belastet als beim Schrägbankdrücken. Wegen der Kopftieflage nur mit Partner oder Ablage arbeiten.'),

  -- Rücken
  ('ex_klimmzuege'         , 'Klimmzüge'                   , 'Rücken'   , 'Latissimus dorsi'              , 0, 'pull'  , 'koerpergewicht', 'Pullups',
   'An der Stange hängend im Obergriff den Körper nach oben ziehen, bis das Kinn über die Stange kommt. Die Bewegung startet mit dem Herunterziehen der Schulterblätter, nicht mit den Armen. Kontrolliert bis zur fast gestreckten Position ablassen, ohne zu schwingen.'),
  ('ex_latzug'             , 'Latzug zur Brust'            , 'Rücken'   , 'Latissimus dorsi'              , 0, 'pull'  , 'maschine'      , 'Wide-Grip_Lat_Pulldown',
   'Im breiten Obergriff die Stange zur oberen Brust ziehen und dabei die Ellenbogen nach unten-hinten führen. Der Oberkörper bleibt aufrecht bis leicht zurückgelehnt, das Gewicht wird nicht durch Schwung geholt. Oben die Arme langsam ausstrecken und die Dehnung im Latissimus zulassen.'),
  ('ex_langhantelrudern'   , 'Langhantelrudern'            , 'Rücken'   , 'Latissimus, Rhomboiden'        , 0, 'pull'  , 'freihantel'    , 'Bent_Over_Barbell_Row',
   'Mit geradem Rücken etwa 45° nach vorn beugen und die Langhantel zum Bauchnabel ziehen. Die Ellenbogen bleiben nah am Körper, die Schulterblätter ziehen am Endpunkt zusammen. Der Rumpf bleibt stabil – kein Aufrichten aus dem unteren Rücken, um das Gewicht zu bewegen.'),
  ('ex_kreuzheben'         , 'Kreuzheben'                  , 'Rücken'   , 'Rückenstrecker, Glutes'        , 0, 'pull'  , 'freihantel'    , 'Barbell_Deadlift',
   'Die Hantel dicht am Schienbein greifen, Rücken gerade, Brust raus, und über Beine und Hüfte aufrichten. Die Stange bleibt während der gesamten Bewegung nah am Körper. Oben wird die Hüfte gestreckt, der Rücken aber nicht überstreckt – danach kontrolliert wieder ablegen.'),
  ('ex_kabelrudern'        , 'Kabelrudern sitzend'         , 'Rücken'   , 'Mittlerer Rücken'              , 0, 'pull'  , 'maschine'      , 'Seated_Cable_Rows',
   'Sitzend mit leicht gebeugten Knien den Griff zum Bauch ziehen und die Schulterblätter zusammenführen. Der Oberkörper bleibt weitgehend aufrecht, nur minimales Vor- und Zurückpendeln. Vorne die Arme strecken und den Rücken bewusst auf Länge bringen.'),
  ('ex_hyperextension'     , 'Rückenstrecker (Hyperext.)'  , 'Rücken'   , 'Erector spinae'                , 0, 'pull'  , 'maschine'      , 'Hyperextensions_Back_Extensions',
   'Im Rückenstrecker die Hüfte als Gelenk nutzen: den Oberkörper absenken und wieder bis zur Körperlinie aufrichten. Nicht ins Hohlkreuz überstrecken – oben ist Schluss, wenn Beine und Rumpf eine Linie bilden. Trainiert Rückenstrecker, Gesäß und Beinbizeps zugleich.'),
  ('ex_kh_rudern'          , 'Kurzhantelrudern einarmig'   , 'Rücken'   , 'Latissimus dorsi'              , 0, 'pull'  , 'freihantel'    , 'One-Arm_Dumbbell_Row',
   'Ein Knie und eine Hand auf der Bank, den Rücken waagerecht und gerade halten. Die Kurzhantel eng am Körper zur Hüfte ziehen und unten kontrolliert ausstrecken. Der Oberkörper bleibt ruhig, eine Rotation aus der Wirbelsäule wird vermieden.'),
  ('ex_tbar_rudern'        , 'T-Bar-Rudern'                , 'Rücken'   , 'Mittlerer Rücken'              , 0, 'pull'  , 'freihantel'    , 'T-Bar_Row_with_Handle',
   'Vorgebeugt mit geradem Rücken den Griff zum Bauch ziehen und die Schulterblätter zusammenführen. Der enge Griff betont den mittleren Rücken stärker als breites Rudern. Knie leicht gebeugt, Rumpf fest, die Bewegung kommt nur aus Armen und Rücken.'),
  ('ex_maschinenrudern'    , 'Rudern an der Maschine'      , 'Rücken'   , 'Latissimus, Rhomboiden'        , 0, 'pull'  , 'maschine'      , 'Leverage_High_Row',
   'An der Rudermaschine mit der Brust am Polster die Griffe nach hinten ziehen. Die Brustabstützung nimmt den unteren Rücken aus der Gleichung – gut für hohe Volumina oder wenn der Rücken vorbelastet ist. Am Endpunkt kurz halten und langsam zurückführen.'),
  ('ex_shrugs'             , 'Shrugs (Nackenheben)'        , 'Rücken'   , 'Trapezius'                     , 0, 'pull'  , 'freihantel'    , 'Barbell_Shrug',
   'Mit hängenden Armen die Schultern gerade nach oben Richtung Ohr ziehen und oben kurz halten. Kein Kreisen der Schultern, die Arme bleiben gestreckt und werden nicht mitgebeugt. Langsam ablassen und die Dehnung im Nacken zulassen.'),

  -- Beine
  ('ex_kniebeugen'         , 'Kniebeugen (Langhantel)'     , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'freihantel'    , 'Barbell_Full_Squat',
   'Die Hantel liegt auf dem oberen Rücken, Füße schulterbreit, Zehen leicht nach außen. In die Hocke gehen, bis die Oberschenkel mindestens parallel zum Boden sind, dann über Beine und Hüfte hochdrücken. Die Knie folgen der Fußrichtung, der Rücken bleibt gerade und die Brust aufrecht.'),
  ('ex_beinpresse'         , 'Beinpresse'                  , 'Beine'    , 'Quadrizeps'                    , 0, 'push'  , 'maschine'      , 'Leg_Press',
   'Füße schulterbreit auf der Platte, Rücken und Gesäß flach am Polster. Die Platte kontrolliert absenken, bis die Knie etwa 90° erreichen, dann wegdrücken ohne die Knie durchzuschlagen. Der untere Rücken darf sich nicht vom Polster abheben – sonst weniger tief gehen.'),
  ('ex_ausfallschritte'    , 'Ausfallschritte'             , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'koerpergewicht', 'Bodyweight_Walking_Lunge',
   'Einen großen Schritt nach vorn setzen und das hintere Knie kontrolliert Richtung Boden absenken. Das vordere Knie bleibt über dem Fuß, der Oberkörper aufrecht. Über die Ferse des vorderen Fußes wieder hochdrücken und die Seite wechseln.'),
  ('ex_beinstrecker'       , 'Beinstrecker'                , 'Beine'    , 'Quadrizeps'                    , 0, 'push'  , 'maschine'      , 'Leg_Extensions',
   'Sitzend die Unterschenkel gegen das Polster nach oben strecken und oben kurz halten. Die Bewegung isoliert den Quadrizeps – langsam und ohne Schwung arbeiten. Die Drehachse der Maschine sollte auf Höhe des Kniegelenks liegen.'),
  ('ex_beinbeuger'         , 'Beinbeuger'                  , 'Beine'    , 'Hamstrings'                    , 0, 'pull'  , 'maschine'      , 'Lying_Leg_Curls',
   'Bäuchlings liegend die Fersen gegen das Polster zum Gesäß ziehen und kontrolliert ablassen. Die Hüfte bleibt am Polster, das Becken hebt sich nicht ab. Isoliert den Beinbizeps und ist damit ein sinnvoller Gegenspieler zu Beinstrecker und Kniebeuge.'),
  ('ex_wadenheben'         , 'Wadenheben stehend'          , 'Beine'    , 'Gastrocnemius'                 , 0, 'push'  , 'freihantel'    , 'Standing_Calf_Raises',
   'Im Stand über die Fußballen so hoch wie möglich aufrichten und oben kurz halten. Anschließend die Ferse langsam unter die Ausgangshöhe absenken, um die volle Dehnung zu nutzen. Gestreckte Knie betonen den äußeren, zweiköpfigen Wadenmuskel.'),
  ('ex_rumaenisches_kh'    , 'Rumänisches Kreuzheben'      , 'Beine'    , 'Hamstrings, Glutes'            , 0, 'pull'  , 'freihantel'    , 'Romanian_Deadlift',
   'Mit fast gestreckten Beinen die Hüfte nach hinten schieben und die Hantel eng am Bein absenken. Der Rücken bleibt gerade; gestoppt wird, wenn die Oberschenkelrückseite deutlich zieht. Über die Hüftstreckung wieder aufrichten – die Knie bleiben dabei nur leicht gebeugt.'),
  ('ex_frontkniebeugen'    , 'Frontkniebeugen'             , 'Beine'    , 'Quadrizeps'                    , 0, 'push'  , 'freihantel'    , 'Front_Barbell_Squat',
   'Die Hantel liegt vorn auf den Schultern, die Ellenbogen zeigen hoch nach vorn. Dadurch bleibt der Oberkörper aufrechter als bei der klassischen Kniebeuge und der Quadrizeps arbeitet stärker. Der untere Rücken wird entlastet, dafür braucht es bewegliche Handgelenke und Schultern.'),
  ('ex_bulgarian_split'    , 'Bulgarian Split Squat'       , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'koerpergewicht', 'Split_Squat_with_Dumbbells',
   'Den hinteren Fuß auf eine Bank legen und mit dem vorderen Bein tief in die Kniebeuge gehen. Das Gewicht liegt fast vollständig auf dem vorderen Bein – das schult Kraft und Gleichgewicht zugleich. Oberkörper leicht nach vorn geneigt, das Knie folgt der Fußrichtung.'),
  ('ex_goblet_squat'       , 'Goblet Squat'                , 'Beine'    , 'Quadrizeps, Glutes'            , 0, 'push'  , 'freihantel'    , 'Goblet_Squat',
   'Eine Kurzhantel oder Kettlebell vor der Brust halten und in die tiefe Hocke gehen. Das Gewicht vorn wirkt als Gegengewicht und hilft, den Oberkörper aufrecht zu halten. Gut geeignet, um die Kniebeugen-Technik zu lernen oder als Aufwärmsatz.'),
  ('ex_hip_thrust'         , 'Hip Thrust'                  , 'Beine'    , 'Gluteus maximus'               , 0, 'pull'  , 'freihantel'    , 'Barbell_Hip_Thrust',
   'Mit dem oberen Rücken an einer Bank angelehnt die Hantel über der Hüfte nach oben drücken. Oben das Gesäß maximal anspannen, bis Rumpf und Oberschenkel eine Linie bilden – nicht ins Hohlkreuz überstrecken. Die wirksamste Übung für gezieltes Gesäßtraining.'),
  ('ex_wadenheben_sitzend' , 'Wadenheben sitzend'          , 'Beine'    , 'Soleus'                        , 0, 'push'  , 'maschine'      , 'Seated_Calf_Raise',
   'Sitzend mit dem Polster auf den Oberschenkeln die Fersen anheben und wieder tief absenken. Das gebeugte Knie nimmt den äußeren Wadenmuskel aus der Bewegung und betont den darunterliegenden Schollenmuskel. Langsam arbeiten und oben kurz halten.'),

  -- Schultern
  ('ex_schulterdruecken'   , 'Schulterdrücken (Langh.)'    , 'Schultern', 'Deltoideus anterior'           , 0, 'push'  , 'freihantel'    , 'Barbell_Shoulder_Press',
   'Im Stand oder Sitz die Hantel von Schulterhöhe über den Kopf drücken, bis die Arme fast gestreckt sind. Der Rumpf bleibt fest, kein Zurücklehnen ins Hohlkreuz. Der Kopf weicht der Stange kurz aus, danach befindet sich die Hantel über der Körpermitte.'),
  ('ex_seitheben'          , 'Seitheben (Kurzhantel)'      , 'Schultern', 'Deltoideus lateralis'          , 0, 'push'  , 'freihantel'    , 'Side_Lateral_Raise',
   'Die Kurzhanteln mit leicht gebeugten Ellenbogen seitlich bis auf Schulterhöhe anheben. Leichte Gewichte reichen – die seitliche Schulter ist klein und reagiert auf saubere Ausführung besser als auf Schwung. Die Hanteln kontrolliert absenken, ohne unten abzusetzen.'),
  ('ex_face_pulls'         , 'Face Pulls'                  , 'Schultern', 'Deltoideus posterior'          , 0, 'pull'  , 'maschine'      , 'Face_Pull',
   'Das Seil auf Gesichtshöhe zum Kopf ziehen und die Hände dabei nach außen rotieren. Die Ellenbogen bleiben hoch, die Schulterblätter ziehen zusammen. Trainiert die hintere Schulter und wirkt einer nach vorn gezogenen Haltung entgegen.'),
  ('ex_frontheben'         , 'Frontheben'                  , 'Schultern', 'Deltoideus anterior'           , 0, 'push'  , 'freihantel'    , 'Front_Dumbbell_Raise',
   'Die Hanteln mit gestreckten Armen nach vorn bis auf Schulterhöhe anheben und langsam absenken. Der Rumpf bleibt still, es wird nicht aus der Hüfte ausgeholt. Ergänzt Drückbewegungen, sollte aber sparsam dosiert werden, da die vordere Schulter ohnehin viel arbeitet.'),
  ('ex_kh_schulterdruecken', 'Schulterdrücken (Kurzhantel)', 'Schultern', 'Deltoideus anterior'           , 0, 'push'  , 'freihantel'    , 'Dumbbell_Shoulder_Press',
   'Die Kurzhanteln von Schulterhöhe über den Kopf drücken und oben leicht zusammenführen. Der freie Bewegungsweg ist schulterfreundlicher als mit der Langhantel. Den Rumpf fest anspannen, damit der untere Rücken nicht ausweicht.'),
  ('ex_arnold_press'       , 'Arnold Press'                , 'Schultern', 'Deltoideus anterior, lateralis', 0, 'push'  , 'freihantel'    , 'Arnold_Dumbbell_Press',
   'Die Hanteln starten vor der Brust im Untergriff und werden beim Hochdrücken nach außen gedreht. Die Rotation bringt vordere und seitliche Schulter in einer Bewegung zusammen. Langsam und mit moderatem Gewicht ausführen, die Drehung braucht Kontrolle.'),
  ('ex_reverse_butterfly'  , 'Reverse Butterfly'           , 'Schultern', 'Deltoideus posterior'          , 0, 'pull'  , 'maschine'      , 'Reverse_Machine_Flyes',
   'An der Maschine sitzend die Arme nach hinten außen führen und die Schulterblätter zusammenziehen. Die Ellenbogen bleiben leicht gebeugt und auf Schulterhöhe. Trainiert die hintere Schulter, die beim Drücken meist zu kurz kommt.'),

  -- Arme
  ('ex_bizeps_curls'       , 'Bizeps-Curls (Langhantel)'   , 'Arme'     , 'Biceps brachii'                , 0, 'pull'  , 'freihantel'    , 'Barbell_Curl',
   'Im Stand mit schulterbreitem Untergriff die Hantel zur Brust curlen. Die Ellenbogen bleiben am Körper fixiert, der Oberkörper bewegt sich nicht mit. Oben kurz anspannen und die Hantel langsam ablassen – gerade die Absenkphase bringt den Reiz.'),
  ('ex_hammer_curls'       , 'Hammer Curls'                , 'Arme'     , 'Brachialis, Brachiorad.'       , 0, 'pull'  , 'freihantel'    , 'Hammer_Curls',
   'Die Kurzhanteln im neutralen Griff mit dem Daumen oben zur Schulter curlen. Der Hammergriff trifft den Oberarmmuskel unter dem Bizeps und die Unterarme. Die Ellenbogen bleiben fixiert, kein Schwung aus der Hüfte.'),
  ('ex_trizepsdruecken'    , 'Trizepsdrücken am Kabel'     , 'Arme'     , 'Triceps brachii'               , 0, 'push'  , 'maschine'      , 'Triceps_Pushdown',
   'Am hohen Kabelzug die Ellenbogen am Körper fixieren und die Unterarme nach unten strecken. Nur der Unterarm bewegt sich, der Oberarm bleibt ruhig. Unten kurz voll anspannen und kontrolliert zurückführen.'),
  ('ex_dips'               , 'Dips'                        , 'Arme'     , 'Trizeps, Brust'                , 0, 'push'  , 'koerpergewicht', 'Dips_-_Triceps_Version',
   'Am Barren abgestützt den Körper absenken, bis die Oberarme etwa waagerecht sind, und wieder hochdrücken. Aufrechter Oberkörper und enge Ellenbogen betonen den Trizeps, eine Vorneigung eher die Brust. Nur so tief gehen, wie die Schulter es schmerzfrei zulässt.'),
  ('ex_kh_bizeps_curls'    , 'Bizeps-Curls (Kurzhantel)'   , 'Arme'     , 'Bizeps brachii'                , 0, 'pull'  , 'freihantel'    , 'Dumbbell_Bicep_Curl',
   'Die Kurzhanteln einzeln oder gleichzeitig zur Schulter curlen und dabei das Handgelenk leicht nach außen drehen. Die getrennte Führung gleicht Seitenunterschiede aus. Die Ellenbogen bleiben am Körper, die Absenkphase bewusst langsam ausführen.'),
  ('ex_scott_curls'        , 'Scott-Curls (SZ-Stange)'     , 'Arme'     , 'Bizeps brachii'                , 0, 'pull'  , 'freihantel'    , 'Preacher_Curl',
   'Die Oberarme liegen auf dem Scottpult, die SZ-Stange wird nach oben gecurlt. Die feste Auflage schließt jeden Schwung aus und trifft den Bizeps besonders im unteren Bewegungsbereich. Die Arme unten nicht komplett locker durchstrecken.'),
  ('ex_stirndruecken'      , 'Stirndrücken (SZ-Stange)'    , 'Arme'     , 'Trizeps brachii'               , 0, 'push'  , 'freihantel'    , 'EZ-Bar_Skullcrusher',
   'Auf der Bank liegend die SZ-Stange mit fixierten Oberarmen zur Stirn absenken und wieder strecken. Die Ellenbogen zeigen nach oben und wandern nicht nach vorn. Moderates Gewicht wählen – die Übung ist wirksam, aber ellenbogenintensiv.'),
  ('ex_enges_bankdruecken' , 'Enges Bankdrücken'           , 'Arme'     , 'Trizeps brachii'               , 0, 'push'  , 'freihantel'    , 'Close-Grip_Barbell_Bench_Press',
   'Bankdrücken mit etwa schulterbreitem Griff und eng am Körper geführten Ellenbogen. Der enge Griff verlagert die Arbeit von der Brust auf den Trizeps. Nicht enger als schulterbreit greifen, sonst leiden die Handgelenke.'),

  -- Rumpf
  ('ex_plank'              , 'Plank (Unterarmstütz)'       , 'Rumpf'    , 'Rumpfstabilisation'            , 0, 'core'  , 'koerpergewicht', 'Plank',
   'Auf Unterarmen und Fußspitzen abstützen, Körper von Kopf bis Ferse in einer geraden Linie. Bauch und Gesäß aktiv anspannen, das Becken hängt weder durch noch schiebt es nach oben. Ruhig weiteratmen und die Haltezeit statt eines Gewichts steigern.'),
  ('ex_crunches'           , 'Crunches'                    , 'Rumpf'    , 'Rectus abdominis'              , 0, 'core'  , 'koerpergewicht', 'Crunches',
   'In Rückenlage mit angestellten Beinen den Oberkörper nur so weit anheben, dass sich die Schulterblätter vom Boden lösen. Die Bewegung kommt aus der Bauchmuskulatur, nicht aus einem Zug am Nacken. Oben kurz halten und langsam ablassen.'),
  ('ex_beinheben'          , 'Beinheben hängend'           , 'Rumpf'    , 'Unterer Bauch'                 , 0, 'pull'  , 'koerpergewicht', 'Hanging_Leg_Raise',
   'An der Stange hängend die gestreckten oder gebeugten Beine bis mindestens auf Hüfthöhe anheben. Die Bewegung startet mit dem Kippen des Beckens, sonst arbeitet vor allem der Hüftbeuger. Nicht schwingen, sondern kontrolliert absenken.'),
  ('ex_russian_twists'     , 'Russian Twists'              , 'Rumpf'    , 'Obliquus'                      , 0, 'core'  , 'koerpergewicht', 'Russian_Twist',
   'Sitzend mit angehobenen Füßen den Oberkörper abwechselnd nach links und rechts drehen. Die Rotation kommt aus dem Rumpf, nicht nur aus den Armen. Den Rücken gerade halten und bei Bedarf ein Gewicht vor der Brust führen.'),
  ('ex_cable_crunch'       , 'Crunches am Kabelzug'        , 'Rumpf'    , 'Rectus abdominis'              , 0, 'core'  , 'maschine'      , 'Cable_Crunch',
   'Am hohen Kabelzug knien, das Seil neben dem Kopf halten und den Oberkörper einrollen. Die Hüfte bleibt fixiert – es rollt nur die Wirbelsäule ein, es ist keine Hüftbeugung. Vorteil gegenüber Crunches: Der Widerstand lässt sich sauber steigern.'),
  ('ex_side_plank'         , 'Seitstütz (Side Plank)'      , 'Rumpf'    , 'Obliquus'                      , 0, 'core'  , 'koerpergewicht', 'Side_Bridge',
   'Seitlich auf einem Unterarm abstützen, den Körper in einer geraden Linie und die Hüfte oben halten. Die seitliche Rumpfmuskulatur arbeitet gegen das Absinken des Beckens. Beide Seiten gleich lang halten.'),
  ('ex_ab_wheel'           , 'Bauchroller (Ab Wheel)'      , 'Rumpf'    , 'Rectus abdominis'              , 0, 'core'  , 'koerpergewicht', 'Ab_Roller',
   'Aus dem Kniestand das Rad nach vorn rollen und den Körper dabei lang machen, ohne ins Hohlkreuz zu fallen. Nur so weit rollen, wie die Rumpfspannung hält, dann zurückziehen. Sehr anspruchsvoll – zu Beginn mit kurzer Reichweite oder an der Wand arbeiten.'),

  -- Cardio
  ('ex_rudergeraet'        , 'Rudergerät'                  , 'Cardio'   , 'Ganzkörper'                    , 0, 'pull'  , 'maschine'      , 'Rowing_Stationary',
   'Die Bewegung startet mit den Beinen, dann folgen Rumpf und zuletzt die Arme; zurück geht es in umgekehrter Reihenfolge. Der Rücken bleibt gerade, gezogen wird zum unteren Rippenbogen. Trainiert Ausdauer und Ganzkörperkraft bei geringer Gelenkbelastung.'),
  ('ex_laufband'           , 'Laufband'                    , 'Cardio'   , 'Ausdauer'                      , 0, 'cardio', 'maschine'      , 'Running_Treadmill',
   'Aufrechte Haltung, lockere Schultern, Blick nach vorn und nicht am Griff festhalten. Für die Grundlagenausdauer ein gleichmäßiges Tempo wählen, bei dem Sprechen noch möglich ist. Eine leichte Steigung schont die Gelenke und erhöht die Intensität ohne mehr Tempo.'),
  ('ex_crosstrainer'       , 'Crosstrainer'                , 'Cardio'   , 'Ganzkörper'                    , 0, 'cardio', 'maschine'      , 'Elliptical_Trainer',
   'Gleichmäßig treten und die Arme aktiv mitarbeiten lassen, statt sich nur abzustützen. Der Bewegungsablauf ist gelenkschonend, weil kein Aufprall entsteht. Gut für längere Einheiten oder als Aufwärmprogramm vor dem Krafttraining.'),
  ('ex_ergometer'          , 'Fahrradergometer'            , 'Cardio'   , 'Ausdauer'                      , 0, 'cardio', 'maschine'      , 'Bicycling_Stationary',
   'Die Sattelhöhe so einstellen, dass das Knie im tiefsten Punkt nur leicht gebeugt ist. Rund und gleichmäßig treten statt zu stampfen, der Oberkörper bleibt ruhig. Über Widerstand und Trittfrequenz lässt sich die Intensität fein steuern.'),
  ('ex_seilspringen'       , 'Seilspringen'                , 'Cardio'   , 'Ausdauer, Waden'               , 0, 'cardio', 'koerpergewicht', 'Rope_Jumping',
   'Kleine, federnde Sprünge auf dem Fußballen, die Drehung kommt aus den Handgelenken. Die Ellenbogen bleiben nah am Körper, gesprungen wird nur wenige Zentimeter hoch. Sehr effektiv für Kondition, Waden und Koordination – am besten in kurzen Intervallen starten.')
ON CONFLICT(id) DO UPDATE SET
  name          = excluded.name,
  category      = excluded.category,
  target_muscle = excluded.target_muscle,
  movement      = excluded.movement,
  equipment     = excluded.equipment,
  image         = excluded.image,
  description   = excluded.description;
