(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('projectList')) return;
  const style=document.createElement('style');style.textContent='.project-preview{margin-top:10px}.project-preview img{display:block;width:min(520px,100%);aspect-ratio:16/10;object-fit:cover;border-radius:12px;border:1px solid #ddd8d0}.project-preview:empty{display:none}';document.head.appendChild(style);
  let items = [];
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = (message, ok=false) => { $('projectStatus').textContent = message || ''; $('projectStatus').className = `status ${ok ? 'ok' : 'error'}`; };
  const formStatus = (message, ok=false) => { $('projectFormStatus').textContent = message || ''; $('projectFormStatus').className = `status ${ok ? 'ok' : 'error'}`; };
  async function request(url='/api/gallery', options={}) {
    const r = await fetch(url, { ...options, credentials:'same-origin', cache:'no-store' });
    const text = await r.text(); let data = {};
    try { data = JSON.parse(text); } catch { data = { error:text }; }
    if (!r.ok) throw new Error(data.error || 'Operațiunea a eșuat.');
    return data;
  }
  function resetForm(){ $('projectForm').reset(); $('projectId').value=''; $('projectExistingImage').value=''; $('projectActive').checked=true; $('projectOrder').value=0; $('projectPreview').innerHTML=''; $('projectImageHint').textContent='Alege o fotografie JPG, PNG sau WebP. Pentru editare poți păstra fotografia existentă.'; formStatus(''); $('projectForm').classList.remove('is-open'); }
  function preview(src, alt='') { $('projectPreview').innerHTML = src ? `<img src="${esc(src)}" alt="${esc(alt)}">` : ''; }
  function openForm(item=null){ $('projectForm').classList.add('is-open'); $('projectId').value=item?.id||''; $('projectExistingImage').value=item?.image||''; $('projectTitle').value=item?.title||''; $('projectAlt').value=item?.alt_text||''; $('projectOrder').value=item?.order??0; $('projectActive').checked=item?.active!==false; $('projectImage').value=''; $('projectImageHint').textContent=item?.image ? 'Fotografia existentă va fi păstrată dacă nu alegi una nouă.' : 'Alege o fotografie JPG, PNG sau WebP.'; preview(item?.image,item?.alt_text||item?.title||''); $('projectTitle').focus(); }
  function render(){
    if(!items.length){$('projectList').innerHTML='<div class="empty">Nu există încă proiecte. Apasă „+ Adaugă fotografie”.</div>';return;}
    $('projectList').innerHTML=items.map(item=>`<div class="category-item"><img class="category-thumb" src="${esc(item.image||'/content/images/placeholder-product.svg')}" alt=""><div class="category-meta"><h3>${esc(item.title||'Proiect realizat')}</h3><p>${esc(item.alt_text||'Fără descriere')} · ordine: ${esc(item.order??0)} · ${item.active===false?'Ascunsă':'Vizibilă'}</p></div><div class="category-actions"><button type="button" class="secondary" data-edit="${esc(item.id)}">Editează</button><button type="button" class="secondary" data-toggle="${esc(item.id)}">${item.active===false?'Afișează':'Ascunde'}</button><button type="button" class="danger" data-delete="${esc(item.id)}">Șterge</button></div></div>`).join('');
    $('projectList').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openForm(items.find(x=>x.id===b.dataset.edit)));
    $('projectList').querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const item=items.find(x=>x.id===b.dataset.toggle);if(!item)return;try{await request('/api/gallery',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,active:item.active===false})});await load();status(`„${item.title||'Proiectul'}” a fost ${item.active===false?'activat':'ascuns'}.`,true)}catch(e){status(e.message)}});
    $('projectList').querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{const item=items.find(x=>x.id===b.dataset.delete);if(!item)return;if(!confirm(`Ștergi „${item.title||'acest proiect'}”?`))return;try{await request('/api/gallery',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id})});await load();status('Fotografia a fost ștearsă.',true)}catch(e){status(e.message)}});
  }
  async function load(){try{items=await request();items=Array.isArray(items)?items:[];render()}catch(e){$('projectList').innerHTML='<div class="empty">Proiectele nu au putut fi încărcate.</div>';status(e.message)}}
  $('newProject').onclick=()=>openForm(); $('cancelProject').onclick=resetForm;
  $('projectImage').addEventListener('change',()=>{const file=$('projectImage').files?.[0];if(file){if(file.size>5*1024*1024){formStatus('Fotografia depășește limita de 5 MB.');$('projectImage').value='';return;}preview(URL.createObjectURL(file),file.name);}});
  $('projectForm').addEventListener('submit',async e=>{
    e.preventDefault(); const button=$('saveProject');button.disabled=true;formStatus('Se salvează…');
    try{
      const fd=new FormData(); const id=$('projectId').value; fd.append('id',id); fd.append('title',$('projectTitle').value.trim()); fd.append('alt_text',$('projectAlt').value.trim()); fd.append('order',$('projectOrder').value||0); fd.append('active',$('projectActive').checked?'true':'false');
      const file=$('projectImage').files?.[0]; if(file) fd.append('image',file); else if($('projectExistingImage').value) fd.append('existing_image',$('projectExistingImage').value);
      await request('/api/gallery',{method:id?'PUT':'POST',body:fd}); formStatus(id?'Fotografia a fost actualizată.':'Fotografia a fost adăugată.',true); await load(); setTimeout(resetForm,350);
    }catch(err){formStatus(err.message)}finally{button.disabled=false}
  });
  load();
})();
