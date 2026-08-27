(() => {
  'use strict';
  const data = window.__ROSINI_DATA__ || {};
  const settings = data.settings || {};
  const FALLBACK_LOGO = '/content/images/rosini-logo.svg';

  function setLogo(source) {
    document.querySelectorAll('#site-logo,#footer-logo').forEach((img) => {
      img.src = source || FALLBACK_LOGO;
      img.onerror = () => {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = 'true';
        img.src = FALLBACK_LOGO;
      };
    });
  }

  function initMenu() {
    const button = document.querySelector('.menu-toggle');
    const nav = document.getElementById('site-navigation');
    if (!button || !nav) return;
    const close = () => {
      nav.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Deschide meniul');
    };
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Închide meniul' : 'Deschide meniul');
      nav.classList.toggle('is-open', open);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  }

  function initWhatsappFloat() {
    const button = document.getElementById('whatsapp-float');
    if (!button) return;
    const update = () => button.classList.toggle('is-visible', window.scrollY > 450);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function initFilters() {
    const buttons = document.querySelectorAll('[data-category]');
    const cards = document.querySelectorAll('#product-grid [data-category]');
    if (!buttons.length || !cards.length) return;
    buttons.forEach((button) => button.addEventListener('click', () => {
      const category = button.dataset.category;
      buttons.forEach((b) => b.classList.toggle('is-active', b === button));
      cards.forEach((card) => { card.hidden = category !== 'all' && card.dataset.category !== category; });
    }));
    const requested = new URLSearchParams(location.search).get('categorie');
    if (requested) document.querySelector(`[data-category="${CSS.escape(requested)}"]`)?.click();
  }

  function initProductPage() {
    if (!window.__ROSINI_PRODUCT_MODE__) return;
    const products = Array.isArray(data.products) ? data.products : [];
    const slug = new URLSearchParams(location.search).get('slug');
    const product = products.find((item) => (item.slug || item.file?.replace(/\.md$/, '')) === slug);
    const title = document.getElementById('product-title');
    const short = document.getElementById('product-short');
    const description = document.getElementById('product-description');
    const gallery = document.getElementById('product-gallery');
    const specs = document.getElementById('product-specs');
    const whatsapp = document.getElementById('product-whatsapp');
    if (!product) {
      if (title) title.textContent = 'Produs indisponibil';
      if (short) short.textContent = 'Modelul căutat nu este disponibil în catalog. Poți cere o ofertă personalizată.';
      if (description) description.textContent = 'Contactează-ne pentru un model realizat la comandă.';
      return;
    }
    const name = product.name || 'Model Rosini';
    if (title) title.textContent = name;
    if (short) short.textContent = product.short_description || product.description || 'Solicită detalii și ofertă personalizată.';
    if (description) description.textContent = product.description || product.body || '';
    const images = [product.image, ...(Array.isArray(product.gallery) ? product.gallery : [])].filter(Boolean);
    if (gallery) gallery.innerHTML = images.length ? images.map((src) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(product.alt_text || name)}" loading="lazy">`).join('') : '<div class="empty-state">Imaginea produsului nu este disponibilă.</div>';
    if (specs) {
      const fields = [['Dimensiuni','dimensions'],['Materiale','materials'],['Opțiuni','options'],['Termen de livrare','delivery_time'],['Garanție','warranty']].filter(([,key]) => product[key]);
      specs.innerHTML = fields.map(([label,key]) => `<div><dt>${label}</dt><dd>${escapeHtml(product[key])}</dd></div>`).join('');
    }
    if (whatsapp) {
      const phone = String(settings.whatsapp_phone || settings.phone_primary || '').replace(/\D/g,'');
      const intl = phone.startsWith('0') ? `40${phone.slice(1)}` : phone;
      const message = `Bună ziua! Sunt interesat(ă) de modelul ${name}. Aș dori detalii și o ofertă.`;
      whatsapp.href = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  setLogo(settings.logo || FALLBACK_LOGO);
  initMenu();
  initWhatsappFloat();
  initFilters();
  initProductPage();
})();
