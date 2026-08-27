document.addEventListener('DOMContentLoaded',()=>{
  const data=window.__ROSINI_CMS__||{};
  const settings=data.siteSettings||{};
  const clean=n=>String(n||'').replace(/\D/g,'').replace(/^0/,'40');
  const number=clean(settings.whatsapp_phone||settings.phone_primary||'0742056286');
  const message=encodeURIComponent(settings.whatsapp_message||'Bună ziua! Doresc să discut despre produsele Rosini.');
  const float=document.querySelector('.whatsapp-float');
  if(float)float.href=`https://wa.me/${number}?text=${message}`;

  const enhanceProducts=()=>{
    document.querySelectorAll('.category-products .product-card').forEach(card=>{
      if(card.querySelector('.btn-whatsapp'))return;
      const link=card.querySelector('a[href*="produs.html"]');
      if(!link)return;
      const title=card.querySelector('h3')?.textContent?.trim()||'produs Rosini';
      const href=link.getAttribute('href')||'';
      const msg=encodeURIComponent(`Bună ziua! Sunt interesat(ă) de produsul „${title}”.\nLink produs: ${location.origin}/${href}`);
      const actions=document.createElement('div');
      actions.className='product-card-actions';
      actions.innerHTML=`<a class="btn btn-whatsapp" href="https://wa.me/${number}?text=${msg}" target="_blank" rel="noopener">WhatsApp</a>`;
      card.appendChild(actions);
    });
  };
  enhanceProducts();
  new MutationObserver(enhanceProducts).observe(document.body,{childList:true,subtree:true});

  if(float){
    const update=()=>float.classList.toggle('is-visible',window.scrollY>450);
    window.addEventListener('scroll',update,{passive:true});
    update();
  }
});
