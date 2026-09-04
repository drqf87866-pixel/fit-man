# FitMan

Mobile-first Fitness- & Workout-Tracker — vollständig auf Cloudflare Workers.
Frontend und Backend laufen im selben Worker: Hono rendert die Seiten serverseitig
(JSX), Cloudflare D1 speichert die Daten, Drizzle ORM ist die Zugriffsschicht.

| Baustein   | Technologie                                        |
| ---------- | -------------------------------------------------- |
| Hosting    | Cloudflare Workers (Routing für Frontend + API)     |
| Framework  | Hono mit `hono/jsx` (SSR)                           |
| Datenbank  | Cloudflare D1 (SQLite at the Edge)                  |
| ORM        | Drizzle ORM (native D1-Anbindung, `db.batch()`)     |
| Styling    | Tailwind CSS v4, Dark Mode First, 44px Touch-Ziele  |
| Icons      | Lucide (als Inline-SVG, kein React-Runtime nötig)   |

---

## Screens

| Route              | Inhalt                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `/`                | Trainingspläne, Schnellstart, „Neuen Plan erstellen"                 |
| `/plans/new`       | Plan anlegen: Name, Beschreibung, Übungsauswahl mit Ziel-Sätzen      |
| `/plans/:id`       | Plandetail, „Training starten", Plan löschen                        |
| `/workout/active`  | Aktiver Tracker: Sätze, Vorwerte, Rest-Timer, Workout beenden        |
| `/exercises`       | Übungsbibliothek: Suche, Kategoriefilter, eigene Übungen             |
| `/history`         | Verlauf mit Kennzahlen                                               |
| `/history/:id`     | Detailansicht eines Workouts (alle Sätze, Gewichte, Wiederholungen)  |

Bottom-Navigation (fix, `env(safe-area-inset-bottom)`-bewusst): **Training ·
Übungen · Verlauf**.

### Aktiver Workout-Tracker

- Übung für Übung mit horizontaler Chip-Leiste (`3/4` Sätze pro Übung sichtbar).
- Satz-Tabelle: `Satz # | Vorheriger Wert | kg | Wiederholungen | ✓`.
- Der vorherige Wert kommt aus dem jüngsten Workout, in dem die Übung abgehakt
  wurde, und wird gleichzeitig als Vorbelegung der Eingabefelder genutzt.
- Rest-Timer als Banner über der Fußleiste, ausgelöst durch das Abhaken eines
  Satzes; `+15s`, Überspringen, Vibration + Signalton am Ende.
- „Satz hinzufügen" und „Weitere Übung anfügen" (Picker über die ganze Bibliothek).
- Der laufende Zustand liegt im `localStorage` — Bildschirmsperre, Reload oder
  Funkloch im Gym kosten keine Daten. Zusätzlich `navigator.wakeLock`, damit das
  Display während des Trainings anbleibt.
- **„Workout beenden"** schreibt `workout_logs` + alle `set_logs` in einem
  einzigen `db.batch()` — D1 führt das als implizite Transaktion aus.

---

## Datenmodell

`src/db/schema.ts` — Migration in `drizzle/0000_init.sql`.

```
exercises       id · name · category · target_muscle · is_custom
workout_plans   id · name · description · created_at
plan_exercises  id · plan_id → workout_plans · exercise_id → exercises · sort_order · target_sets
workout_logs    id · plan_id → workout_plans (nullable) · plan_name · date · duration_seconds · notes
set_logs        id · workout_log_id → workout_logs · exercise_id → exercises · set_number · reps · weight_kg · completed
```

Zwei bewusste Abweichungen von der Kurzform der Spezifikation:

- **`plan_exercises.order` heißt in SQL `sort_order`** — `ORDER` ist ein
  reserviertes SQLite-Schlüsselwort. Das Drizzle-Feld heißt weiterhin `order`.
- **`workout_logs.plan_name`** ist ein Snapshot des Plannamens. Wird ein Plan
  gelöscht, bleibt der Verlauf lesbar, statt auf „Unbekannt" zu fallen.

Alle IDs sind `TEXT` (UUID mit Präfix, Seed-Übungen mit sprechendem Slug). Grund:
Für den transaktionalen Batch-Insert muss die ID des `workout_logs` feststehen,
bevor die zugehörigen `set_logs` geschrieben werden — mit `AUTOINCREMENT` wäre
dafür ein zweiter Roundtrip nötig.

