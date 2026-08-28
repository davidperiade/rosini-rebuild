(() => {
  'use strict';
  const root = document.querySelector('[data-projects-gallery]');
  if (!root) return;
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const style = document.createElement('style');
  style.textContent = `
    .projects-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
    .project-gallery-card{margin:0;background:#fff;border:1px solid #ddd8d0;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(23,23,23,.06);transition:transform .2s ease,box-shadow .2s ease}
    .project-gallery-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(23,23,23,.1)}
    .project-gallery-card button{display:block;width:100%;padding:0;border:0;background:none;color:inherit;text-align:left;cursor:pointer}
    .project-gallery-card img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}
    .project-gallery-card figcaption{padding:14px 16px 16px;font-size:15px;font-weight:700;color:#171717}
    .project-gallery-empty{grid-column:1/-1;text-align:center;padding:32px;border:1px dashed #cfcac2;border-radius:14px;color:#666}
    .projects-lightbox{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.86);display:none;align-items:center;justify-content:center;padding:24px}
    .projects-lightbox.is-open{display:flex}.projects-lightbox img{max-width:min(1200px,94vw);max-height:88vh;width:auto;height:auto;object-fit:contain;border-radius:10px}
    .projects-lightbox-close{position:absolute;top:18px;right:20px;border:0;background:#fff;color:#171717;border-radius:999px;width:44px;height:44px;font-size:26px;cursor:pointer}
    @media(max-width:900px){.projects-gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}}
    @media(max-width:600px){.projects-gallery{grid-template-columns:1fr;gap:18px}.project-gallery-card figcaption{font-size:14px}}
  `;
  document.head.appendChild(style);
  const lightbox = document.createElement('div');
  lightbox.className = 'projects-lightbox';
  lightbox.innerHTML = '<button class="projects-lightbox-close" type="button" aria-label="Închide">×</button><img alt="">';
  document.body.appendChild(lightbox);
  const lbImg = lightbox.querySelector('img');
  const close = () => lightbox.classList.remove('is-open');
  lightbox.querySelector('button').addEventListener('click', close);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  async function load() {
    try {
      const r = await fetch('/api/gallery', { cache: 'no-store' });
      if (!r.ok) throw new Error('Galeria nu este disponibilă.');
      const items = await r.json();
      if (!Array.isArray(items) || !items.length) {
        root.innerHTML = '<div class="project-gallery-empty"><p>În curând vom adăuga aici proiecte realizate pentru clienții Rosini.</p></div>';
        return;
      }
      root.innerHTML = items.filter(x => x.active !== false && x.image).sort((a,b) => Number(a.order||0)-Number(b.order||0)).map(item => `
        <figure class="project-gallery-card"><button type="button" data-image="${esc(item.image)}" data-alt="${esc(item.alt_text||item.title||'Proiect Rosini')}"><img src="${esc(item.image)}" alt="${esc(item.alt_text||item.title||'Proiect Rosini')}" loading="lazy"><figcaption>${esc(item.title||'Proiect realizat Rosini')}</figcaption></button></figure>
      `).join('') || '<div class="project-gallery-empty"><p>În curând vom adăuga aici proiecte realizate pentru clienții Rosini.</p></div>';
      root.querySelectorAll('[data-image]').forEach(btn => btn.addEventListener('click', () => {
        lbImg.src = btn.dataset.image; lbImg.alt = btn.dataset.alt || ''; lightbox.classList.add('is-open');
      }));
    } catch (_) {
      root.innerHTML = '<div class="project-gallery-empty"><p>Galeria de proiecte va fi disponibilă în curând.</p></div>';
    }
  }
  load();
})();
