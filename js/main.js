document.addEventListener('DOMContentLoaded',()=>{
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const cleanPhone=n=>String(n||'').replace(/[^\d+]/g,'');
const waNumber=n=>cleanPhone(n).replace(/^\+/,'').replace(/^0/,'40');
const siteUrl=location.origin;
const sessionId=sessionStorage.getItem('rosini_session')||crypto.randomUUID();
sessionStorage.setItem('rosini_session',sessionId);
const send=(type,extra={})=>{try{navigator.sendBeacon('/api/analytics',new Blob([JSON.stringify({type,sessionId,path:location.pathname,referrer:document.referrer,...extra})],{type:'application/json'}))}catch{}};
const started=Date.now();let sentEngagement=false;
const engagement=()=>{if(sentEngagement)return;sentEngagement=true;send('engagement',{durationSeconds:Math.round((Date.now()-started)/1000)})};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')engagement()});
window.addEventListener('pagehide',engagement);

const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav');
if(toggle&&nav){
  toggle.type='button';
  if(!nav.id)nav.id='site-navigation';
  toggle.setAttribute('aria-controls',nav.id);
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','Deschide meniul');
  const setMenu=(open)=>{nav.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Închide meniul':'Deschide meniul')};
  toggle.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
}

const FALLBACK_LOGO='/content/images/rosini-logo.svg';
const setLogo=src=>document.querySelectorAll('#site-logo,#footer-logo').forEach(img=>{img.src=src||FALLBACK_LOGO;img.onerror=()=>{if(img.dataset.fallbackApplied==='true')return;img.dataset.fallbackApplied='true';img.src=FALLBACK_LOGO}});
const setPhoneLink=(a,n)=>{if(n){a.href='tel:'+cleanPhone(n);a.textContent=n;a.hidden=false}else a.hidden=true};
const setWhatsApp=(a,n,message)=>{if(n){a.href='https://wa.me/'+waNumber(n)+'?text='+encodeURIComponent(message);a.hidden=false}else a.hidden=true};
const renderPhones=s=>{const p1=s.phone_primary||'',p2=s.phone_secondary||'';document.querySelectorAll('[data-phone-slot="primary"]').forEach(a=>setPhoneLink(a,p1));document.querySelectorAll('[data-phone-slot="secondary"]').forEach(a=>setPhoneLink(a,p2));document.querySelectorAll('[data-phone-group="primary"]').forEach(g=>g.hidden=!p1);document.querySelectorAll('[data-phone-group="secondary"]').forEach(g=>g.hidden=!p2);document.querySelectorAll('[data-whatsapp-slot="primary"]').forEach(a=>setWhatsApp(a,p1,'Bună ziua! Doresc să discut despre produsele Rosini.'));document.querySelectorAll('[data-whatsapp-slot="secondary"]').forEach(a=>setWhatsApp(a,p2,'Bună ziua! Doresc să discut despre produsele Rosini.'))};
function renderHours(hours){const footer=document.querySelector('footer');if(!footer||footer.querySelector('.business-hours'))return;const box=document.createElement('div');box.className='business-hours';box.innerHTML='<h3>Program</h3>'+hours.map(x=>`<p><strong>${esc(x.day)}</strong>: ${esc(x.open)}${x.close?' – '+esc(x.close):''}</p>`).join('');footer.querySelector('.footer-grid')?.appendChild(box)}

const currentFile=location.pathname.split('/').pop()||'index.html';
const isHome=currentFile==='index.html'||location.pathname==='/'||location.pathname==='';
const productSlug=p=>p?.slug||String(p?.file||'').replace(/\.md$/,'');
const configEntries=p=>(Array.isArray(p.configuration_options)?p.configuration_options:[]).map((x,i)=>{const parts=String(x||'').split(':');const label=(parts.shift()||('Configurație '+(i+1))).trim();const opts=parts.join(':').split('|').map(v=>v.trim()).filter(Boolean);return{label,opts}}).filter(x=>x.opts.length);
const selectedConfig=()=>[...document.querySelectorAll('.product-config select')].map(s=>`${s.dataset.label}: ${s.value}`).filter(Boolean);
const productMessage=p=>{let msg=`Bună ziua! Sunt interesat(ă) de produsul „${p.title}”.`;const cfg=selectedConfig();if(cfg.length)msg+='\nConfigurație aleasă:\n'+cfg.map(x=>'• '+x).join('\n');msg+=`\nLink produs: ${siteUrl}/produs.html?slug=${encodeURIComponent(productSlug(p))}`;return msg};

function addProductGallery(p){const imgs=(Array.isArray(p.gallery)?p.gallery:[]).map(x=>typeof x==='object'?x.image:x).filter(Boolean);if(!imgs.length)return;const prose=document.querySelector('.prose');if(!prose||prose.querySelector('.product-gallery'))return;const section=document.createElement('section');section.className='product-gallery';section.innerHTML=`<div class="section-head"><p class="eyebrow">Galerie</p><h2>Mai multe fotografii ale produsului</h2></div><div class="product-gallery-grid">${imgs.map((src,i)=>`<button type="button" class="gallery-thumb" data-index="${i}"><img src="${esc(src)}" alt="${esc(p.title)} — fotografie ${i+1}"></button>`).join('')}</div>`;prose.appendChild(section);const thumbs=[...section.querySelectorAll('.gallery-thumb')];const open=i=>{const overlay=document.createElement('div');overlay.className='gallery-lightbox';overlay.innerHTML=`<button class="gallery-close" type="button" aria-label="Închide">×</button><button class="gallery-prev" type="button" aria-label="Fotografia anterioară">‹</button><img alt="${esc(p.title)}"><button class="gallery-next" type="button" aria-label="Fotografia următoare">›</button>`;document.body.appendChild(overlay);let idx=i;const show=n=>{idx=(n+imgs.length)%imgs.length;overlay.querySelector('img').src=imgs[idx]};show(idx);overlay.querySelector('.gallery-close').onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};overlay.querySelector('.gallery-prev').onclick=()=>show(idx-1);overlay.querySelector('.gallery-next').onclick=()=>show(idx+1)};thumbs.forEach((b,i)=>b.onclick=()=>open(i))}
function addFactoryGallery(data){const grid=document.querySelector('.factory-grid');if(!grid||!Array.isArray(data.factory))return;const items=data.factory.filter(x=>x.image);if(!items.length){grid.innerHTML='<div class="card"><h3>Din fabrica Rosini</h3><p>Fotografiile din timpul fabricării vor fi adăugate aici.</p></div>';return}grid.innerHTML=items.map(x=>`<article class="factory-card"><img src="${esc(x.image)}" alt="${esc(x.title||'Proces de fabricație Rosini')}"><div><span>${esc(x.category||'Din fabrică')}</span><h3>${esc(x.title||'Proces de fabricație')}</h3><p>${esc(x.description||'')}</p></div></article>`).join('')}
function addProductTools(p,s){const prose=document.querySelector('.prose');if(!prose||prose.querySelector('.product-tools'))return;const wrap=document.createElement('section');wrap.className='product-tools';const configs=configEntries(p);wrap.innerHTML='<div class="section-head"><p class="eyebrow">Contact</p><h2>Discută despre produs</h2><p>Alege opțiunile disponibile și trimite configurația direct pe WhatsApp.</p></div>';if(configs.length){const box=document.createElement('div');box.className='product-config';configs.forEach(c=>{const label=document.createElement('label');label.innerHTML=`${esc(c.label)}<select data-label="${esc(c.label)}">${c.opts.map(o=>`<option>${esc(o)}</option>`).join('')}</select>`;box.appendChild(label)});wrap.appendChild(box)}const actions=document.createElement('div');actions.className='actions product-actions';const p1=document.createElement('a');p1.className='btn btn-whatsapp';p1.target='_blank';p1.rel='noopener';p1.textContent='WhatsApp';const c1=document.createElement('a');c1.className='btn btn-primary';c1.textContent='Sună acum';actions.append(p1,c1);wrap.appendChild(actions);prose.appendChild(wrap);const update=()=>{const msg=productMessage(p);setWhatsApp(p1,s.phone_primary,msg);c1.hidden=!s.phone_primary;if(s.phone_primary)c1.href='tel:'+cleanPhone(s.phone_primary)};update();wrap.querySelectorAll('select').forEach(x=>x.addEventListener('change',update))}
function add360(p){const imgs=(Array.isArray(p.gallery_360)?p.gallery_360:[]).map(x=>typeof x==='object'?x.image:x).filter(Boolean);if(imgs.length<2)return;const prose=document.querySelector('.prose');if(!prose||prose.querySelector('.viewer360'))return;const section=document.createElement('section');section.className='viewer360';section.innerHTML=`<div class="section-head"><p class="eyebrow">360°</p><h2>Vezi produsul din toate unghiurile</h2><p>Glisează cu degetul sau trage cu mouse-ul pentru a roti produsul.</p></div><div class="viewer360-stage"><img alt="${esc(p.title)} — vizualizare 360°"><button type="button" class="viewer360-prev">‹</button><button type="button" class="viewer360-next">›</button></div><div class="viewer360-hint">${imgs.length} imagini · rotație interactivă</div>`;prose.appendChild(section);const img=section.querySelector('img');let idx=0,startX=null;const show=i=>{idx=(i+imgs.length)%imgs.length;img.src=imgs[idx]};show(0);section.addEventListener('pointerdown',e=>{startX=e.clientX;section.setPointerCapture?.(e.pointerId)});section.addEventListener('pointermove',e=>{if(startX===null)return;if(Math.abs(e.clientX-startX)>18){show(idx+(e.clientX<startX?1:-1));startX=e.clientX}});section.addEventListener('pointerup',()=>startX=null);section.addEventListener('pointercancel',()=>startX=null);section.querySelector('.viewer360-prev').onclick=()=>show(idx-1);section.querySelector('.viewer360-next').onclick=()=>show(idx+1)}
function renderProductCards(grid,products,s){if(!grid)return;grid.innerHTML=(products||[]).map(p=>{const slug=productSlug(p),href=`produs.html?slug=${encodeURIComponent(slug)}`,msg=`Bună ziua! Sunt interesat(ă) de produsul „${p.title}”.\nLink produs: ${siteUrl}/${href}`,wa=s.phone_primary?`https://wa.me/${waNumber(s.phone_primary)}?text=${encodeURIComponent(msg)}`:'';return`<article class="product-card"><a href="${href}"><img src="${esc(p.image||'https://placehold.co/700x500/png?text=Rosini')}" alt="${esc(p.title)} Rosini"><h3>${esc(p.title)}</h3><span>Vezi produs →</span></a><div class="product-card-actions">${wa?`<a class="btn btn-whatsapp" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`:''}</div></article>`}).join('')}
function renderPortfolio(data){const grid=document.querySelector('.portfolio-grid');if(!grid||!Array.isArray(data.portfolio))return;const items=data.portfolio.filter(x=>x.image||x.title);if(!items.length)return;grid.innerHTML=items.map(x=>`<article class="portfolio-card"><img src="${esc(x.image||'https://placehold.co/800x600/png?text=Rosini')}" alt="${esc(x.title||'Proiect Rosini')}"><div><span>${esc(x.category||'Proiect')}</span><h3>${esc(x.title||'Proiect Rosini')}</h3><p>${esc(x.description||'')}</p></div></article>`).join('')}
function renderTestimonials(data){const grid=document.querySelector('.testimonial-grid');if(!grid||!Array.isArray(data.testimonials))return;const items=data.testimonials.filter(x=>x.body||x.title);if(!items.length)return;grid.innerHTML=items.map(x=>`<blockquote><p>${esc(String(x.body||'').replace(/^#+\s*/,'').replace(/[*_]/g,''))}</p><cite>— ${esc(x.author||x.title||'Client Rosini')}</cite></blockquote>`).join('')}
function renderProductDetail(p,s){const hero=document.querySelector('.page-hero h1'),intro=document.querySelector('.product-intro'),image=document.querySelector('.product-main-image'),details=document.querySelector('#product-details');if(hero)hero.textContent=p.title;if(intro)intro.textContent=p.description||'';if(image&&p.image){image.src=p.image;image.alt=p.title+' Rosini'}if(details){const d=p.dimensions&&typeof p.dimensions==='object'?p.dimensions:{};const specs=[['Lățime',d.width],['Adâncime',d.depth],['Înălțime',d.height],['Înălțime șezut',d.seat_height],['Lungime extinsă',d.extended_length],['Livrare',p.delivery_time||((s.delivery_weeks||5)+' săptămâni')],['Garanție',p.warranty||((s.warranty_months||24)+' luni')]].filter(x=>x[1]);details.innerHTML=specs.map(([k,v])=>`<div class="spec"><strong>${esc(k)}</strong>${esc(v)}</div>`).join('')}const features=document.querySelector('#product-features');if(features){const list=Array.isArray(p.features)?p.features.map(x=>typeof x==='object'?x.item:x).filter(Boolean):[];features.innerHTML=list.length?`<h2>Caracteristici</h2><ul>${list.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}const body=document.querySelector('#product-body');if(body)body.innerHTML=p.body?`<h2>Detalii</h2><p>${esc(p.body).replace(/\n/g,'<br>')}</p>`:'';addProductGallery(p);add360(p);addProductTools(p,s)}

const reviewForm=document.querySelector('form[name="review"]');if(reviewForm)reviewForm.addEventListener('submit',e=>{if(!reviewForm.checkValidity()){e.preventDefault();reviewForm.reportValidity()}else send('review_submit')});
document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.addEventListener('click',()=>send('phone_click')));
document.querySelectorAll('a[href*="wa.me"]').forEach(a=>a.addEventListener('click',()=>send('whatsapp_click')));
document.querySelectorAll('a[href^="mailto:"]').forEach(a=>a.addEventListener('click',()=>send('email_click')));
document.querySelectorAll('.btn-primary,.nav-cta').forEach(a=>a.addEventListener('click',()=>send('cta_click')));
send('page_view');

if(!isHome){
  window.rosiniSiteData.load().then(data=>{
    if(!data){setLogo(FALLBACK_LOGO);return}
    const s=data.siteSettings||{};
    setLogo(s.logo||FALLBACK_LOGO);
    renderPhones(s);
    document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{if(s.email){a.href='mailto:'+s.email;a.textContent=s.email}});
    renderPortfolio(data);
    renderTestimonials(data);
    addFactoryGallery(data);
    const grid=document.querySelector('.product-grid');
    const params=new URLSearchParams(location.search);
    const categoryParam=params.get('category');
    if(grid&&Array.isArray(data.categories)){
      if(currentFile==='produse.html'&&categoryParam){
        const cat=data.categories.find(c=>c.slug===categoryParam),products=(data.products||[]).filter(p=>p.category===categoryParam||p.category===cat?.title);
        const hero=document.querySelector('.page-hero h1');
        if(hero)hero.textContent=cat?.title||'Categorie produse';
        if(products.length)renderProductCards(grid,products,s);else grid.innerHTML=`<div class="card"><h3>${esc(cat?.title||'Categorie')}</h3><p>${esc(cat?.description||'Nu există încă produse în această categorie.')}</p></div>`;
      }else if(currentFile==='produse.html'){
        grid.innerHTML=data.categories.map(c=>`<a class="product-card" href="produse.html?category=${encodeURIComponent(c.slug)}"><img src="${esc(c.image||'https://placehold.co/700x500/png?text=Rosini')}" alt="${esc(c.title)} Rosini"><h3>${esc(c.title)}</h3><span>Vezi categoria →</span></a>`).join('')
      }
    }
    if(currentFile==='produs.html'){
      const requested=params.get('slug')||'';
      const p=(data.products||[]).find(x=>productSlug(x)===requested);
      if(p)renderProductDetail(p,s);else{const h=document.querySelector('.page-hero h1');if(h)h.textContent='Produs indisponibil';const intro=document.querySelector('.product-intro');if(intro)intro.textContent='Produsul solicitat nu mai este disponibil.'}
    }
    return fetch('/api/site-hours',{cache:'no-store'}).then(r=>r.ok?r.json():null)
  }).then(x=>{if(x?.hours)renderHours(x.hours)}).catch(error=>{console.error('Rosini site data:',error);setLogo(FALLBACK_LOGO)});
}
});
