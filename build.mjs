import { readdir, readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, '_site');

function scalar(v) {
  v = String(v ?? '').trim();
  if (!v) return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map(scalar).filter(v => v !== '');
  return v;
}
function indent(s) { return s.match(/^\s*/)?.[0].length ?? 0; }
function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: text.trim() };
  const lines = match[1].split(/\r?\n/);
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim() || indent(raw) !== 0) { i++; continue; }
    const hit = raw.match(/^([^:#][^:]*):\s*(.*)$/);
    if (!hit) { i++; continue; }
    const key = hit[1].trim();
    const value = hit[2].trim();
    if (value === '>' || value === '>-' || value === '>- ') {
      i++;
      const parts = [];
      while (i < lines.length && (lines[i].trim() === '' || indent(lines[i]) > 0)) { if (lines[i].trim()) parts.push(lines[i].trim()); i++; }
      data[key] = parts.join(' ').replace(/\s+/g, ' ').trim();
      continue;
    }
    if (value === '|' || value === '|-' || value === '|+') {
      i++;
      const parts = [];
      while (i < lines.length && (lines[i].trim() === '' || indent(lines[i]) > 0)) { parts.push(lines[i].replace(/^\s{2}/, '')); i++; }
      data[key] = parts.join('\n').trim();
      continue;
    }
    if (value !== '') { data[key] = scalar(value); i++; continue; }
    const next = i + 1;
    if (next >= lines.length || !lines[next].trim() || indent(lines[next]) === 0) { data[key] = ''; i++; continue; }
    const childIndent = indent(lines[next]);
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
          const firstMatch = first.match(/^([^:]+):\s*(.*)$/);
          obj[firstMatch[1].trim()] = scalar(firstMatch[2]);
          i++;
          while (i < lines.length && lines[i].trim() && indent(lines[i]) > childIndent) {
            const nested = lines[i].trim().match(/^([^:]+):\s*(.*)$/);
            if (nested) obj[nested[1].trim()] = scalar(nested[2]);
            i++;
          }
          list.push(obj);
        } else { list.push(scalar(first)); i++; }
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

async function loadMarkdownDir(dir) {
  const path = join(root, 'content', dir);
  let names = [];
  try { names = await readdir(path); } catch { return []; }
  const rows = [];
  for (const name of names.filter(n => n.endsWith('.md')).sort()) {
    const parsed = parseFrontmatter(await readFile(join(path, name), 'utf8'));
    rows.push({ ...parsed.data, body: parsed.body, file: name });
  }
  return rows;
}

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])); }
function attr(value) { return esc(value); }
function renderMarkdown(value) {
  const source = String(value || '').trim();
  if (!source) return '';
  return source.split(/\n\s*\n/).map(block => {
    const text = block.trim();
    if (/^###\s+/.test(text)) return `<h3>${esc(text.replace(/^###\s+/, ''))}</h3>`;
    if (/^##\s+/.test(text)) return `<h2>${esc(text.replace(/^##\s+/, ''))}</h2>`;
    if (/^#\s+/.test(text)) return `<h2>${esc(text.replace(/^#\s+/, ''))}</h2>`;
    return `<p>${esc(text).replace(/\n/g, '<br>')}</p>`;
  }).join('');
}
function normalizePhone(value) { return String(value || '').replace(/\D/g, ''); }
function waLink(phone, message) {
  const digits = normalizePhone(phone);
  const international = digits.startsWith('0') ? `40${digits.slice(1)}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message || '')}`;
}
function imagePath(value, fallback = '/content/images/placeholder-product.svg') { const v = String(value || '').trim(); return v || fallback; }

const settings = parseFrontmatter(await readFile(join(root, 'content/site-settings.md'), 'utf8')).data;
const pages = Object.fromEntries((await loadMarkdownDir('pages')).map(p => [p.file.replace(/\.md$/, ''), p]));
const products = await loadMarkdownDir('products');
const categories = await loadMarkdownDir('categories');
const testimonials = (await loadMarkdownDir('testimonials')).filter(r => r.approved !== false && r.active !== false);
const gallery = await loadMarkdownDir('gallery');
const data = { settings, pages, products, categories, testimonials, gallery, generatedAt: new Date().toISOString() };
const serialized = JSON.stringify(data).replace(/</g, '\\u003c');

const phone = normalizePhone(settings.phone_primary);
const whatsapp = waLink(settings.whatsapp_phone || settings.phone_primary, settings.whatsapp_message);
const canonical = settings.canonical_url || 'https://rosini-site.netlify.app/';
const logo = imagePath(settings.logo, '/content/images/rosini-logo.svg');
const ogImage = imagePath(settings.og_image || settings.hero_image, logo);

const baseHead = (title, description, path = '/') => `
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${attr(description || settings.site_description)}">
<link rel="canonical" href="${attr(new URL(path, canonical).href)}">
<link rel="icon" href="/content/images/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website"><meta property="og:locale" content="ro_RO">
<meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(description || settings.site_description)}">
<meta property="og:image" content="${attr(new URL(ogImage, canonical).href)}"><meta property="og:url" content="${attr(new URL(path, canonical).href)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attr(title)}"><meta name="twitter:description" content="${attr(description || settings.site_description)}"><meta name="twitter:image" content="${attr(new URL(ogImage, canonical).href)}"><title>${esc(title)}</title>`;

const header = `
<header class="site-header"><div class="container header-inner">
<a class="brand" href="/" aria-label="Rosini — Acasă"><img id="site-logo" src="${attr(logo)}" alt="Rosini" width="156" height="52"></a>
<button class="menu-toggle" type="button" aria-label="Deschide meniul" aria-expanded="false" aria-controls="site-navigation"><span></span><span></span><span></span></button>
<nav id="site-navigation" class="site-nav" aria-label="Navigare principală"><a href="/">Acasă</a><a href="/produse.html">Produse</a><a href="/despre.html">Despre noi</a><a href="/contact.html">Showroom / Contact</a><a href="/recenzii.html">Recenzii</a><a class="nav-cta" href="${attr(whatsapp)}" target="_blank" rel="noopener">Cere ofertă</a></nav>
</div></header>`;
const footer = `
<footer class="site-footer"><div class="container footer-grid"><div><a class="brand footer-brand" href="/"><img id="footer-logo" src="${attr(logo)}" alt="Rosini" width="156" height="52"></a><p>${esc(settings.footer_tagline || settings.site_description)}</p></div><div><h2>Contact</h2><p><a href="tel:+${phone}">${esc(settings.phone_primary)}</a><br><a href="mailto:${attr(settings.email)}">${esc(settings.email)}</a><br>${esc(settings.address)}</p></div><div><h2>Linkuri</h2><p><a href="/produse.html">Produse</a><br><a href="/despre.html">Despre noi</a><br><a href="/contact.html">Showroom / Contact</a><br><a href="/politica-confidentialitate.html">Politica de confidențialitate</a><br><a href="/politica-cookie-uri.html">Politica de cookie-uri</a></p></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} Rosini. Toate drepturile rezervate.</span><span><a href="${attr(settings.facebook_url || '#')}" target="_blank" rel="noopener">Facebook</a> · <a href="${attr(settings.instagram_url || '#')}" target="_blank" rel="noopener">Instagram</a></span></div></footer>`;
const floating = `<a id="whatsapp-float" class="whatsapp-float" href="${attr(whatsapp)}" target="_blank" rel="noopener" aria-label="Contactează Rosini pe WhatsApp">WhatsApp</a>`;
const scripts = `<script>window.__ROSINI_DATA__=${serialized};</script><script src="/assets/js/app.js" defer></script>`;
function page({ title, description, path, content, schema = '' }) { return `<!doctype html><html lang="ro"><head>${baseHead(title, description, path)}${schema}</head><body>${header}<main>${content}</main>${floating}${footer}${scripts}</body></html>`; }

const heroImage = imagePath(settings.hero_image, '/content/images/placeholder-product.svg');
const heroMobile = imagePath(settings.hero_image_mobile || settings.hero_image, heroImage);
const benefitItems = (settings.benefits?.length ? settings.benefits : [
  { title: settings.experience_since ? `Din ${settings.experience_since}` : 'Producție locală', description: 'experiență Rosini' },
  { title: settings.warranty_months ? `${settings.warranty_months} luni` : 'La comandă', description: settings.warranty_months ? 'garanție' : 'după spațiul tău' },
  { title: 'La comandă', description: 'configurație adaptată spațiului' }
]).slice(0, 3);
const activeCategories = categories.filter(c => c.active !== false).sort((a,b) => Number(a.order || 0) - Number(b.order || 0));
const activeProducts = products.filter(p => p.active !== false).sort((a,b) => Number(a.order || 0) - Number(b.order || 0)).slice(0, 8);
const categoryCards = activeCategories.length ? activeCategories.map(c => `<a class="category-card" href="/produse.html?categorie=${encodeURIComponent(c.slug || c.title || '')}"><img src="${attr(imagePath(c.image))}" alt="${attr(c.alt_text || c.title)}" loading="lazy"><div><span>${esc(c.title)}</span><p>${esc(c.description)}</p></div></a>`).join('') : `<div class="empty-state"><p>Descoperă mobilierul Rosini și cere o ofertă personalizată.</p><a class="button button-dark" href="${attr(whatsapp)}" target="_blank" rel="noopener">Cere ofertă</a></div>`;
const productCards = activeProducts.length ? activeProducts.map(p => `<article class="product-card"><a href="/produs.html?slug=${encodeURIComponent(p.slug || p.file.replace(/\.md$/, ''))}"><img src="${attr(imagePath(p.image))}" alt="${attr(p.alt_text || p.name)}" loading="lazy"><div class="product-card-body"><p class="eyebrow">${esc(p.category || 'Rosini')}</p><h3>${esc(p.name)}</h3><p>${esc(p.short_description || p.description || '')}</p><span class="text-link">Vezi detalii →</span></div></a></article>`).join('') : `<div class="empty-state"><p>Momentan nu sunt produse publicate. Cere o ofertă pentru un model realizat la comandă.</p><a class="button button-dark" href="${attr(whatsapp)}" target="_blank" rel="noopener">Cere ofertă</a></div>`;
const differentiators = (settings.differentiators || []).slice(0, 4);
const diffCards = differentiators.map((d,i) => `<article class="number-card"><span>0${i+1}</span><h3>${esc(d.title)}</h3><p>${esc(d.description)}</p></article>`).join('');
const steps = (settings.process_steps || []).slice(0, 3);
const stepCards = steps.map((s,i) => `<article class="step"><span>0${i+1}</span><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p></article>`).join('');
const reviewCards = testimonials.slice(0, 3).map(r => `<article class="review-card"><div class="stars">★★★★★</div><p>„${esc(r.text || r.body)}”</p><strong>${esc(r.name || r.author || 'Client Rosini')}</strong>${r.location ? `<span>${esc(r.location)}</span>` : ''}</article>`).join('');
const gallerySource = gallery.length ? gallery : (Array.isArray(settings.showroom_gallery) ? settings.showroom_gallery.map((g,i) => ({...g, order:i, active:!!g.image})) : []);
const galleryItems = gallerySource.filter(g => g.active !== false && g.image).sort((a,b) => Number(a.order || 0) - Number(b.order || 0)).map(g => `<figure><img src="${attr(imagePath(g.image))}" alt="${attr(g.alt_text || g.title || 'Rosini')}" loading="lazy"><figcaption>${esc(g.title || '')}</figcaption></figure>`).join('');

const homeContent = `<section class="hero"><div class="container hero-grid"><div class="hero-copy"><p class="eyebrow">${esc(settings.hero_eyebrow)}</p><h1>${esc(settings.hero_title)}</h1><p class="hero-lead">${esc(settings.hero_subtitle)}</p><div class="actions"><a class="button button-primary" href="${attr(whatsapp)}" target="_blank" rel="noopener">${esc(settings.hero_whatsapp_cta || 'Cere o ofertă pe WhatsApp')}</a><a class="button button-outline" href="/produse.html">${esc(settings.hero_primary_cta || 'Vezi produsele')}</a></div><div class="benefits">${benefitItems.map(b => `<div><strong>${esc(b.title || '')}</strong><span>${esc(b.description || '')}</span></div>`).join('')}</div></div><picture class="hero-media"><source media="(max-width: 700px)" srcset="${attr(heroMobile)}"><img src="${attr(heroImage)}" alt="${attr(settings.hero_alt_text || 'Mobilier tapițat Rosini')}"></picture></div></section>
<section class="section section-light"><div class="container narrow"><p class="eyebrow">${esc(settings.differentiators_eyebrow || 'Ce nu se vede')}</p><h2>${esc(settings.differentiators_title || 'Diferența este în interiorul fiecărei piese.')}</h2><p class="section-intro">${esc(settings.differentiators_intro || '')}</p></div><div class="container number-grid">${diffCards}</div></section>
<section class="section"><div class="container section-heading"><div><p class="eyebrow">${esc(settings.collections_eyebrow || 'Colecții')}</p><h2>${esc(settings.collections_title || 'Descoperă mobilierul Rosini')}</h2></div><a class="text-link" href="/produse.html">${esc(settings.collections_cta || 'Vezi toate produsele →')}</a></div><div class="container category-grid">${categoryCards}</div></section>
<section class="section section-soft"><div class="container section-heading"><div><p class="eyebrow">Produse reprezentative</p><h2>Modele pe care le putem adapta spațiului tău.</h2></div><a class="text-link" href="/produse.html">Vezi catalogul →</a></div><div class="container product-grid">${productCards}</div></section>
<section class="section section-dark"><div class="container narrow"><p class="eyebrow">${esc(settings.process_eyebrow || 'Simplu și transparent')}</p><h2>${esc(settings.process_title || 'Cum funcționează realizarea mobilierului tău?')}</h2></div><div class="container steps-grid">${stepCards}</div><div class="container center"><a class="button button-green" href="${attr(whatsapp)}" target="_blank" rel="noopener">${esc(settings.hero_whatsapp_cta || 'Cere o ofertă pe WhatsApp')}</a></div></section>
<section class="section"><div class="container showroom-grid"><div><p class="eyebrow">${esc(settings.showroom_eyebrow || 'Vizitează-ne în Iași')}</p><h2>${esc(settings.showroom_title || 'Te așteptăm în showroom-ul Rosini')}</h2><p class="section-intro">${esc(settings.showroom_text || '')}</p><div class="hours"><p>${esc(settings.showroom_hours_weekdays || '')}</p><p>${esc(settings.showroom_hours_saturday || '')}</p></div><a class="button button-primary" href="${attr(settings.showroom_maps_url || '#')}" target="_blank" rel="noopener">${esc(settings.showroom_cta || 'Navighează către Showroom (Google Maps)')}</a></div>${galleryItems ? `<div class="gallery-grid">${galleryItems}</div>` : ''}</div></section>
<section class="section section-soft"><div class="container section-heading"><div><p class="eyebrow">${esc(settings.reviews_eyebrow || 'Recenzii')}</p><h2>${esc(settings.reviews_title || 'Experiențe reale de la clienții Rosini.')}</h2></div><a class="text-link" href="/recenzii.html">${esc(settings.reviews_cta || 'Toate recenziile →')}</a></div><div class="container review-grid">${reviewCards || `<div class="empty-state"><p>Recenziile aprobate vor apărea aici.</p></div>`}</div></section>
<section class="section section-cta"><div class="container cta-panel"><div><p class="eyebrow">Rosini · Iași</p><h2>Hai să discutăm proiectul tău.</h2><p>Spune-ne ce ai nevoie, iar noi stabilim împreună configurația potrivită.</p></div><div class="actions"><a class="button button-green" href="${attr(whatsapp)}" target="_blank" rel="noopener">WhatsApp</a><a class="button button-outline" href="tel:+${phone}">Sună-ne</a></div></div></section>`;
const localBusinessSchema = `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'FurnitureStore',name:settings.site_title || 'Rosini',url:canonical,telephone:settings.phone_primary,email:settings.email,address:{'@type':'PostalAddress',streetAddress:settings.address,addressLocality:'Iași',addressCountry:'RO'}})}</script>`;

const pagesOut = new Map();
pagesOut.set('index.html', page({ title: settings.site_title || 'Rosini Iași', description: settings.site_description, path: '/', content: homeContent, schema: localBusinessSchema }));
const about = pages.despre?.body || `${settings.story_paragraph_1 || ''}\n\n${settings.story_paragraph_2 || ''}`;
pagesOut.set('despre.html', page({ title: `Despre Rosini | ${settings.site_title || 'Rosini'}`, description: settings.story_title || settings.site_description, path:'/despre.html', content:`<section class="page-hero"><div class="container narrow"><p class="eyebrow">${esc(settings.story_eyebrow || 'Povestea noastră')}</p><h1>${esc(settings.story_title || 'Rosini înseamnă mobilier făcut cu atenție.')}</h1><p class="hero-lead">${esc(settings.story_paragraph_1 || '')}</p></div></section><section class="section"><div class="container prose">${renderMarkdown(settings.story_paragraph_2 || about)}</div></section><section class="section section-dark"><div class="container narrow"><h2>Personalizare construită în jurul spațiului tău.</h2><p>Dimensiunile, configurația, materialele și finisajele sunt stabilite în funcție de proiect și de modul în care va fi folosit mobilierul.</p><a class="button button-green" href="${attr(whatsapp)}" target="_blank" rel="noopener">Cere ofertă</a></div></section>` }));
const productListContent = `<section class="page-hero"><div class="container narrow"><p class="eyebrow">Catalog Rosini</p><h1>Mobilier tapițat realizat la comandă.</h1><p class="hero-lead">Explorează produsele și discută cu noi pentru dimensiuni, materiale și configurații adaptate proiectului tău.</p></div></section><section class="section"><div class="container filter-row"><button type="button" class="filter-button is-active" data-category="all">Toate</button>${activeCategories.map(c => `<button type="button" class="filter-button" data-category="${attr(c.slug)}">${esc(c.title)}</button>`).join('')}</div><div class="container product-grid" id="product-grid">${activeProducts.map(p => `<article class="product-card" data-category="${attr(p.category_slug || p.category || '')}"><a href="/produs.html?slug=${encodeURIComponent(p.slug || p.file.replace(/\.md$/, ''))}"><img src="${attr(imagePath(p.image))}" alt="${attr(p.alt_text || p.name)}" loading="lazy"><div class="product-card-body"><h2>${esc(p.name)}</h2><p>${esc(p.short_description || p.description || '')}</p><span class="text-link">Vezi detalii →</span></div></a></article>`).join('') || `<div class="empty-state"><p>Nu există produse publicate momentan.</p><a class="button button-primary" href="${attr(whatsapp)}" target="_blank" rel="noopener">Cere ofertă</a></div>`}</div></section>`;
pagesOut.set('produse.html', page({ title:`Produse | ${settings.site_title || 'Rosini'}`, description:'Catalog de mobilier tapițat Rosini din Iași.', path:'/produse.html', content:productListContent }));
const reviewList = testimonials.map(r => `<article class="review-card"><div class="stars">${'★'.repeat(Math.min(5, Math.max(1, Number(r.rating || 5))))}</div><p>„${esc(r.text || r.body)}”</p><strong>${esc(r.name || r.author || 'Client Rosini')}</strong>${r.location ? `<span>${esc(r.location)}</span>`:''}</article>`).join('');
pagesOut.set('recenzii.html', page({ title:`Recenzii | ${settings.site_title || 'Rosini'}`, description:'Recenzii aprobate ale clienților Rosini.', path:'/recenzii.html', content:`<section class="page-hero"><div class="container narrow"><p class="eyebrow">Recenzii</p><h1>Experiențe reale de la clienții Rosini.</h1><p class="hero-lead">Afișăm doar recenzii aprobate.</p></div></section><section class="section"><div class="container review-grid">${reviewList || `<div class="empty-state"><p>Momentan nu sunt recenzii publicate.</p></div>`}</div></section>` }));
const contactContent = `<section class="page-hero"><div class="container narrow"><p class="eyebrow">Contact & showroom</p><h1>Hai să discutăm despre proiectul tău.</h1><p class="hero-lead">Poți cere o ofertă prin WhatsApp, telefonic sau ne poți vizita în showroom.</p></div></section><section class="section"><div class="container contact-grid"><div><h2>Rosini Iași</h2><p><strong>Telefon:</strong> <a href="tel:+${phone}">${esc(settings.phone_primary)}</a></p><p><strong>Email:</strong> <a href="mailto:${attr(settings.email)}">${esc(settings.email)}</a></p><p><strong>Adresă:</strong> ${esc(settings.address)}</p><p><strong>Program:</strong><br>${esc(settings.showroom_hours_weekdays || '')}<br>${esc(settings.showroom_hours_saturday || '')}</p><div class="actions"><a class="button button-green" href="${attr(whatsapp)}" target="_blank" rel="noopener">WhatsApp</a><a class="button button-outline" href="tel:+${phone}">Sună-ne</a></div><a class="button button-primary" href="${attr(settings.showroom_maps_url || '#')}" target="_blank" rel="noopener">Google Maps</a></div><div class="contact-card"><h2>Cere o ofertă</h2><p>Trimite-ne un mesaj, iar revenim cu detalii.</p><form name="cerere-oferta" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/contact.html?trimis=1"><input type="hidden" name="form-name" value="cerere-oferta"><p class="hidden"><label>Nu completa: <input name="bot-field"></label></p><label>Nume<input name="nume" autocomplete="name" required></label><label>Telefon<input name="telefon" type="tel" autocomplete="tel" required></label><label>Email<input name="email" type="email" autocomplete="email"></label><label>Mesaj<textarea name="mesaj" rows="5" required></textarea></label><label class="consent"><input type="checkbox" required> Am citit <a href="/politica-confidentialitate.html">politica de confidențialitate</a>.</label><button class="button button-primary" type="submit">Trimite cererea</button></form></div></div></section>`;
pagesOut.set('contact.html', page({ title:`Contact | ${settings.site_title || 'Rosini'}`, description:'Contactează Rosini Iași pentru mobilier tapițat la comandă.', path:'/contact.html', content:contactContent }));
const legalPrivacy = pages['politica-confidentialitate']?.body || 'Politica de confidențialitate va fi completată din panoul admin.';
const legalCookies = pages['politica-cookie-uri']?.body || 'Politica de cookie-uri va fi completată din panoul admin.';
for (const [file,title,text] of [['politica-confidentialitate.html','Politica de confidențialitate',legalPrivacy],['politica-cookie-uri.html','Politica de cookie-uri',legalCookies]]) pagesOut.set(file, page({ title:`${title} | ${settings.site_title || 'Rosini'}`, description:title, path:`/${file}`, content:`<section class="page-hero"><div class="container narrow"><p class="eyebrow">Rosini</p><h1>${esc(title)}</h1></div></section><section class="section"><div class="container prose">${renderMarkdown(text)}</div></section>` }));
const productTemplate = `<!doctype html><html lang="ro"><head>${baseHead(`Produs | ${settings.site_title || 'Rosini'}`,'Mobilier Rosini realizat la comandă.','/produs.html')}<script>window.__ROSINI_PRODUCT_MODE__=true;</script></head><body>${header}<main><section class="page-hero"><div class="container narrow"><p class="eyebrow">Produs Rosini</p><h1 id="product-title">Model Rosini</h1><p id="product-short" class="hero-lead">Solicită detalii și ofertă personalizată.</p></div></section><section class="section"><div class="container product-detail"><div id="product-gallery" class="detail-gallery"></div><div><p id="product-description" class="prose"></p><dl id="product-specs" class="specs"></dl><div class="actions"><a id="product-whatsapp" class="button button-green" href="${attr(whatsapp)}" target="_blank" rel="noopener">Cere ofertă pe WhatsApp</a><a class="button button-outline" href="tel:+${phone}">Sună-ne</a></div></div></div></section></main>${floating}${footer}${scripts}</body></html>`;
pagesOut.set('produs.html', productTemplate);
pagesOut.set('404.html', page({ title:`Pagina nu a fost găsită | ${settings.site_title || 'Rosini'}`, description:'Pagina căutată nu există.', path:'/404.html', content:`<section class="page-hero"><div class="container narrow"><p class="eyebrow">404</p><h1>Pagina nu a fost găsită.</h1><p class="hero-lead">Poți reveni la produse sau ne poți contacta pentru o ofertă.</p><div class="actions"><a class="button button-primary" href="/produse.html">Vezi produsele</a><a class="button button-outline" href="/contact.html">Contact</a></div></div></section>` }));

await rm(out, { recursive:true, force:true });
await mkdir(out, { recursive:true });
await mkdir(join(out,'assets/css'), { recursive:true });
await mkdir(join(out,'assets/js'), { recursive:true });
for (const [name, html] of pagesOut) await writeFile(join(out,name), html);
await cp(join(root,'content'), join(out,'content'), { recursive:true });
await cp(join(root,'admin'), join(out,'admin'), { recursive:true });
await cp(join(root,'assets'), join(out,'assets'), { recursive:true });
await writeFile(join(out,'site-data.json'), serialized);
await writeFile(join(out,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml', canonical).href}\n`);
const sitemapPaths = ['/', '/despre.html','/produse.html','/recenzii.html','/contact.html','/politica-confidentialitate.html','/politica-cookie-uri.html'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map(p=>`<url><loc>${esc(new URL(p,canonical).href)}</loc></url>`).join('')}</urlset>`;
await writeFile(join(out,'sitemap.xml'), sitemap);
console.log(`Rosini build complete: ${pagesOut.size} pages, ${products.length} products, ${activeCategories.length} categories, ${testimonials.length} approved reviews.`);
