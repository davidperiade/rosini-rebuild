document.addEventListener('DOMContentLoaded',async()=>{
  const clean=n=>String(n||'').replace(/[^\d+]/g,'');
  const wa=n=>clean(n).replace(/^\+/,'').replace(/^0/,'40');
  try{
    const r=await fetch('/site-data.json',{cache:'no-store'}); if(!r.ok)return;
    const data=await r.json(),s=data.siteSettings||{};
    const callNumber=s.phone_primary||'';
    const whatsappNumber=s.whatsapp_phone||callNumber;
    const baseMessage=s.whatsapp_message||'Bună ziua! Sunt interesat(ă) de produsul {produs}.';
    const showCall=s.show_call_button!==false;
    const showWhatsApp=s.show_whatsapp_button!==false;
    document.querySelectorAll('a[href*="0747788231"],a[href*="0747 788 231"]').forEach(a=>a.remove());
    const updateProductActions=()=>document.querySelectorAll('.product-actions').forEach(wrap=>{
      const primary=[...wrap.querySelectorAll('a:not([data-contact-call])')];
      primary.slice(1).forEach(a=>a.remove());
      const first=primary[0]; if(!first)return;
      const product=document.querySelector('.page-hero h1')?.textContent?.trim()||'produsul Rosini';
      const message=baseMessage.replaceAll('{produs}',product);
      const link='https://wa.me/'+wa(whatsappNumber)+'?text='+encodeURIComponent(message);
      if(showWhatsApp&&whatsappNumber){first.hidden=false;first.className='btn btn-whatsapp';first.textContent='WhatsApp';first.target='_blank';first.rel='noopener';first.href=link}
      else if(showCall&&callNumber){first.hidden=false;first.className='btn btn-primary';first.textContent=callNumber;first.removeAttribute('target');first.removeAttribute('rel');first.href='tel:'+clean(callNumber)}
      else first.hidden=true;
      if(showCall&&callNumber&&showWhatsApp&&whatsappNumber){
        let call=wrap.querySelector('[data-contact-call]');
        if(!call){call=document.createElement('a');call.dataset.contactCall='1';wrap.appendChild(call)}
        call.className='btn btn-primary';call.textContent=callNumber;call.href='tel:'+clean(callNumber);call.hidden=false;
      }else wrap.querySelector('[data-contact-call]')?.remove();
    });
    updateProductActions();
    new MutationObserver(updateProductActions).observe(document.body,{childList:true,subtree:true});
  }catch(e){}
});
