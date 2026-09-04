#!/usr/bin/env node
/**
 * Manueller Passwort-Reset ohne Mailversand.
 *
 * Druckt einen Hash-String im Format pbkdf2$<iterations>$<salt_b64>$<hash_b64>
 * – identisch zu src/lib/auth.ts. Einsatz:
 *
 *   node scripts/hash-password.mjs 25000
 *   npx wrangler d1 execute fit-man-db --remote --command \
 *     "UPDATE users SET password_hash='<ausgabe>' WHERE email='ich@example.com';"
 *   npx wrangler d1 execute fit-man-db --remote --command \
 *     "DELETE FROM sessions WHERE user_id=(SELECT id FROM users WHERE email='ich@example.com');"
 *
 * Die Iterationszahl sollte dem Deployment entsprechen
 * (wrangler.toml [vars] PBKDF2_ITERATIONS; lokal default 25000).
 * Das Passwort wird interaktiv abgefragt und nirgends gespeichert.
 */

import { createInterface } from 'node:readline/promises';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { stdin } from 'node:process';

const iterations = Math.max(10_000, Math.min(1_000_000, Math.round(Number(process.argv[2])) || 25_000));

const rl = createInterface({ input: stdin, output: process.stdout });
const password = await rl.question('Neues Passwort (mind. 8 Zeichen): ');
rl.close();

if (!password || password.length < 8) {
  console.error('Abgebrochen: Passwort muss mindestens 8 Zeichen lang sein.');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');

console.log('\npassword_hash:');
console.log(`pbkdf2$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`);