---

## Setup

### 1. Abhängigkeiten

```bash
npm install
```

### 2. D1-Datenbank anlegen

```bash
npx wrangler d1 create fit-man-db
```

Die ausgegebene `database_id` in `wrangler.toml` eintragen:

```toml
[[d1_databases]]
binding = "DB"
database_name = "fit-man-db"
database_id = "hier-die-ausgegebene-id"   # <— ersetzen
migrations_dir = "drizzle"
```

### 3. Lokale Entwicklung (Miniflare/workerd)

```bash
npm run db:setup:local     # Migrationen + Seed in die lokale D1
npm run dev                # baut CSS und startet wrangler dev
```

→ http://localhost:8787 · Am besten in der mobilen Ansicht der DevTools testen.
Für Live-CSS in einem zweiten Terminal: `npm run watch:css`.

### 4. Deployment

Das Cloudflare-Konto ist mit dem GitHub-Repo verbunden: **jeder Push auf `main`
löst automatisch einen Build und einen Deploy des Workers aus.** Ein manuelles
`npm run deploy` ist im Normalfall nicht nötig.

> [!IMPORTANT]
> Der automatische Deploy führt **nur** `wrangler deploy` aus. D1-Migrationen und
> Seeds laufen **nicht** mit — die Datenbank ist von Cloudflares Sicht aus eine
> externe Ressource und wird beim Build nicht angefasst.
>
> Beim erstmaligen Aufsetzen der Remote-DB und danach nach jeder Schema- oder
> Seed-Änderung deshalb zusätzlich von Hand:
>
> ```bash
> npm run db:migrate:remote  # neue Migrationen auf die Remote-D1 anwenden
> npm run db:seed:remote     # seed.sql remote einspielen (idempotent)
> ```
>
> Wird das vergessen, ist der neue Code live, die Produktionsdaten passen aber
> nicht dazu: Spalten sind leer, Badges und Filter bleiben unsichtbar, und die
> App wirkt kaputt, obwohl der Deploy grün war.

Manuell deployen (z. B. ohne Commit) geht weiterhin:

```bash
npm run deploy             # CSS bauen + Worker deployen
```

Deploy-Status prüfen: `npx wrangler deployments list`

---

## Befehle

| Befehl                      | Wirkung                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `npm run dev`               | CSS bauen und `wrangler dev` starten                        |
| `npm run watch:css`         | Tailwind im Watch-Modus                                     |
| `npm run build:css`         | `src/styles/app.css` → `public/styles.css` (minified)       |
| `npm run db:generate`       | Drizzle-Migration aus `schema.ts` erzeugen                  |
| `npm run db:migrate:local`  | Migrationen auf die lokale D1 anwenden                      |
| `npm run db:migrate:remote` | Migrationen auf die Remote-D1 anwenden                      |
| `npm run db:seed:local`     | `seed.sql` lokal einspielen (idempotent)                    |
| `npm run db:seed:remote`    | `seed.sql` remote einspielen (idempotent)                   |
| `npm run db:setup:local`    | Migration + Seed in einem Schritt                           |
| `npm run db:studio`         | Drizzle Studio                                              |
| `npm run typecheck`         | `tsc --noEmit`                                              |
| `npm run deploy`            | CSS bauen + `wrangler deploy`                               |

### Schema ändern

```bash
# 1. src/db/schema.ts anpassen
npm run db:generate -- --name beschreibender_name
npm run db:migrate:local
npm run db:migrate:remote
```

Migrationen **immer** über `db:generate` erzeugen, nie die `.sql` von Hand in
`drizzle/` ablegen. Wrangler wendet zwar jede Datei im Ordner an, aber
drizzle-kit führt seinen Stand getrennt in `drizzle/meta/` (`_journal.json` plus
ein Snapshot je Migration). Fehlen diese Einträge, kennt drizzle-kit die
Änderung nicht und erzeugt beim nächsten `db:generate` dieselben Statements ein
zweites Mal — die Migration scheitert dann an `duplicate column`.

Ob Migrationen und Metadaten zueinander passen, prüft:

```bash
npx drizzle-kit check --dialect=sqlite --out=./drizzle
```

---

## Seed-Daten

