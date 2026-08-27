document.addEventListener('DOMContentLoaded', async () => {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const text = (id, value) => { const el = document.getElementById(id); if (el && value !== undefined && value !== null) el.textContent = value; };
  const attr = (id, name, value) => { const el = document.getElementById(id); if (el && value) el.setAttribute(name, value); };
  const fallbackLogo = '/content/images/rosini-logo.svg';

  const setLogo = (source) => {
    document.querySelectorAll('#site-logo, #footer-logo').forEach((img) => {
      const fallback = source || fallbackLogo;
      img.src = fallback;
      img.onerror = () => {
        if (img.dataset.fallbackApplied === 'true') return;
        img.dataset.fallbackApplied = 'true';
        img.src = fallbackLogo;
      };
    });
  };

  const whatsappUrl = (phone, message) => {
    let number = String(phone || '0742 056 286').replace(/\D/g, '');
    if (number.startsWith('0')) number = `40${number.slice(1)}`;
    if (number.startsWith('+')) number = number.slice(1);
    return `https://wa.me/${number}?text=${encodeURIComponent(message || 'Bună ziua! Doresc să discut despre produsele Rosini.')}`;
  };

  const renderDifference = (items) => {
    const el = document.getElementById('difference-grid');
    if (!el || !Array.isArray(items) || !items.length) return;
    el.innerHTML = items.slice(0, 3).map((x, i) => `<article class="difference-card"><span class="difference-number">${String(i + 1).padStart(2, '0')}</span><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p></article>`).join('');
  };

  const renderProcess = (items) => {
    const el = document.getElementById('process-grid');
    if (!el || !Array.isArray(items) || !items.length) return;
    el.innerHTML = items.slice(0, 3).map((x, i) => `<article class="process-card"><span>${String(i + 1).padStart(2, '0')}</span><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p></article>`).join('');
  };

  const renderReviews = (items, settings) => {
    const el = document.getElementById('testimonial-grid');
    if (!el) return;
    const approved = (items || []).filter((x) => x.author && x.body);
    const cards = approved.slice(0, 3).map((x) => {
      const rating = Math.max(1, Math.min(5, Number(x.rating) || 5));
      return `<blockquote><div class="stars" aria-label="${rating} din 5 stele">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div><p>„${esc(String(x.body).trim())}”</p><cite>${esc(x.author)}</cite></blockquote>`;
    }).join('');
    el.innerHTML = (cards || '<blockquote><div class="stars" aria-label="5 din 5 stele">★★★★★</div><p>„Am configurat un colțar modular pentru living. Structura metalică este extrem de solidă, iar materialul se curăță foarte ușor. Recomand!”</p><cite>Andrei M., Iași</cite></blockquote>') + `<blockquote class="review-invite"><div class="review-mark">ROSINI</div><p id="review-invite-text">${esc(settings.review_invite_text || 'Ai comandat mobilier de la noi? Spune-ne cum a fost experiența ta și ajută-i și pe ceilalți să aleagă.')}</p><a id="review-invite-cta" class="text-link" href="recenzii.html#review-form">${esc(settings.review_invite_cta || 'Publică o recenzie →')}</a></blockquote>`;
  };

  const renderGallery = (items) => {
    const el = document.getElementById('showroom-gallery');
    if (!el) return;
    const images = (items || []).map((x) => typeof x === 'string' ? x : x?.image).filter(Boolean);
    if (!images.length) {
      el.replaceChildren();
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.innerHTML = images.slice(0, 4).map((src, i) => `<figure class="showroom-image"><img src="${esc(src)}" alt="Showroom Rosini – fotografie ${i + 1}" loading="lazy"></figure>`).join('');
  };

  const splitHours = (value, fallbackDay, fallbackTime) => {
    const raw = String(value || '');
    const match = raw.match(/^(.+?):\s*(.+)$/);
    return { day: match ? match[1] : fallbackDay, time: match ? match[2] : fallbackTime };
  };

  const renderFallback = () => {
    setLogo(fallbackLogo);
    const categories = document.getElementById('home-categories');
    if (categories) categories.innerHTML = '<div class="empty-state">Conținutul produselor este temporar indisponibil. <a class="text-link" href="produse.html">Vezi produsele</a> sau <a class="text-link" href="contact.html">contactează-ne</a>.</div>';
    const hero = document.getElementById('hero-media');
    if (hero) hero.classList.remove('has-image');
  };

  try {
    const data = await window.rosiniSiteData.load();
    const settings = data?.siteSettings || {};
    setLogo(settings.logo || fallbackLogo);

    if (settings.site_title) document.title = settings.site_title;
    if (settings.site_description) document.querySelector('meta[name="description"]')?.setAttribute('content', settings.site_description);

    [
      'hero-eyebrow','hero-title','hero-subtitle','hero-primary-cta','hero-whatsapp-cta',
      'differentiators-eyebrow','differentiators-title','differentiators-intro',
      'collections-eyebrow','collections-title','collections-cta','process-eyebrow','process-title',
      'story-eyebrow','story-title','story-paragraph-1','story-paragraph-2','story-cta',
      'showroom-eyebrow','showroom-title','showroom-text','reviews-eyebrow','reviews-title','reviews-cta','footer-tagline'
    ].forEach((id) => text(id, settings[id.replaceAll('-', '_')]));

    text('trust-warranty', `${settings.warranty_months || 24} luni`);
    text('trust-experience', `Din ${settings.experience_since || 2006}`);

    const wa = whatsappUrl(settings.whatsapp_phone, settings.whatsapp_message);
    ['hero-whatsapp-cta', 'process-whatsapp-cta', 'whatsapp-float'].forEach((id) => attr(id, 'href', wa));

    if (settings.hero_image) {
      const media = document.getElementById('hero-media');
      if (media) {
        media.style.backgroundImage = `url("${String(settings.hero_image).replace(/"/g, '%22')}")`;
        media.classList.add('has-image');
      }
    }

    renderDifference(settings.differentiators);
    renderProcess(settings.process_steps);
    renderReviews(data.testimonials || [], settings);
    renderGallery(settings.showroom_gallery || []);

    const weekday = splitHours(settings.showroom_hours_weekdays, 'Luni – Vineri', '11:00 – 19:00');
    const saturday = splitHours(settings.showroom_hours_saturday, 'Sâmbătă', '10:00 – 15:00');
    const hours = document.getElementById('showroom-hours');
    if (hours) hours.innerHTML = `<div><strong>${esc(weekday.day)}</strong><span>${esc(weekday.time)}</span></div><div><strong>${esc(saturday.day)}</strong><span>${esc(saturday.time)}</span></div>`;

    attr('showroom-maps', 'href', settings.showroom_maps_url || 'https://maps.app.goo.gl/s6DBiZk4DuQVR6P39?g_st=ic');
    text('showroom-maps', settings.showroom_cta || 'Navighează către Showroom (Google Maps)');
    text('footer-address', settings.address);
    text('footer-email', settings.email);
    attr('footer-email', 'href', `mailto:${settings.email || 'rosinigrup@yahoo.com'}`);
    text('footer-phone', settings.phone_primary);
    attr('footer-phone', 'href', `tel:${String(settings.phone_primary || '0742 056 286').replace(/\s/g, '')}`);
    attr('footer-facebook', 'href', settings.facebook_url);
    attr('footer-instagram', 'href', settings.instagram_url);

    const categories = data.categories || [];
    const categoryGrid = document.getElementById('home-categories');
    if (categoryGrid) {
      categoryGrid.innerHTML = categories.length
        ? categories.map((c, i) => `<a class="category-card category-card-minimal" href="produse.html?category=${encodeURIComponent(c.slug || c.title)}"><div class="category-index">${String(i + 1).padStart(2, '0')}</div><div class="category-content"><h3>${esc(c.title)}</h3><p>${esc(c.description || 'Descoperă produsele din această categorie.')}</p><span>Vezi categoria →</span></div></a>`).join('')
        : '<div class="empty-state">Categoriile vor apărea aici.</div>';
    }
  } catch (error) {
    console.error('Rosini site data:', error);
    renderFallback();
  }
});
