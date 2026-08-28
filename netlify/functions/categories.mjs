import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';

const REPO = 'davidperiade/rosini-rebuild';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${REPO}/contents`;
const STORE_NAME = 'rosini-runtime-categories';
const KEY = 'categories';
const bootstrapAdmins = new Set(['rosinigrup@gmail.com', 'davidperiade@gmail.com']);

const store = () => getStore({ name: STORE_NAME, consistency: 'strong' });

async function isAdmin() {
  const user = await getUser();
  if (!user) return false;
  return Boolean(user.roles?.includes('admin')) || bootstrapAdmins.has(String(user.email || '').toLowerCase());
}

function scalar(value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function parseFrontMatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: text.trim() };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const hit = line.match(/^([^:#][^:]*):\s*(.*)$/);
    if (hit) data[hit[1].trim()] = scalar(hit[2]);
  }
  return { data, body: match[2].trim() };
}

async function githubJson(path) {
  const response = await fetch(`${API}/${path}?ref=${BRANCH}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Rosini-Live-CMS' },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`GitHub ${response.status} pentru ${path}`);
  return response.json();
}

async function loadBaseCategories() {
  const entries = await githubJson('content/categories');
  const files = entries.filter((x) => x.type === 'file' && x.name.endsWith('.md'));
  const categories = await Promise.all(files.map(async (file) => {
    const response = await fetch(file.download_url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Nu s-a putut citi ${file.path}`);
    const parsed = parseFrontMatter(await response.text());
    return { ...parsed.data, body: parsed.body, file: file.name };
  }));
  return categories.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

async function loadCategories() {
  const saved = await store().get(KEY, { type: 'json', consistency: 'strong' });
  if (Array.isArray(saved)) return saved;
  const base = await loadBaseCategories();
  await store().setJSON(KEY, base);
  return base;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function cleanCategory(input, existing = {}) {
  const title = String(input.title ?? existing.title ?? '').trim();
  const slug = slugify(input.slug ?? existing.slug ?? title);
  const description = String(input.description ?? existing.description ?? '').trim();
  const image = String(input.image ?? existing.image ?? '').trim();
  const alt_text = String(input.alt_text ?? existing.alt_text ?? title).trim();
  const order = Number.isFinite(Number(input.order ?? existing.order)) ? Number(input.order ?? existing.order) : 0;
  const active = input.active === undefined ? existing.active !== false : Boolean(input.active);
  const body = String(input.body ?? existing.body ?? '').trim();
  if (!title) throw new Error('Introdu denumirea categoriei.');
  if (!slug) throw new Error('Slug-ul categoriei nu este valid.');
  return { ...existing, title, slug, description, image, alt_text, order, active, body };
}

function sortCategories(items) {
  return [...items].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'ro'));
}

export default async (request) => {
  try {
    if (request.method === 'GET') {
      return Response.json(sortCategories(await loadCategories()), { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    }

    if (!(await isAdmin())) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const current = await loadCategories();

    if (request.method === 'POST') {
      const body = await request.json();
      const category = cleanCategory(body);
      if (current.some((item) => item.slug === category.slug)) return Response.json({ error: 'Există deja o categorie cu acest slug.' }, { status: 409 });
      category.file = `${category.slug}.md`;
      const next = sortCategories([...current, category]);
      await store().setJSON(KEY, next);
      return Response.json(category, { status: 201 });
    }

    if (request.method === 'PUT' || request.method === 'PATCH') {
      const body = await request.json();
      const id = String(body.id || body.file || body.slug || '').trim();
      const index = current.findIndex((item) => String(item.slug || item.file) === id || String(item.file) === id);
      if (index < 0) return Response.json({ error: 'Categoria nu a fost găsită.' }, { status: 404 });
      const updated = cleanCategory(body, current[index]);
      const duplicate = current.findIndex((item, i) => i !== index && item.slug === updated.slug);
      if (duplicate >= 0) return Response.json({ error: 'Există deja o altă categorie cu acest slug.' }, { status: 409 });
      updated.file = current[index].file || `${updated.slug}.md`;
      current[index] = updated;
      const next = sortCategories(current);
      await store().setJSON(KEY, next);
      return Response.json(updated);
    }

    if (request.method === 'DELETE') {
      const body = await request.json();
      const id = String(body.id || body.file || body.slug || '').trim();
      const index = current.findIndex((item) => String(item.slug || item.file) === id || String(item.file) === id);
      if (index < 0) return Response.json({ error: 'Categoria nu a fost găsită.' }, { status: 404 });
      const removed = current[index];
      const next = current.filter((_, i) => i !== index);
      await store().setJSON(KEY, next);
      return Response.json({ deleted: removed });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Operațiunea asupra categoriilor a eșuat.' }, { status: 500 });
  }
};

export const config = { path: '/api/categories' };
