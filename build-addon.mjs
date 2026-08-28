import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, '_site');

async function patchHome() {
  const path = join(out, 'index.html');
  let html = await readFile(path, 'utf8');
  if (!html.includes('data-projects-gallery')) {
    const section = `
<section class="section section-soft projects-realizate" id="proiecte-realizate">
  <div class="container section-heading">
    <div>
      <p class="eyebrow">PORTOFOLIU</p>
      <h2>Proiecte realizate</h2>
      <p class="section-intro">Descoperă proiecte realizate pentru clienții Rosini și vezi cum mobilierul tapițat poate fi adaptat fiecărui spațiu.</p>
    </div>
  </div>
  <div class="container projects-gallery" data-projects-gallery aria-live="polite">
    <div class="empty-state"><p>Se încarcă proiectele realizate…</p></div>
  </div>
</section>
`;
    html = html.replace('<section class="section section-cta">', section + '<section class="section section-cta">');
  }
  if (!html.includes('/assets/js/projects-gallery.js')) {
    html = html.replace('</body>', '<script src="/assets/js/projects-gallery.js" defer></script></body>');
  }
  await writeFile(path, html);
}

async function patchAdminProfile() {
  const path = join(out, 'admin', 'profil.html');
  let html = await readFile(path, 'utf8');
  if (!html.includes('id="projectsGalleryCard"')) {
    const section = `
  <section class="card" id="projectsGalleryCard">
    <div class="category-toolbar"><div><div class="eyebrow">Portofoliu</div><h2>Proiecte realizate</h2><p class="muted">Adaugă fotografii de la proiectele finalizate pentru a le afișa în secțiunea „PROIECTE REALIZATE” de pe site. Poți adăuga, edita, reordona, activa/dezactiva și șterge oricând.</p></div><button type="button" id="newProject">+ Adaugă fotografie</button></div>
    <div class="notice">Imagine recomandată: <strong>1600 × 1000 px</strong> (raport 16:10), JPG/WebP, maximum 5 MB. Pentru fotografii de interior, păstrează subiectul principal cât mai central pentru un crop bun pe mobil și desktop.</div>
    <form id="projectForm" class="category-form"><input type="hidden" id="projectId"><input type="hidden" id="projectExistingImage"><div class="category-form-grid">
      <div><label for="projectTitle">Titlu (opțional)</label><input id="projectTitle" maxlength="100" placeholder="Ex.: Living personalizat – Iași"></div>
      <div><label for="projectAlt">Descriere foto / alt text</label><input id="projectAlt" maxlength="160" placeholder="Canapea Rosini într-un living modern"></div>
      <div><label for="projectOrder">Ordine</label><input id="projectOrder" type="number" step="1" value="0"><div class="hint">Număr mai mic = fotografie mai sus.</div></div>
      <div><label class="toggle"><input id="projectActive" type="checkbox" checked> Vizibilă pe site</label></div>
      <div class="full"><label for="projectImage">Fotografie</label><input id="projectImage" type="file" accept="image/jpeg,image/png,image/webp"><div class="hint" id="projectImageHint">Alege o fotografie JPG, PNG sau WebP. Pentru editare poți păstra fotografia existentă.</div><div id="projectPreview" class="project-preview"></div></div>
    </div><div class="actions"><button id="saveProject">Salvează fotografia</button><button type="button" class="secondary" id="cancelProject">Anulează</button></div><div id="projectFormStatus" class="status"></div></form>
    <div id="projectList" class="category-list"><div class="empty">Se încarcă proiectele…</div></div><div id="projectStatus" class="status"></div>
  </section>
`;
    html = html.replace('<section class="card"><div class="eyebrow">WhatsApp</div>', section + '\n  <section class="card"><div class="eyebrow">WhatsApp</div>');
  }
  if (!html.includes('projects-gallery-admin.js')) {
    html = html.replace('</body>', '<script src="/assets/js/projects-gallery-admin.js" defer></script></body>');
  }
  await writeFile(path, html);
}

await patchHome();
await patchAdminProfile();
console.log('Rosini build addon complete.');
