document.addEventListener('DOMContentLoaded',()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const clean=n=>String(n||'').replace(/\D/g,'').replace(/^0/,'40');
  const brand=el=>{if(!el||el.querySelector('.brand-symbol'))return;el.classList.add('brand-lockup');el.innerHTML='<span class="brand-symbol">R</span><span class="brand-name">ROSINI<small>confort. calitate. durabilitate.</small></span>';};
  document.querySelectorAll('.logo').forEach(brand);
  fetch('/site-data.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
    const s=data?.siteSettings||{};
    const number=clean(s.whatsapp_phone||s.phone_primary||'0742056286');
    const message=encodeURIComponent(s.whatsapp_message||'Bună ziua! Doresc să discut despre produsele Rosini.');
    if(s.show_whatsapp_button!==false){
      let float=document.querySelector('.whatsapp-float');
      if(!float){float=document.createElement('a');float.className='whatsapp-float';float.target='_blank';float.rel='noopener';float.setAttribute('aria-label','Contact Rosini pe WhatsApp');float.textContent='WhatsApp';document.body.appendChild(float)}
      float.href=`https://wa.me/${number}?text=${message}`;
    }
    const enhanceProducts=()=>{
      document.querySelectorAll('.category-products .product-card').forEach(card=>{
        if(card.querySelector('.btn-whatsapp'))return;
        const link=card.querySelector('a[href*="produs.html"]');
        if(!link)return;
        const title=card.querySelector('h3')?.textContent?.trim()||'produs Rosini';
        const href=link.getAttribute('href')||'';
        const msg=encodeURIComponent(`Bună ziua! Sunt interesat(ă) de produsul „${title}”.\nLink produs: ${location.origin}/${href}`);
        const actions=document.createElement('div');actions.className='product-card-actions';
        actions.innerHTML=`<a class="btn btn-whatsapp" href="https://wa.me/${number}?text=${msg}" target="_blank" rel="noopener">WhatsApp</a>`;
        card.appendChild(actions);
      });
    };
    enhanceProducts();
    new MutationObserver(enhanceProducts).observe(document.body,{childList:true,subtree:true});
    document.querySelectorAll('img[src*="placehold.co"]').forEach(img=>{img.closest('.category-section-head,.category-card,.product-card')?.classList.add('no-placeholder-image')});
  }).catch(()=>{});
});
