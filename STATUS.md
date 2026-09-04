# Projektstand FitMan — Übergabe

**Stand:** 2026-09-04 · **Branch:** `main` · **Letzter Commit:** `7f34869 all files`
**Working Tree:** sauber, alles committet · **Noch nie deployed** (`wrangler deploy` wurde nicht ausgeführt)

Diese Datei ist der Einstiegspunkt für die nächste Session. Fachliche
Dokumentation (Setup, Befehle, Datenmodell, API) steht im `README.md` — hier
steht nur, was gerade gilt, was verifiziert ist und was als Nächstes ansteht.

---

## 1. Was fertig ist

Die App ist funktional vollständig gegenüber der ursprünglichen Spezifikation.

| Bereich | Stand |
| --- | --- |
| Datenmodell (5 Tabellen, Drizzle) | fertig, Migration `drizzle/0000_init.sql` angewandt (lokal) |
| Seed-Daten (31 Übungen) | fertig, `seed.sql`, idempotent via `INSERT OR IGNORE` |
| Screen 1 — Pläne & Start (`/`) | fertig, inkl. Schnellstart und `/plans/new`, `/plans/:id` |
| Screen 2 — Aktiver Tracker (`/workout/active`) | fertig, inkl. Rest-Timer, Vorwerte, Batch-Save |
| Screen 3 — Übungsbibliothek (`/exercises`) | fertig, Suche + Kategoriefilter + eigene Übungen |
| Screen 4 — Verlauf (`/history`, `/history/:id`) | fertig, mit Kennzahlen und Satz-Detailtabelle |
| Bottom-Nav, Touch-Ziele ≥ 44px, Dark Mode | fertig |
| `wrangler.toml`, Worker-Entrypoint, Assets | fertig |

Technische Eckpunkte, die man kennen sollte:

- **Alles läuft in einem Worker.** Hono rendert serverseitig mit `hono/jsx`;
  statische Assets kommen aus `public/` über das `[assets]`-Binding.
- **Nur der aktive Tracker ist clientseitig** (`public/app.js`, ~900 Zeilen,
  vanilla JS, kein Build-Schritt). Alles andere sind normale HTML-Formulare mit
  `303`-Redirect und funktioniert ohne JavaScript.
- **Laufender Workout-Zustand liegt im `localStorage`** (Key
  `fitman.activeWorkout`). Bildschirmsperre, Reload oder Funkloch im Gym kosten
  keine Daten. Gespeichert wird erst beim Beenden.
- **Speichern ist transaktional:** `POST /api/workouts` schreibt `workout_logs`
  plus alle `set_logs` in einem einzigen `db.batch()` — D1 führt das als
  implizite Transaktion aus. Deshalb sind alle IDs `TEXT`/UUID: die
  `workout_log_id` muss vor dem Batch feststehen.
