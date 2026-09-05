#!/usr/bin/env node
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public/assets');

function walk(folder) {
  const out = [];
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.jpe?g$/i.test(name) && !name.includes('-800') && !name.includes('-1280')) {
      out.push(path);
    }
  }
  return out;
}

function fresh(out, src) {
  try {
    return statSync(out).mtimeMs >= statSync(src).mtimeMs;
  } catch {
    return false;
  }
}

async function write(src, out, width, type) {
  if (fresh(out, src)) return false;
  mkdirSync(dirname(out), { recursive: true });
  let img = sharp(src).rotate();
  if (width) img = img.resize({ width, withoutEnlargement: true });
  if (type === 'avif') img = img.avif({ quality: 48, effort: 4 });
  else img = img.webp({ quality: 74 });
  await img.toFile(out);
  return true;
}

const files = walk(dir);
let made = 0;
for (const src of files) {
  const rel = relative(dir, src);
  const base = rel.slice(0, -extname(rel).length);
  const meta = await sharp(src).metadata();
  const w = meta.width || 0;
  const jobs = [
    [join(dir, `${base}.avif`), null, 'avif'],
    [join(dir, `${base}.webp`), null, 'webp'],
  ];
  if (w > 1000) {
    jobs.push(
      [join(dir, `${base}-800.avif`), 800, 'avif'],
      [join(dir, `${base}-800.webp`), 800, 'webp']
    );
  }
  if (w > 1400) {
    jobs.push(
      [join(dir, `${base}-1280.avif`), 1280, 'avif'],
      [join(dir, `${base}-1280.webp`), 1280, 'webp']
    );
  }
  for (const [out, width, type] of jobs) {
    if (await write(src, out, width, type)) made += 1;
  }
  process.stdout.write(`ok ${rel}\n`);
}
console.log(`images ${files.length} sources, wrote ${made} files`);
