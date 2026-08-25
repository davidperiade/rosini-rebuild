document.addEventListener('DOMContentLoaded',async()=>{
  const clean=n=>String(n||'').replace(/[^\d+]/g,'');
  const wa=n=>clean(n).replace(/^\+/,'').replace(/^0/,'40');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  try{
    const r=await fetch('/site-data.json',{cache:'no-store'}); if(!r.ok)return;
    const data=await r.json(),s=data.siteSettings||{};
    const callNumber=s.phone_primary||'';
    const whatsappNumber=s.whatsapp_phone||callNumber;
    const message=s.whatsapp_message||'Bună ziua! Doresc să discut despre produsele Rosini.';
    const showCall=s.show_call_button!==false;
    const showWhatsApp=s.show_whatsapp_button!==false;

    // Remove the old secondary phone everywhere this patch is loaded.
    document.querySelectorAll('a[href*="0747788231"],a[href*="0747 788 231"]').forEach(a=>a.remove());

    const updateProductActions=()=>{
      document.querySelectorAll('.product-actions').forEach(wrap=>{
        const buttons=[...wrap.querySelectorAll('a')];
        buttons.slice(1).forEach(a=>a.remove());
        const b=wrap.querySelector('a');
        if(!b)return;
        b.hidden=false;
        if(showWhatsApp&&whatsappNumber){
          b.className='btn btn-whatsapp'; b.textContent='WhatsApp'; b.target='_blank'; b.rel='noopener';
          b.href='https://wa.me/'+wa(whatsappNumber)+'?text='+encodeURIComponent(message);
        }else if(showCall&&callNumber){
          b.className='btn btn-primary'; b.textContent=callNumber; b.removeAttribute('target'); b.removeAttribute('rel'); b.href='tel:'+clean(callNumber);
        }else b.hidden=true;
        if(showCall&&callNumber&&showWhatsApp&&whatsappNumber){
          let call=wrap.querySelector('[data-contact-call]');
          if(!call){call=document.createElement('a');call.dataset.contactCall='1';wrap.appendChild(call)}
          call.className='btn btn-primary';call.textContent=callNumber;call.href='tel:'+clean(callNumber);
        }else wrap.querySelector('[data-contact-call]')?.remove();
      });
    };

    updateProductActions();
    new MutationObserver(updateProductActions).observe(document.body,{childList:true,subtree:true});
  }catch(e){}
});