- **Vorwerte („Quick History"):** `getPreviousSets()` in `src/lib/queries.ts`
  liefert pro Übung die Sätze des jüngsten Workouts, in dem sie abgehakt wurde.
  Diese Werte füllen die Spalte „Vorher" *und* belegen die Eingabefelder vor.

### Bewusste Abweichungen von der Spezifikation

1. `plan_exercises.order` heißt in SQL **`sort_order`** — `ORDER` ist ein
   reserviertes SQLite-Schlüsselwort. Das Drizzle-Feld heißt weiterhin `order`.
2. `workout_logs` hat zusätzlich **`plan_name`** als Snapshot. Ohne das wird der
   Verlauf unlesbar, sobald ein Plan gelöscht wird.

---

## 2. ⚠️ Offener Punkt: kaputte drizzle-kit-Version

**Das ist der erste Punkt für die nächste Session.**

`package.json` wurde nach Abschluss der Implementierung außerhalb der Session
geändert (vermutlich durch ein anderes Tool — es liegen `.aider.*`-Dateien im
Projekt). Dabei wurde `drizzle-kit` von `^0.31.4` auf **`^0.18.1`** herabgestuft
(installiert: 0.18.1, ein Stand von 2023) und `drizzle-orm` auf `^0.45.2`
angehoben.

Konkrete Folgen, beide reproduziert:

```
$ npx tsc --noEmit
drizzle.config.ts(1,10): error TS2305: Module '"drizzle-kit"' has no exported member 'defineConfig'.

$ npx drizzle-kit generate
error: unknown command 'generate'  (Did you mean generate:pg?)
```

**Wichtig:** Nur das Tooling ist betroffen, nicht die App.
`src/**` typecheckt fehlerfrei, der Worker läuft, alle Routen antworten, und
`drizzle-orm` 0.45.2 ist zur Laufzeit unproblematisch (siehe Abschnitt 3).
Kaputt ist das Erzeugen **neuer** Migrationen — die bestehende Migration ist
bereits generiert und angewandt.

Vorgeschlagener Fix (nicht angewandt, weil die Änderung von außen kam und
absichtlich gewesen sein könnte):

```bash
npm install -D drizzle-kit@^0.31.4
npx tsc --noEmit          # muss danach komplett grün sein
npx drizzle-kit generate  # muss "No schema changes, nothing to migrate" melden
```

Alternativ, falls `drizzle-kit` 0.18 bewusst gesetzt wurde: `drizzle.config.ts`
auf das alte Format umschreiben und das Script auf `generate:sqlite` umstellen.
Die erste Variante ist deutlich sinnvoller.

---

## 3. Verifikationsstand

Am aktuellen Commit `7f34869` geprüft:

**Build & Typen**
- `npm run build:css` — grün (Tailwind 4.3.3, `public/styles.css` ~26 KB)
- `npx tsc --noEmit` — grün für `src/**`; **ein** Fehler in `drizzle.config.ts`
  (siehe Abschnitt 2)

**Datenbank (lokal)**
- Migration `0000_init.sql` angewandt, 11 Statements
- Seed eingespielt: 31 Übungen in `exercises`

**Routen (`wrangler dev`)**
- `/`, `/exercises`, `/history`, `/plans/new`, `/workout/active?quick=1` → 200
- `/styles.css`, `/app.js`, `/manifest.webmanifest` → 200
- unbekannte Route → 404 mit gerenderter Fehlerseite

**Fachliche Flows (per curl gegen die lokale D1)**
- Plan anlegen: Reihenfolge und `target_sets` landen korrekt in `plan_exercises`
- `POST /api/workouts`: Batch-Insert schreibt Log + Sätze, liefert `{id, url}`
- Verlaufsliste und Detailansicht zeigen Plan, Dauer, Notizen, Sätze korrekt
- Vorwerte-Query liefert nur abgehakte Sätze (`completed = 1`)

**Tracker-Flow (jsdom, 31 Checks, alle bestanden)**
Übungs-Picker, Satz abhaken, Rest-Timer startet, Komma-Eingabe `82,5` → `82.5`,
Satz hinzufügen/entfernen, Übungswechsel über Chips und Pfeile, Finish-Sheet,
POST-Payload enthält nur befüllte Sätze mit korrekter `setNumber`,
`localStorage` wird nach dem Speichern geleert. Bei Plan-Workouts zusätzlich:
Satzanzahl aus `target_sets`, Vorwert-Anzeige `60 kg × 10`, Vorbelegung der
Felder, letzter Vorwert wird auf zusätzliche Sätze vererbt.

Die Testskripte lagen im Scratchpad und sind **nicht** im Repo. Falls dauerhafte
Tests gewünscht sind, siehe Abschnitt 5.

**Testdaten wurden nach jedem Durchlauf wieder entfernt** — die lokale D1
enthält aktuell nur die 31 Seed-Übungen, keine Pläne, keine Logs.

---

## 4. Nächste Session: so kommst du rein

```bash
cd C:/Users/testgo23/Documents/github/fit-man
npm install
npm run db:setup:local    # nur nötig, falls .wrangler/ gelöscht wurde
npm run dev               # http://localhost:8787
```

`.wrangler/` (lokale D1) liegt noch auf der Platte und ist migriert + geseedet,
`npm run db:setup:local` ist also normalerweise nicht nötig. Beides ist
idempotent und schadet nicht.

Für Live-CSS zusätzlich in einem zweiten Terminal: `npm run watch:css`.

### Cloudflare-Status

- D1-Datenbank ist angelegt, `database_id = 1b6bc6d6-117f-4e18-843c-87dcd1d5c68c`
  steht in `wrangler.toml` (wurde nach der Implementierung eingetragen).
- **Auf der Remote-D1 ist noch nichts passiert** — weder Migration noch Seed.
- Der Worker ist noch nicht deployed.

Erstes Remote-Deployment:

```bash
npm run db:migrate:remote   # Schema anwenden
npm run db:seed:remote      # 31 Übungen einspielen (einmalig, idempotent)
npm run deploy              # CSS bauen + Worker deployen
```

---

## 5. Mögliche nächste Schritte

Nichts davon ist begonnen — das ist eine Ideenliste, keine Roadmap.

**Zuerst**
1. `drizzle-kit` reparieren (Abschnitt 2) — blockiert jede Schemaänderung.
2. Erstes Remote-Deployment (Abschnitt 4) und einmal auf einem echten Handy
   durchspielen. Bisher wurde nur lokal und in jsdom getestet, nie in einem
   echten mobilen Browser.

**Funktional naheliegend**
- Pläne bearbeiten: `/plans/:id` kann aktuell nur starten und löschen, nicht
  umsortieren oder Übungen nachträglich ändern.
- Plan aus einem absolvierten Workout erzeugen („nochmal so trainieren").
- Fortschritt pro Übung: Verlauf des Arbeitsgewichts, persönliche Bestleistung.
- Rest-Timer-Dauer pro Übung statt global (liegt aktuell in `fitman.restSeconds`).
- Notification statt nur Vibration + Ton am Timer-Ende.

**Technisch**
- Automatisierte Tests ins Repo holen. Die jsdom-Skripte aus dieser Session
  waren wertvoll, sind aber nicht eingecheckt — Vitest + jsdom für `app.js`,
  plus `wrangler dev`-Smoke-Tests für die Routen wären ein guter Schnitt.
- Kein Auth, kein Mandantenkonzept: Wer die URL kennt, sieht und ändert alles.
  Vor öffentlichem Deployment relevant.
- Service Worker für echten Offline-Betrieb (bewusst weggelassen, um Probleme
  mit veraltetem Cache zu vermeiden). Das Manifest ist bereits da.
- `wrangler.toml` → `wrangler.jsonc` migrieren, falls Wrangler das irgendwann
  einfordert.

---

## 6. Landkarte des Codes

```
src/index.tsx              Worker-Entrypoint: Hono-App, Routen-Mounting, 404/500
src/types.ts               Bindings: DB (D1), ASSETS (Fetcher)
src/db/schema.ts           Drizzle-Schema, Relations, abgeleitete Typen
src/db/index.ts            createDb(d1) — Drizzle-Client pro Request
src/routes/plans.tsx       /  ·  /plans/new  ·  POST /plans  ·  /plans/:id
src/routes/exercises.tsx   /exercises  ·  POST /exercises  ·  GET /api/exercises
src/routes/workout.tsx     /workout/active  ·  POST /api/workouts  ← Batch-Insert
src/routes/history.tsx     /history  ·  /history/:id
src/components/layout.tsx  Layout, PageHeader, BottomNav, EmptyState, CategoryBadge
src/components/icons.tsx   Lucide-Pfade als Inline-SVG (kein React nötig)
src/lib/queries.ts         Wiederverwendete Abfragen, u. a. getPreviousSets()
src/lib/format.ts          Datum, Dauer, Gewicht, newId()
src/styles/app.css         Tailwind-Quelle: @theme-Tokens + Komponentenklassen
public/app.js              Client: Tracker, Rest-Timer, Filter, Bottom-Sheets
drizzle/                   Migration + Drizzle-Metadaten (nicht per Hand ändern)
seed.sql                   31 Standardübungen
```

**Wo man typischerweise landet:**

| Aufgabe | Datei |
| --- | --- |
| Tracker-Verhalten, Timer, Satz-Logik | `public/app.js` → `initWorkout()` |
| Farben, Buttons, Inputs, Chips | `src/styles/app.css` |
| Neue Seite | `src/routes/*.tsx` + Mounting in `src/index.tsx` |
| Neue Abfrage | `src/lib/queries.ts` |
| Neues Icon | `src/components/icons.tsx` (Pfad von lucide.dev übernehmen) |
| Schemaänderung | `src/db/schema.ts`, danach `npm run db:generate` ⚠️ Abschnitt 2 |

Nach jeder Änderung an `src/styles/app.css` oder an Klassennamen in TSX/JS muss
`npm run build:css` laufen — `public/styles.css` ist ein Build-Artefakt und
bewusst nicht eingecheckt (`.gitignore`).
