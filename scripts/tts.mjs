#!/usr/bin/env node
/* Speak Bardejov dusk-walk copy.

  npm run tts
  npm run tts -- --lang sk --what tour
  npm run tts -- --section gate
  npm run tts -- --text "Vstúpite do Bardejova."
  npm run tts -- --list
  npm run tts -- --engine edge --out public/audio/sk-top.mp3 --section top
*/
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'locales');
const langs = JSON.parse(readFileSync(join(localesDir, 'langs.json'), 'utf8'));
const LANGS = langs.map((l) => l.id);
const VOICE_KEYS = ['top', 'gate', 'pathways', 'lessons', 'suburb', 'walk', 'eternity'];
const SAY_PREF = {
  sk: ['laura', 'zuzana'],
  cs: ['iveta', 'zuzana'],
  en: ['daniel', 'serena', 'martha', 'samantha'],
  pl: ['zosia'],
  hu: ['tünde', 'tunde', 'mariska'],
  uk: ['lesya', 'lesja'],
};
const SAY_LOCALE = {
  sk: 'sk_',
  cs: 'cs_',
  en: 'en_gb',
  pl: 'pl_',
  hu: 'hu_',
  uk: 'uk_',
};
const EDGE_VOICE = {
  sk: 'sk-SK-ViktoriaNeural',
  cs: 'cs-CZ-VlastaNeural',
  en: 'en-GB-SoniaNeural',
  pl: 'pl-PL-ZofiaNeural',
  hu: 'hu-HU-NoemiNeural',
  uk: 'uk-UA-PolinaNeural',
};
const SKIP_SAY =
  /zarvox|whisper|bells|cellos|boing|bad news|good news|deranged|trinoids|organ|wobble|jester|princess|junior|albert|bahh|bubbles|superstar|kathy|fred/i;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function which(bin) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(finder, [bin], { encoding: 'utf8' });
  if (r.status !== 0) return '';
  return (r.stdout || '').trim().split(/\r?\n/)[0] || '';
}

function prepareSpeech(text) {
  let line = String(text || '');
  line = line.replace(/UNESCO|ЮНЕСКО/g, 'Unesco');
  line = line.replace(/[·•]/g, ', ');
  line = line.replace(/[—–]/g, ', ');
  return line.replace(/\s+/g, ' ').trim();
}

function loadI18n() {
  const packs = {};
  for (const id of LANGS) {
    const path = join(localesDir, `${id}.json`);
    try {
      packs[id] = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      fail(`missing ${path}`);
    }
  }
  return packs;
}

function macVoices() {
  if (!which('say')) return [];
  const r = spawnSync('say', ['-v', '?'], { encoding: 'utf8' });
  if (r.status !== 0) return [];
  const rows = [];
  for (const line of (r.stdout || '').split(/\r?\n/)) {
    const m = line.match(/^(\S+(?:\s+\S+)*?)\s+([a-z]{2}[_-][A-Za-z0-9]+)\s+#/);
    if (!m) continue;
    const name = m[1].trim();
    const loc = m[2].replace(/-/g, '_').toLowerCase();
    if (SKIP_SAY.test(name)) continue;
    rows.push([name, loc]);
  }
  return rows;
}

function pickSayVoice(lang, override) {
  if (override) return override;
  const pref = SAY_PREF[lang] || [];
  const loc = SAY_LOCALE[lang] || `${lang}_`;
  const scored = [];
  for (const [name, code] of macVoices()) {
    let s = -1;
    if (code.startsWith(loc) || code === loc.replace(/_$/, '')) s = 90;
    else if (lang === 'en' && code.startsWith('en_')) s = 40;
    else continue;
    const low = name.toLowerCase();
    if (pref.some((p) => low.includes(p))) s += 36;
    scored.push([s, name]);
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b[0] - a[0] || b[1].localeCompare(a[1]));
  return scored[0][1];
}

function speakSay(text, voice, rate, out) {
  const cmd = ['-r', String(rate)];
  if (voice) cmd.push('-v', voice);
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    cmd.push('-o', out);
    const ext = extname(out).toLowerCase();
    if (ext === '.wav' || ext === '.wave') cmd.push('--data-format=LEF32@22050');
  }
  cmd.push(text);
  const r = spawnSync('say', cmd, { stdio: 'inherit' });
  if (r.status !== 0) fail('say failed');
}

async function speakEdge(text, voice, rate, out) {
  let Communicate;
  try {
    ({ Communicate } = await import('@travisvn/edge-tts'));
  } catch {
    fail('edge TTS needs @travisvn/edge-tts. Run: npm i -D @travisvn/edge-tts');
  }
  const communicate = new Communicate(text, { voice, rate });
  const buffers = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === 'audio' && chunk.data) buffers.push(chunk.data);
  }
  if (!buffers.length) fail('edge TTS returned no audio');
  const audio = Buffer.concat(buffers);
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, audio);
    return;
  }
  const player = which('afplay') || which('ffplay');
  if (!player) fail('edge TTS needs --out FILE, or afplay/ffplay on PATH to play');
  const tmp = join(tmpdir(), 'bardejov-tts.mp3');
  writeFileSync(tmp, audio);
  const playArgs = player.endsWith('ffplay') ? ['-nodisp', '-autoexit', tmp] : [tmp];
  const r = spawnSync(player, playArgs, { stdio: 'inherit' });
  if (r.status !== 0) fail(`${player} failed`);
}

