document.addEventListener('DOMContentLoaded',()=>{
  const send=(type,extra={})=>{try{navigator.sendBeacon('/api/analytics',new Blob([JSON.stringify({type,path:location.pathname,referrer:document.referrer,...extra})],{type:'application/json'}))}catch{}};
  const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav');
  if(toggle&&nav){toggle.addEventListener('click',()=>nav.classList.toggle('open'));nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')))}
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(id.length>1){const el=document.querySelector(id);if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth'})}}}));
  const form=document.querySelector('form[name="contact"]');
  if(form){form.addEventListener('submit',e=>{if(!form.checkValidity()){e.preventDefault();form.reportValidity()}else send('contact_submit')})}
  document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.addEventListener('click',()=>send('phone_click')));
  document.querySelectorAll('a[href*="wa.me"],a[href*="whatsapp"]').forEach(a=>a.addEventListener('click',()=>send('whatsapp_click')));
  document.querySelectorAll('a[href^="mailto:"]').forEach(a=>a.addEventListener('click',()=>send('email_click')));
  document.querySelectorAll('.btn,.nav-cta').forEach(a=>a.addEventListener('click',()=>send('cta_click')));
  const started=Date.now();send('page_view');window.addEventListener('pagehide',()=>send('page_view',{durationSeconds:Math.round((Date.now()-started)/1000)}),{once:true});

  fetch('/site-data.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(!data)return;const s=data.siteSettings||{};
    document.querySelectorAll('a[href^="tel:"]').forEach((a,i)=>{const n=i%2===0?s.phone_primary:s.phone_secondary;if(n){a.href='tel:'+n.replace(/\s/g,'');a.textContent=n}});
    document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{if(s.email){a.href='mailto:'+s.email;a.textContent=s.email}});
    const address=[...document.querySelectorAll('.footer p,.contact-info p')].find(e=>e.textContent.includes('Șos.')||e.textContent.includes('Sos.'));if(address&&s.address){address.innerHTML=address.innerHTML.replace(/Șos\. Păcurari Nr\. 54, Bl\. 554, Sc\. B, P, Iași/g,s.address)}
    const social=[['Facebook',s.facebook_url],['Instagram',s.instagram_url],['TikTok',s.tiktok_url]];document.querySelectorAll('.footer a').forEach(a=>{const hit=social.find(x=>a.textContent.trim()===x[0]);if(hit){if(hit[1]){a.href=hit[1];a.target='_blank';a.rel='noopener'}else a.parentElement?.remove()}});
    const grid=document.querySelector('.product-grid');if(grid&&Array.isArray(data.categories)){grid.innerHTML=data.categories.map(c=>{const file={"canapele-living":"canapele-living-extensie.html","canapele-trafic":"canapele-trafic-intens.html","paturi-matrimoniale":"paturi-matrimoniale.html","fotolii":"fotolii.html","tabureti":"tabureti.html","paturi-copii":"paturi-copii.html","mobilier-horeca":"mobilier-horeca.html"}[c.slug]||('#');return `<a class="product-card" href="${file}"><img src="${c.image||''}" alt="${c.title} Rosini"><h3>${c.title}</h3><span>Vezi categoria →</span></a>`}).join('')}
    const map={"canapele-living-extensie.html":"canapele-living","canapele-trafic-intens.html":"canapele-trafic","paturi-matrimoniale.html":"paturi-matrimoniale","fotolii.html":"fotolii","tabureti.html":"tabureti","paturi-copii.html":"paturi-copii","mobilier-horeca.html":"mobilier-horeca"};const slug=map[location.pathname.split('/').pop()];const p=(data.products||[]).find(x=>x.slug===slug);if(p){const h=document.querySelector('.page-hero h1');if(h)h.textContent=p.title;const hero=document.querySelector('.page-hero p:last-child');if(hero)hero.textContent=p.description||'';const img=document.querySelector('.prose img');if(img&&p.image){img.src=p.image;img.alt=p.title+' Rosini'}document.querySelectorAll('.spec').forEach(el=>{if(el.textContent.includes('Livrare'))el.innerHTML='<strong>Livrare</strong>'+(p.delivery_time||s.delivery_weeks+' săptămâni');if(el.textContent.includes('Garanție'))el.innerHTML='<strong>Garanție</strong>'+(p.warranty||s.warranty_months+' luni')})}
  }).catch(()=>{});
});
