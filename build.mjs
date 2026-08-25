import { readdir, readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, '_site');

function parseValue(v) {
  v = String(v ?? '').trim();
  if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map(x => x.trim().replace(/^['\"]|['\"]$/g, ''));
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

function parseMd(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  let current = null;
  let listObject = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^\s*-\s+/.test(line) && current) {
      const item = line.replace(/^\s*-\s+/, '');
      const nested = item.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (nested) {
        if (!Array.isArray(data[current])) data[current] = [];
        listObject = {};
        listObject[nested[1]] = parseValue(nested[2]);
        data[current].push(listObject);
      } else {
        if (!Array.isArray(data[current])) data[current] = [];
        data[current].push(parseValue(item));
        listObject = null;
      }
      continue;
    }
    const nestedField = line.match(/^\s{2,}([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nestedField && listObject) {
      listObject[nestedField[1]] = parseValue(nestedField[2]);
      continue;
    }
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1);
    data[k] = parseValue(v);
    current = k;
    listObject = null;
  }
  return { data, body: m[2].trim() };
}

async function load(dir) {
  const path = join(root, 'content', dir);
  let names = [];
  try { names = await readdir(path); } catch { return []; }
  const result = [];
  for (const name of names.filter(n => n.endsWith('.md'))) {
    const text = await readFile(join(path, name), 'utf8');
    const parsed = parseMd(text);
    result.push({ ...parsed.data, body: parsed.body, file: name });
  }
  return result;
}

const pages = await load('pages');
const products = await load('products');
const categories = await load('categories');
const portfolio = await load('portfolio');
const testimonials = await load('testimonials');
let siteSettings = {};
try { siteSettings = parseMd(await readFile(join(root, 'content/site-settings.md'), 'utf8')).data; } catch {}

await mkdir(out, { recursive: true });
const entries = await readdir(root, { withFileTypes: true });
for (const entry of entries) {
  if (['_site', '.git', 'node_modules'].includes(entry.name)) continue;
  if (entry.name === 'site-data.json') continue;
  await cp(join(root, entry.name), join(out, entry.name), { recursive: true });
}

await writeFile(join(out, 'site-data.json'), JSON.stringify({ generatedAt: new Date().toISOString(), siteSettings, pages, products, categories, portfolio, testimonials }, null, 2));
console.log(`Rosini data built: ${categories.length} categorii, ${products.length} produse, ${portfolio.length} proiecte, ${testimonials.length} recenzii.`);