function linesFor(pack, what, section) {
  const rows = [];
  if (what === 'voice' || what === 'all') {
    const voice = pack.voice || {};
    const keys = section ? [section] : VOICE_KEYS;
    for (const key of keys) {
      if (!(key in voice)) fail(`unknown section '${key}'. try: ${VOICE_KEYS.join(', ')}`);
      rows.push(voice[key]);
    }
  }
  if (what === 'tour' || what === 'all') {
    if (section && what === 'tour') fail('--section is for voice chapters, not tour');
    for (const step of pack.tour || []) {
      const title = (step.title || '').trim();
      const k = (step.k || '').trim();
      rows.push(k ? `${title}. ${k}` : title);
    }
  }
  return rows.map(prepareSpeech).filter(Boolean);
}

function parseArgs(argv) {
  const args = {
    lang: 'sk',
    what: 'voice',
    section: null,
    text: null,
    engine: 'auto',
    voice: null,
    rate: 165,
    out: null,
    list: false,
    help: false,
  };
  const take = (flag, i) => {
    const v = argv[i + 1];
    if (v == null || v.startsWith('--')) fail(`missing value for ${flag}`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--list') args.list = true;
    else if (a === '--lang') args.lang = take(a, i++);
    else if (a === '--what') args.what = take(a, i++);
    else if (a === '--section') args.section = take(a, i++);
    else if (a === '--text') args.text = take(a, i++);
    else if (a === '--engine') args.engine = take(a, i++);
    else if (a === '--voice') args.voice = take(a, i++);
    else if (a === '--rate') args.rate = Number(take(a, i++));
    else if (a === '--out') args.out = take(a, i++);
    else fail(`unknown flag ${a}`);
  }
  if (args.help) return args;
  if (!LANGS.includes(args.lang)) fail(`--lang must be ${LANGS.join(', ')}`);
  if (!['voice', 'tour', 'all'].includes(args.what)) fail('--what must be voice, tour or all');
  if (args.section && !VOICE_KEYS.includes(args.section)) {
    fail(`--section must be ${VOICE_KEYS.join(', ')}`);
  }
  if (!['say', 'edge', 'auto'].includes(args.engine)) fail('--engine must be say, edge or auto');
  if (!Number.isFinite(args.rate)) fail('--rate must be a number');
  return args;
}

function resolveEngine(name) {
  if (name !== 'auto') return name;
  return which('say') ? 'say' : 'edge';
}

function printHelp() {
  console.log(`Text-to-speech for Bardejov dusk-walk copy.

  npm run tts
  npm run tts -- --lang sk --what tour
  npm run tts -- --section gate
  npm run tts -- --text "Vstúpite do Bardejova."
  npm run tts -- --list
  npm run tts -- --engine edge --out public/audio/sk-top.mp3 --section top`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.list) {
    const voices = macVoices();
    if (!voices.length) fail('macOS say is not available');
    for (const [name, loc] of voices) {
      let mark = '';
      for (const [lid, prefix] of Object.entries(SAY_LOCALE)) {
        if (loc.startsWith(prefix) || (lid === 'en' && loc.startsWith('en_'))) {
          mark = `  [${lid}]`;
          break;
        }
      }
      console.log(`${name.padEnd(20)} ${loc}${mark}`);
    }
    return;
  }

  const engine = resolveEngine(args.engine);
  const chunks = args.text
    ? [prepareSpeech(args.text)]
    : linesFor(
        loadI18n()[args.lang] || fail(`no i18n pack for ${args.lang}`),
        args.what,
        args.section
      );
  if (!chunks.length) fail('nothing to speak');

  if (engine === 'say') {
    const voice = pickSayVoice(args.lang, args.voice);
    if (!voice) fail(`no macOS voice for ${args.lang}. try --engine edge or --list`);
    console.error(`say · ${args.lang} · ${voice}`);
    if (args.out && chunks.length > 1)
      fail('--out with say can write one file; pass --section or --text');
    for (let i = 0; i < chunks.length; i++) {
      console.log(chunks[i]);
      speakSay(chunks[i], voice, args.rate, i === 0 ? args.out : null);
    }
    return;
  }

  const voice = args.voice || EDGE_VOICE[args.lang];
  const rate = `${Math.max(-50, Math.min(50, args.rate - 175))}%`;
  console.error(`edge · ${args.lang} · ${voice}`);
  if (args.out && chunks.length > 1)
    fail('--out with edge can write one file; pass --section or --text');
  if (args.out) {
    const joined = chunks.join(' ');
    console.log(joined);
    await speakEdge(joined, voice, rate, args.out);
    return;
  }
  for (const line of chunks) {
    console.log(line);
    await speakEdge(line, voice, rate, null);
  }
}

main().catch((err) => fail(err?.message || String(err)));
