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

  function initDiscountNavCta() {
    const nav = document.getElementById('site-navigation');
    if (!nav || nav.querySelector('[data-discount-nav-cta]')) return;

    const links = [...nav.querySelectorAll('a')];
    const showroom = links.find((link) => /showroom/i.test(link.textContent || ''));
    const contact = links.find((link) => /contact/i.test(link.textContent || ''));
    const cta = document.createElement('a');
    cta.className = 'nav-discount-cta';
    cta.dataset.discountNavCta = 'true';
    cta.href = '/contact.html#lead-form';
    cta.textContent = settings.lead_nav_label || 'Vrei o reducere?';
    cta.setAttribute('aria-label', 'Obține reducerea disponibilă în showroom');

    if (showroom && contact && showroom !== contact) {
      contact.parentNode.insertBefore(cta, contact);
    } else if (showroom) {
      showroom.insertAdjacentElement('afterend', cta);
    } else {
      const primaryCta = nav.querySelector('.nav-cta');
      if (primaryCta) primaryCta.insertAdjacentElement('beforebegin', cta);
      else nav.appendChild(cta);
    }
  }

  function initLeadFormTarget() {
    const form = document.querySelector('form[name="cerere-oferta"]');
    if (!form) return;
    const card = form.closest('.contact-card') || form;
    card.id = 'lead-form';
    if (location.hash === '#lead-form') {
      requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function initLeadAnchor() {
    document.querySelectorAll('a[href="#lead-form"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = document.getElementById('lead-form');
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#lead-form');
        const firstField = target.querySelector('input:not([type="hidden"]), textarea, select');
        if (firstField) setTimeout(() => firstField.focus({ preventScroll: true }), 450);
      });
    });
  }

  function initCategoryCards() {
    const style = document.createElement('style');
    style.id = 'rosini-category-card-fix';
    style.textContent = `
      .category-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px!important}
      .category-card{display:flex!important;position:relative!important;min-height:145px!important;align-items:flex-end!important;padding:28px!important;background:#d8d2c7!important;border:1px solid #c9c1b5!important;color:#171717!important;text-decoration:none!important;overflow:hidden!important;transition:transform .2s ease,background .2s ease!important}
      .category-card:hover{transform:translateY(-3px)!important;background:#cec6b9!important}
      .category-card img,.category-card p{display:none!important}
      .category-card>div{display:block!important;width:100%!important}
      .category-card span{display:block!important;font-size:clamp(20px,2.2vw,30px)!important;font-weight:700!important;line-height:1.08!important;letter-spacing:-.025em!important;color:#171717!important}
      @media(max-width:900px){.category-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:600px){.category-grid{grid-template-columns:1fr!important}.category-card{min-height:118px!important;padding:22px!important}.category-card span{font-size:22px!important}}
    `;
    document.head.appendChild(style);
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
  initDiscountNavCta();
  initCategoryCards();
  initLeadFormTarget();
  initLeadAnchor();
  initWhatsappFloat();
  initFilters();
  initProductPage();
})();
