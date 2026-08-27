document.addEventListener('DOMContentLoaded',()=>{
  const float=document.querySelector('.whatsapp-float');
  if(!float)return;
  const update=()=>float.classList.toggle('is-visible',window.scrollY>450);
  window.addEventListener('scroll',update,{passive:true});
  update();
});
