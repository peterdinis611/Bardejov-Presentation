#!/usr/bin/env node
/* Validate locale packs: every language matches SK keys and shape. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chapterKeys = ['gateK', 'pathK', 'lesK', 'annK', 'gldK', 'altK', 'subK', 'walkK'];

function load(name) {
  return JSON.parse(readFileSync(join(root, 'locales', name), 'utf8'));
}

const langs = load('langs.json');
const ids = langs.map((l) => l.id);
if (!ids.length || ids[0] !== 'sk') {
  throw new Error('locales/langs.json must start with sk');
}
const packs = Object.fromEntries(ids.map((id) => [id, load(`${id}.json`)]));
const sk = packs.sk;

for (const [lid, pack] of Object.entries(packs)) {
  const missingUi = Object.keys(sk.ui).filter((k) => !(k in pack.ui));
  const extraUi = Object.keys(pack.ui).filter((k) => !(k in sk.ui));
  const missingCat = Object.keys(sk.cat).filter((k) => !(k in pack.cat));
  if (missingUi.length) throw new Error(`${lid} ui missing: ${missingUi.join(', ')}`);
  if (extraUi.length) throw new Error(`${lid} ui extra: ${extraUi.join(', ')}`);
  if (missingCat.length) throw new Error(`${lid} cat missing: ${missingCat.join(', ')}`);
  if (Object.keys(pack.voice).sort().join() !== Object.keys(sk.voice).sort().join()) {
    throw new Error(`${lid} voice keys differ from SK`);
  }
  if (Object.keys(pack.meta).sort().join() !== Object.keys(sk.meta).sort().join()) {
    throw new Error(`${lid} meta keys differ from SK`);
  }
  if ((pack.meta.places || []).length !== sk.meta.places.length) {
    throw new Error(`${lid} meta.places length differs from SK`);
  }
  if ((pack.hints || []).length !== 5) throw new Error(`${lid} needs 5 hints`);
  if ((pack.tour || []).length !== 5) throw new Error(`${lid} needs 5 tour beats`);
  const iterKeys = Object.keys(pack.iters || {})
    .sort()
    .join();
  if (iterKeys !== '2h,full,half') throw new Error(`${lid} iters must be 2h / half / full`);
  for (const key of chapterKeys) {
    if (/^.+ — /.test(pack.ui[key] || '')) {
      throw new Error(`${lid} ${key} still has a chapter prefix`);
    }
  }
}

console.log(`i18n ok — ${ids.join(', ')}`);
