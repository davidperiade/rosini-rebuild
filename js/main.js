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
  const started=Date.now();
  send('page_view');
  const report=()=>send('page_view',{durationSeconds:Math.round((Date.now()-started)/1000)});
  window.addEventListener('pagehide',report,{once:true});
});
