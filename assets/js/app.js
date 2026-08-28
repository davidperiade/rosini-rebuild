(() => {
  'use strict';
  const data = window.__ROSINI_DATA__ || {};
  const settings = { ...(data.settings || {}) };
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
    if (showroom && contact && showroom !== contact) contact.parentNode.insertBefore(cta, contact);
    else if (showroom) showroom.insertAdjacentElement('afterend', cta);
    else {
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
    if (location.hash === '#lead-form') requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
      .category-card{display:flex!important;position:relative!important;min-height:145px!important;align-items:flex-end!important;padding:28px!important;background:#6b5a48!important;border:1px solid #554636!important;color:#fff!important;text-decoration:none!important;overflow:hidden!important;transition:transform .2s ease,background .2s ease!important}
      .category-card:hover{transform:translateY(-3px)!important;background:#796650!important}
      .category-card img,.category-card p{display:none!important}
      .category-card>div{display:block!important;width:100%!important}
      .category-card span{display:block!important;font-size:clamp(18px,1.8vw,25px)!important;font-weight:700!important;line-height:1.08!important;letter-spacing:-.025em!important;color:#fff!important}
      @media(max-width:900px){.category-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:600px){.category-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.category-card{min-height:96px!important;padding:18px!important}.category-card span{font-size:17px!important}}
    `;
    document.head.appendChild(style);
  }

  function buildWhatsappUrl() {
    const phone = String(settings.whatsapp_phone || settings.phone_primary || '0742056286').replace(/\D/g, '');
    const intl = phone.startsWith('0') ? `40${phone.slice(1)}` : phone;
    const message = String(settings.whatsapp_message || 'Bună ziua! Aș dori să discutăm despre un produs Rosini.');
    return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
  }

  function updateWhatsappLinks() {
    const url = buildWhatsappUrl();
    document.querySelectorAll('a[href*="wa.me"], #whatsapp-float, [data-whatsapp-link]').forEach((link) => {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  }

  async function loadRuntimeSettings() {
    try {
      const response = await fetch('/api/runtime-settings', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) return;
      const runtime = await response.json();
      if (runtime && typeof runtime === 'object') Object.assign(settings, runtime);
      updateWhatsappLinks();
    } catch (_) {
      // The statically built settings remain the fallback when the runtime store is unavailable.
    }
  }

  function initWhatsappFloat() {
    const button = document.getElementById('whatsapp-float');
    if (!button) return;
    button.href = buildWhatsappUrl();
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.setAttribute('aria-label', 'Contactează Rosini pe WhatsApp');
    button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M20.52 3.48A11.84 11.84 0 0 0 12.08 0C5.54.0.22 5.32.22 11.86c0 2.09.55 4.13 1.59 5.93L.12 24l6.35-1.66a11.84 11.84 0 0 0 5.61 1.42h.01c6.54 0 11.86-5.32 11.86-11.86 0-3.17-1.23-6.14-3.43-8.42ZM12.09 21.7h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.77.99 1.01-3.68-.23-.38a9.84 9.84 0 0 1-1.51-5.19C2.21 6.43 6.64 2 12.09 2a9.8 9.8 0 0 1 6.96 2.89 9.84 9.84 0 0 1 2.9 6.99c0 5.42-4.42 9.82-9.86 9.82Zm5.39-7.36c-.29-.15-1.71-.84-1.98-.94-.27-.1-.47-.15-.67.15-.2.29-.77.94-.94 1.13-.17.2-.35.22-.64.07-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.35.44-.52.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.29-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.05c.15.2 2.09 3.2 5.07 4.49.71.31 1.26.5 1.69.64.71.23 1.35.2 1.86.12.57-.08 1.71-.7 1.95-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.57-.35Z"/></svg><span>WhatsApp</span>`;
    const style = document.createElement('style');
    style.id = 'rosini-whatsapp-fix';
    style.textContent = `
      .whatsapp-float{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important;background:#25D366!important;color:#fff!important;gap:9px!important;padding:12px 18px!important;border-radius:999px!important;box-shadow:0 10px 28px rgba(37,211,102,.28)!important;font-weight:800!important}
      .whatsapp-float:hover{background:#1ebe5d!important;transform:translateY(-2px)!important}.whatsapp-float svg{flex:0 0 auto}.whatsapp-float span{line-height:1}
    `;
    document.head.appendChild(style);
    button.classList.add('is-visible');
  }

  function initSocialFooter() {
    const footerGrid = document.querySelector('.site-footer .footer-grid');
    if (!footerGrid) return;
    const contactColumn = [...footerGrid.children].find((el) => /contact/i.test(el.textContent || '')) || footerGrid.children[1];
    if (!contactColumn || contactColumn.querySelector('[data-social-footer]')) return;
    const links = [
      ['Facebook', settings.facebook_url, '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 8.2V6.6c0-.8.5-1.2 1.4-1.2h1.8V2.1c-.9-.1-1.8-.2-2.7-.2-2.7 0-4.6 1.7-4.6 4.7v1.6H6.3v3.7h3.1v9.8h4.1v-9.8h3.4l.5-3.7h-3.9Z"/></svg>'],
      ['Instagram', settings.instagram_url, '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 2h9.6A5.2 5.2 0 0 1 22 7.2v9.6a5.2 5.2 0 0 1-5.2 5.2H7.2A5.2 5.2 0 0 1 2 16.8V7.2A5.2 5.2 0 0 1 7.2 2Zm0 2A3.2 3.2 0 0 0 4 7.2v9.6A3.2 3.2 0 0 0 7.2 20h9.6a3.2 3.2 0 0 0 3.2-3.2V7.2A3.2 3.2 0 0 0 16.8 4H7.2Zm9.9 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>'],
      ['TikTok', settings.tiktok_url, '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 2h3.1c.2 1.5 1 2.7 2.5 3.4v3.2a8.5 8.5 0 0 1-2.5-.8v7.1c0 4-2.7 6.9-6.6 6.9-3.6 0-6.2-2.5-6.2-5.9 0-3.7 3-6.1 6.6-6.1.4 0 .8 0 1.1.1v3.3a4 4 0 0 0-1.1-.2c-1.7 0-3.2 1.1-3.2 2.9 0 1.5 1.1 2.6 2.8 2.6 1.8 0 3.5-1.2 3.5-4V2Z"/></svg>'],
      ['WhatsApp', true, '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 5.9L.1 24l6.4-1.7a11.8 11.8 0 0 0 5.6 1.4h.1c6.5 0 11.8-5.3 11.8-11.9 0-3.1-1.2-6.1-3.5-8.4Zm-8.4 18h-.1a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 0 1-1.5-5.2C2.2 6.4 6.6 2 12.1 2c2.6 0 5.1 1 7 2.9 1.9 1.9 2.9 4.3 2.9 7 0 5.4-4.4 9.8-9.9 9.8Zm5.4-7.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.4Z"/></svg>']
    ];
    const section = document.createElement('div');
    section.dataset.socialFooter = 'true';
    section.className = 'rosini-social-footer';
    section.innerHTML = `<h2>Urmărește-ne</h2><div class="rosini-social-links">${links.filter(([,url]) => url === true || url).map(([name,url,icon]) => `<a href="${url === true ? buildWhatsappUrl() : escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${name}">${icon}<span>${name}</span></a>`).join('')}</div>`;
    contactColumn.appendChild(section);
    const footerBottom = document.querySelector('.site-footer .footer-bottom');
    if (footerBottom) {
      const social = [...footerBottom.children].find((el) => /Facebook|Instagram/i.test(el.textContent || ''));
      if (social) social.remove();
    }
    const style = document.createElement('style');
    style.id = 'rosini-social-footer-style';
    style.textContent = `
      .rosini-social-footer{margin-top:24px}.rosini-social-footer h2{font-size:11px!important;text-transform:uppercase;letter-spacing:.16em;margin:0 0 12px!important;color:#999!important}.rosini-social-links{display:flex;flex-direction:column;gap:9px}.rosini-social-links a{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;font-size:14px}.rosini-social-links a:hover{text-decoration:underline}.rosini-social-links svg{width:20px;height:20px;fill:currentColor;flex:0 0 20px}.site-footer .footer-grid>div:nth-child(2){min-width:220px}
      @media(max-width:700px){.rosini-social-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.rosini-social-links a{font-size:13px}}
    `;
    document.head.appendChild(style);
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
  initSocialFooter();
  initFilters();
  initProductPage();
  loadRuntimeSettings();
})();