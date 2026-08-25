document.addEventListener('DOMContentLoaded',()=>{
  const prose=document.querySelector('.prose');
  const title=document.querySelector('.page-hero h1')?.textContent?.trim();
  if(!prose||!title||prose.querySelector('.lead-cta'))return;

  const section=document.createElement('section');
  section.className='lead-cta';
  section.hidden=true;
  section.innerHTML=`
    <div class="section-head">
      <p class="eyebrow">Showroom Rosini</p>
      <h2>Sunt interesat / Vreau să vizitez showroom-ul</h2>
      <p>Lasă-ne datele și îți înregistrăm solicitarea. Vei primi un cod unic pe care îl poți prezenta consultantului în showroom.</p>
    </div>
    <form class="lead-form">
      <div class="lead-form-grid">
        <div><label for="lead-name">Nume *</label><input id="lead-name" name="name" autocomplete="name" required maxlength="100"></div>
        <div><label for="lead-phone">Număr de telefon *</label><input id="lead-phone" name="phone" type="tel" autocomplete="tel" required maxlength="25"></div>
        <div class="full"><label for="lead-product">Produsul de care ești interesat *</label><input id="lead-product" name="product" readonly required maxlength="180"></div>
        <div class="full"><label for="lead-message">Mesaj (opțional)</label><textarea id="lead-message" name="message" maxlength="1000" placeholder="De exemplu: dimensiuni, configurație sau alte detalii."></textarea></div>
      </div>
      <label class="lead-consent"><input id="lead-consent" name="consent" type="checkbox" required><span>Sunt de acord ca Rosini să folosească datele introduse pentru a răspunde solicitării mele privind showroom-ul și produsul selectat.</span></label>
      <div class="lead-error" hidden></div>
      <button class="btn btn-primary" type="submit">Trimite solicitarea</button>
    </form>`;

  const openButton=document.createElement('button');
  openButton.type='button';
  openButton.className='btn btn-primary lead-open-button';
  openButton.textContent='Sunt interesat / Vreau să vizitez showroom-ul';
  openButton.setAttribute('aria-expanded','false');
  openButton.setAttribute('aria-controls','rosini-lead-form');
  section.id='rosini-lead-form';
  prose.prepend(openButton);
  prose.appendChild(section);

  openButton.addEventListener('click',()=>{
    const isOpen=!section.hidden;
    section.hidden=isOpen;
    openButton.setAttribute('aria-expanded',String(!isOpen));
    openButton.textContent=isOpen?'Sunt interesat / Vreau să vizitez showroom-ul':'Închide formularul';
    if(!isOpen)setTimeout(()=>section.scrollIntoView({behavior:'smooth',block:'start'}),0);
  });

  section.querySelector('[name="product"]').value=title;
  const form=section.querySelector('form');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    const error=section.querySelector('.lead-error'),button=form.querySelector('button');
    error.hidden=true;button.disabled=true;button.textContent='Se trimite…';
    try{
      const body={name:form.name.value,phone:form.phone.value,product:form.product.value,message:form.message.value,consent:form.consent.checked};
      const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||'Solicitarea nu a putut fi înregistrată.');
      const id=data.id||data.leadId;
      sessionStorage.setItem('rosini_lead_id',id);
      [...document.querySelectorAll('a[href*="wa.me"]')].forEach(a=>{
        try{
          const u=new URL(a.href),text=u.searchParams.get('text')||'';
          u.searchParams.set('text',text+`\nCod solicitare site: ${id}`);
          a.href=u.toString();
        }catch{}
      });
      section.innerHTML=`<div class="lead-success"><p class="eyebrow">Solicitare înregistrată</p><h2>Solicitarea ta a fost înregistrată.</h2><p>Codul tău pentru showroom este:</p><div class="lead-code"><span>${id}</span><button class="lead-copy" type="button">Copiază</button></div><p>Spune acest cod consultantului când ajungi în showroom.</p><p class="form-note">Păstrează codul până la vizita în showroom.</p></div>`;
      section.hidden=false;
      openButton.textContent='Solicitare înregistrată';
      openButton.disabled=true;
      section.querySelector('.lead-copy').onclick=async()=>{
        try{await navigator.clipboard.writeText(id);section.querySelector('.lead-copy').textContent='Copiat'}catch{}
      };
    }catch(err){
      error.textContent=err.message;
      error.hidden=false;
      button.disabled=false;
      button.textContent='Trimite solicitarea';
    }
  });
});
