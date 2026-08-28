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

  function socialIcon(name) {
    if (name === 'Instagram') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.7" r="1.15" fill="currentColor"/></svg>';
    }
    if (name === 'Facebook') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v4h4v-4h3.2l.8-4H13V9c0-.7.3-1 1-1Z" fill="currentColor"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.4 4c.3 2 1.5 3.5 3.6 4v3.1c-1.5-.1-2.8-.6-4-1.4v6.1c0 3.3-2.2 5.2-5 5.2-2.5 0-4.5-1.8-4.5-4.2 0-2.7 2.2-4.5 5-4.5.5 0 1 .1 1.4.2v3.1c-.4-.2-.8-.3-1.3-.3-1 0-1.9.5-1.9 1.5 0 .8.7 1.4 1.5 1.4 1.1 0 1.8-.7 1.8-2.3V4h3.4Z" fill="currentColor"/></svg>';
  }

  function initSocialFooter() {
    const contactHeading = [...document.querySelectorAll('.site-footer h2')].find((heading) => /contact/i.test(heading.textContent || ''));
    if (!contactHeading) return;
    const contactColumn = contactHeading.parentElement;
    if (!contactColumn || contactColumn.querySelector('[data-social-footer]')) return;

    const socials = [
      { name: 'Instagram', url: settings.instagram_url },
      { name: 'Facebook', url: settings.facebook_url },
      { name: 'TikTok', url: settings.tiktok_url }
    ].filter((item) => item.url && /^https?:\/\//i.test(String(item.url).trim()));

    if (!socials.length) return;

    const style = document.createElement('style');
    style.id = 'rosini-social-footer-fix';
    style.textContent = `
      .rosini-social-footer{margin-top:30px;padding-top:22px;border-top:1px solid #3a3430}
      .rosini-social-footer-title{margin:0 0 13px;color:#8f8781;font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
      .rosini-social-footer-list{display:flex;flex-direction:column;gap:9px}
      .rosini-social-footer-link{display:inline-flex!important;align-items:center;gap:10px;width:max-content;color:#c9c0ba!important;font-size:.82rem;line-height:1.35;transition:color .2s ease,transform .2s ease}
      .rosini-social-footer-link:hover{color:#fff!important;transform:translateX(2px)}
      .rosini-social-footer-link svg{width:19px;height:19px;flex:0 0 19px}
      @media(max-width:700px){.rosini-social-footer{margin-top:22px}.rosini-social-footer-list{gap:11px}}
    `;
    document.head.appendChild(style);

    const block = document.createElement('div');
    block.className = 'rosini-social-footer';
    block.dataset.socialFooter = 'true';
    block.innerHTML = `<p class="rosini-social-footer-title">Urmărește-ne</p><div class="rosini-social-footer-list">${socials.map((item) => `<a class="rosini-social-footer-link" href="${escapeHtml(item.url.trim())}" target="_blank" rel="noopener noreferrer" aria-label="Rosini pe ${item.name}">${socialIcon(item.name)}<span>${item.name}</span></a>`).join('')}</div>`;
    contactColumn.appendChild(block);

    const footerBottom = document.querySelector('.footer-bottom');
    if (footerBottom) {
      const oldSocial = footerBottom.querySelectorAll('a');
      oldSocial.forEach((link) => {
        if (/^(Facebook|Instagram|TikTok)$/i.test((link.textContent || '').trim())) link.parentElement?.remove();
      });
    }
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
  initSocialFooter();
  initWhatsappFloat();
  initFilters();
  initProductPage();
})();