`seed.sql` legt 56 Standardübungen an, verteilt auf Brust (7), Rücken (10),
Beine (12), Schultern (7), Arme (8), Rumpf (7) und Cardio (5) — von Bankdrücken
und Kniebeugen bis Hip Thrust, Ab Wheel und Crosstrainer. Eigene Übungen aus der
App landen mit `is_custom = 1` in derselben Tabelle.

Das Skript ist ein **UPSERT** und damit beliebig oft ausführbar:

```sql
INSERT INTO exercises (...) VALUES
  ('ex_bankdruecken', 'Bankdrücken (Langhantel)', 'Brust', ..., 'push', 'freihantel'),
  ...
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name, category = excluded.category, ...
```

Neue Übungen werden angelegt, bereits vorhandene auf den Stand der Datei
gebracht. **Jede Übung steht damit an genau einer Stelle** — geänderte Werte
kommen automatisch auch in bereits geseedeten Datenbanken an.

> [!NOTE]
> Vorher nutzte die Datei `INSERT OR IGNORE` plus einen nachgelagerten
> `UPDATE ... CASE id`-Block. Das war fehleranfällig: `INSERT OR IGNORE`
> überspringt bestehende Zeilen **inklusive geänderter Spaltenwerte**, sodass ein
> neues Feld nur in frischen Datenbanken ankam, solange man den UPDATE-Block
> nicht parallel pflegte. Genau daran hingen die zunächst unsichtbaren
> `movement`/`equipment`-Tags.

`is_custom` wird vom UPSERT bewusst nicht überschrieben. Kollidieren kann dabei
ohnehin nichts: eigene Übungen bekommen IDs der Form `ex_<uuid>`, die Seed-Daten
sprechende Slugs wie `ex_bankdruecken`.

Nach einer Seed-Änderung gegenprüfen, dass die Werte angekommen sind:

```bash
npx wrangler d1 execute fit-man-db --remote --json --command "SELECT count(*) total, sum(is_custom) eigene, count(DISTINCT movement) bewegungen FROM exercises;"
# -> { "total": 56, "eigene": 0, "bewegungen": 4 }
```

Das `--command` muss einzeilig bleiben; mehrzeilige Statements kommen bei D1 als
`incomplete input` an. Für längeres SQL stattdessen `--file=...` nutzen.

---

## Projektstruktur

```
src/
  index.tsx              Worker-Entrypoint: Hono-App, Routing, 404/500
  types.ts               Cloudflare-Bindings (DB, ASSETS)
  db/
    schema.ts            Drizzle-Schema für D1
    index.ts             Drizzle-Client pro Request
  routes/
    plans.tsx            /  ·  /plans/new  ·  /plans/:id
    exercises.tsx        /exercises  ·  POST /exercises  ·  GET /api/exercises
    workout.tsx          /workout/active  ·  POST /api/workouts (Batch-Insert)
    history.tsx          /history  ·  /history/:id
  components/
    layout.tsx           Layout, PageHeader, BottomNav, EmptyState
    icons.tsx            Lucide-Pfade als Inline-SVG
  lib/
    format.ts            Datum, Dauer, Gewicht, IDs
    queries.ts           Wiederverwendete Abfragen (u. a. Vorwerte je Übung)
  styles/app.css         Tailwind-Quelle (Theme-Tokens, Komponentenklassen)
public/                  Statische Assets (vom Assets-Handler ausgeliefert)
  app.js                 Client: Tracker, Rest-Timer, Filter, Bottom-Sheets
  styles.css             Build-Artefakt (nicht eingecheckt)
  icon.svg · manifest.webmanifest
drizzle/                 Generierte Migrationen + Drizzle-Metadaten
seed.sql                 Standard-Übungsbibliothek
```

## API

| Methode | Pfad                    | Zweck                                            |
| ------- | ----------------------- | ------------------------------------------------ |
| `POST`  | `/api/workouts`         | Workout transaktional speichern → `{ id, url }`  |
| `GET`   | `/api/exercises`        | Übungsbibliothek als JSON                        |
| `GET`   | `/healthz`              | Health-Check                                     |

Alle übrigen Mutationen laufen über klassische HTML-Formulare mit
`303`-Redirect, damit die App auch ohne JavaScript bedienbar bleibt — einzige
Ausnahme ist der aktive Tracker.
