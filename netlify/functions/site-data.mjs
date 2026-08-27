const REPO = 'davidperiade/rosini-rebuild';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${REPO}/contents`;

const scalar = (value) => {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
};

const indent = (s) => s.match(/^\s*/)?.[0].length ?? 0;

function parseFrontMatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: text.trim() };
  const lines = match[1].split(/\r?\n/);
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim()) { i++; continue; }
    if (indent(raw) !== 0) { i++; continue; }
    const hit = raw.match(/^([^:#][^:]*):\s*(.*)$/);
    if (!hit) { i++; continue; }
    const key = hit[1].trim();
    const value = hit[2].trim();
    if (value === '>' || value === '>-' || value === '>+') {
      i++;
      const parts = [];
      while (i < lines.length && (lines[i].trim() === '' || indent(lines[i]) > 0)) {
        if (lines[i].trim()) parts.push(lines[i].trim());
        i++;
      }
      data[key] = parts.join(' ').replace(/\s+/g, ' ').trim();
      continue;
    }
    if (value === '|' || value === '|-' || value === '|+') {
      i++;
      const parts = [];
      while (i < lines.length && (lines[i].trim() === '' || indent(lines[i]) > 0)) {
        parts.push(lines[i].replace(/^\s{2}/, ''));
        i++;
      }
      data[key] = parts.join('\n').trim();
      continue;
    }
    if (value !== '') { data[key] = scalar(value); i++; continue; }
    const next = i + 1;
    if (next >= lines.length || !lines[next].trim()) { data[key] = ''; i++; continue; }
    const childIndent = indent(lines[next]);
    if (childIndent === 0) { data[key] = ''; i++; continue; }
    if (lines[next].trim().startsWith('- ')) {
      const list = [];
      i = next;
      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) { i++; continue; }
        if (indent(line) < childIndent) break;
        const item = line.trim().match(/^-\s*(.*)$/);
        if (!item) break;
        const first = item[1].trim();
        if (/^[A-Za-z0-9_-]+:\s*/.test(first)) {
          const obj = {};
          const field = first.match(/^([^:]+):\s*(.*)$/);
          obj[field[1].trim()] = scalar(field[2]);
          i++;
          while (i < lines.length && lines[i].trim() && indent(lines[i]) > childIndent) {
            const nested = lines[i].trim().match(/^([^:]+):\s*(.*)$/);
            if (nested) obj[nested[1].trim()] = scalar(nested[2]);
            i++;
          }
          list.push(obj);
        } else {
          list.push(scalar(first));
          i++;
        }
      }
      data[key] = list;
      continue;
    }
    const obj = {};
    i = next;
    while (i < lines.length && lines[i].trim() && indent(lines[i]) > 0) {
      const nested = lines[i].trim().match(/^([^:]+):\s*(.*)$/);
      if (nested) obj[nested[1].trim()] = scalar(nested[2]);
      i++;
    }
    data[key] = obj;
  }
  return { data, body: match[2].trim() };
}

async function githubJson(path) {
  const response = await fetch(`${API}/${path}?ref=${BRANCH}`, {
    headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'Rosini-Live-CMS' },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${path}`);
  return response.json();
}

async function loadCollection(name) {
  const entries = await githubJson(`content/${name}`);
  const files = entries.filter((x) => x.type === 'file' && x.name.endsWith('.md'));
  return Promise.all(files.map(async (file) => {
    const raw = await fetch(file.download_url, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`Unable to read ${file.path}`);
      return r.text();
    });
    const parsed = parseFrontMatter(raw);
    return { ...parsed.data, body: parsed.body, file: file.name };
  }));
}

export default async (request) => {
  try {
    const settingsRaw = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/content/site-settings.md?ts=${Date.now()}`, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error('Unable to read site settings');
      return r.text();
    });
    const settings = parseFrontMatter(settingsRaw).data;
    const [pages, products, categories, testimonials, factory] = await Promise.all([
      loadCollection('pages'),
      loadCollection('products'),
      loadCollection('categories'),
      loadCollection('testimonials'),
      loadCollection('factory')
    ]);
    return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), siteSettings: settings, pages, products, categories, testimonials, factory }), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'cdn-cache-control': 'no-store'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Live CMS data unavailable', detail: error.message }), {
      status: 502,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
};
