import { readdir, readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, '_site');

function parseScalar(value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map(x => parseScalar(x)).filter(x => x !== '');
  return v;
}

function indentation(line) { return line.match(/^\s*/)?.[0].length ?? 0; }

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: text.trim() };
  const lines = match[1].split(/\r?\n/);
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim()) { i++; continue; }
    if (indentation(raw) !== 0) { i++; continue; }
    const m = raw.match(/^([^:#][^:]*):\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1].trim();
    const value = m[2].trim();
    if (value === '>' || value === '>-' || value === '>- ') {
      i++;
      const parts = [];
      while (i < lines.length && (lines[i].trim() === '' || indentation(lines[i]) > 0)) {
        if (lines[i].trim()) parts.push(lines[i].trim());
        i++;
      }
      data[key] = parts.join(' ').replace(/\s+/g, ' ').trim();
      continue;
    }
    if (value === '|' || value === '|-' || value === '|+') {
      i++;
      const parts = [];
      while (i < lines.length && (lines[i].trim() === '' || indentation(lines[i]) > 0)) {
        parts.push(lines[i].replace(/^\s{2}/, ''));
        i++;
      }
      data[key] = parts.join('\n').trim();
      continue;
    }
    if (value !== '') { data[key] = parseScalar(value); i++; continue; }
    const next = i + 1;
    if (next >= lines.length || !lines[next].trim()) { data[key] = ''; i++; continue; }
    const childIndent = indentation(lines[next]);
    if (childIndent === 0) { data[key] = ''; i++; continue; }
    if (lines[next].trim().startsWith('- ')) {
      const list = [];
      i = next;
      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) { i++; continue; }
        const ind = indentation(line);
        if (ind < childIndent) break;
        const itemMatch = line.trim().match(/^-\s*(.*)$/);
        if (!itemMatch) break;
        const itemText = itemMatch[1].trim();
        if (/^[A-Za-z0-9_-]+:\s*/.test(itemText)) {
          const obj = {};
          const first = itemText.match(/^([^:]+):\s*(.*)$/);
          obj[first[1].trim()] = parseScalar(first[2]);
          i++;
          while (i < lines.length && lines[i].trim() && indentation(lines[i]) > childIndent) {
            const nested = lines[i].trim().match(/^([^:]+):\s*(.*)$/);
            if (nested) obj[nested[1].trim()] = parseScalar(nested[2]);
            i++;
          }
          list.push(obj);
        } else { list.push(parseScalar(itemText)); i++; }
      }
      data[key] = list;
      continue;
    }
    const obj = {};
    i = next;
    while (i < lines.length && lines[i].trim() && indentation(lines[i]) > 0) {
      const nested = lines[i].trim().match(/^([^:]+):\s*(.*)$/);
      if (nested) obj[nested[1].trim()] = parseScalar(nested[2]);
      i++;
    }
    data[key] = obj;
  }
  return { data, body: match[2].trim() };
}

async function load(directory) {
  const path = join(root, 'content', directory);
  let names = [];
  try { names = await readdir(path); } catch { return []; }
  const result = [];
  for (const name of names.filter(n => n.endsWith('.md'))) {
    const parsed = parseFrontmatter(await readFile(join(path, name), 'utf8'));
    result.push({ ...parsed.data, body: parsed.body, file: name });
  }
  return result;
}

const pages = await load('pages');
const products = await load('products');
const categories = await load('categories');
const testimonials = await load('testimonials');
const factory = await load('factory');
let siteSettings = {};
try { siteSettings = parseFrontmatter(await readFile(join(root, 'content/site-settings.md'), 'utf8')).data; } catch {}

await mkdir(out, { recursive: true });
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (['_site', '.git', 'node_modules'].includes(entry.name) || entry.name === 'site-data.json') continue;
  await cp(join(root, entry.name), join(out, entry.name), { recursive: true });
}

await writeFile(join(out, 'site-data.json'), JSON.stringify({ generatedAt: new Date().toISOString(), siteSettings, pages, products, categories, testimonials, factory }, null, 2));
console.log(`Rosini data built: ${categories.length} categorii, ${products.length} produse, ${factory.length} fotografii din fabrică, ${testimonials.length} recenzii.`);
