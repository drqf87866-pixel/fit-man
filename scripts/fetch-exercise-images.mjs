/**
 * Lädt die Vorschaubilder der Standard-Übungsbibliothek einmalig herunter.
 *
 *   npm run fetch:images
 *
 * Quelle: https://github.com/yuhonas/free-exercise-db (Unlicense / Public Domain).
 * Es wird jeweils nur Bild 0 (Startposition) geholt und unter dem Slug abgelegt.
 * Bereits vorhandene Dateien werden übersprungen – die Bilder liegen im Repo und
 * werden über das ASSETS-Binding ausgeliefert.
 *
 * Die Slugs stehen als `image`-Spalte in seed.sql; diese Datei ist die Quelle
 * der Wahrheit dafür, welche Bilder existieren müssen.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'img', 'exercises');
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/** Slugs aus der `image`-Spalte von seed.sql lesen – kein zweites Mapping pflegen. */
async function slugsFromSeed() {
  const sql = await readFile(join(ROOT, 'seed.sql'), 'utf8');
  const slugs = new Set();
  for (const m of sql.matchAll(/,\s*'([A-Za-z0-9_.\-]+)'\s*\)/g)) slugs.add(m[1]);
  return [...slugs].sort();
}

const exists = (p) => access(p).then(() => true, () => false);

const slugs = await slugsFromSeed();
if (slugs.length === 0) {
  console.error('Keine Slugs in seed.sql gefunden – Regex prüfen.');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

let downloaded = 0;
let skipped = 0;
const failed = [];

for (const slug of slugs) {
  const target = join(OUT_DIR, `${slug}.jpg`);
  if (await exists(target)) {
    skipped++;
    continue;
  }
  const url = `${BASE}/${encodeURIComponent(slug)}/0.jpg`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
    downloaded++;
    console.log(`✓ ${slug}`);
  } catch (err) {
    failed.push(`${slug}: ${err.message}`);
    console.error(`✗ ${slug} – ${err.message}`);
  }
}

console.log(`\n${downloaded} geladen, ${skipped} vorhanden, ${failed.length} fehlgeschlagen.`);
if (failed.length) process.exit(1);
