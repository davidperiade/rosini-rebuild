import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';

const STORE_NAME='rosini-project-gallery';
const META_KEY='items';
const bootstrapAdmins=new Set(['rosinigrup@gmail.com','davidperiade@gmail.com']);
const store=()=>getStore({name:STORE_NAME,consistency:'strong'});

async function isAdmin(){const user=await getUser();if(!user)return false;return Boolean(user.roles?.includes('admin'))||bootstrapAdmins.has(String(user.email||'').toLowerCase())}
function id(){return `${Date.now()}-${Math.random().toString(36).slice(2,9)}`}
function clean(v,max=500){return String(v??'').trim().slice(0,max)}
function safeExt(type,name=''){const ext=String(name).toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[1];if(ext)return ext==='jpeg'?'jpg':ext;if(type==='image/jpeg')return 'jpg';if(type==='image/png')return 'png';if(type==='image/webp')return 'webp';return null}
async function items(){const value=await store().get(META_KEY,{type:'json',consistency:'strong'});return Array.isArray(value)?value:[]}
function sort(list){return [...list].sort((a,b)=>Number(a.order||0)-Number(b.order||0)||String(a.createdAt||'').localeCompare(String(b.createdAt||'')))}
function imageUrl(item){return `/.netlify/functions/gallery-image?id=${encodeURIComponent(item.id)}`}
function publicItem(item){return {...item,image:imageUrl(item)}}

export default async request=>{
  try{
    if(request.method==='GET') return Response.json(sort((await items()).filter(x=>x.active!==false)).map(publicItem),{headers:{'Cache-Control':'no-store, no-cache, must-revalidate'}});
    if(!(await isAdmin())) return Response.json({error:'Forbidden'},{status:403});
    const current=await items();
    if(request.method==='POST'){
      const form=await request.formData(); const file=form.get('image');
      if(!(file instanceof File)||!file.size)return Response.json({error:'Alege o fotografie.'},{status:400});
      if(file.size>5*1024*1024)return Response.json({error:'Fotografia depășește limita de 5 MB.'},{status:400});
      const ext=safeExt(file.type,file.name);if(!ext)return Response.json({error:'Format acceptat: JPG, PNG sau WebP.'},{status:400});
      const item={id:id(),title:clean(form.get('title'),100),alt_text:clean(form.get('alt_text'),160),order:Number(form.get('order')||0),active:String(form.get('active'))!=='false',ext,createdAt:new Date().toISOString()};
      await store().set(`image/${item.id}.${ext}`,await file.arrayBuffer(),{metadata:{contentType:file.type}});
      current.push(item);await store().setJSON(META_KEY,sort(current));return Response.json(publicItem(item),{status:201});
    }
    if(request.method==='PUT'||request.method==='PATCH'){
      const contentType=request.headers.get('content-type')||'';let body;
      if(contentType.includes('multipart/form-data')){const form=await request.formData();body=Object.fromEntries([...form.entries()].filter(([k,v])=>!(v instanceof File)));body.image=form.get('image')}else body=await request.json();
      const idx=current.findIndex(x=>x.id===String(body.id||''));if(idx<0)return Response.json({error:'Proiectul nu a fost găsit.'},{status:404});
      const item={...current[idx],title:clean(body.title,100),alt_text:clean(body.alt_text,160),order:Number(body.order||0),active:body.active===undefined?current[idx].active!==false:String(body.active)!=='false'};
      const file=body.image;if(file instanceof File&&file.size){if(file.size>5*1024*1024)return Response.json({error:'Fotografia depășește limita de 5 MB.'},{status:400});const ext=safeExt(file.type,file.name);if(!ext)return Response.json({error:'Format acceptat: JPG, PNG sau WebP.'},{status:400});if(current[idx].ext)await store().delete(`image/${item.id}.${current[idx].ext}`);item.ext=ext;await store().set(`image/${item.id}.${ext}`,await file.arrayBuffer(),{metadata:{contentType:file.type}})}
      current[idx]=item;await store().setJSON(META_KEY,sort(current));return Response.json(publicItem(item));
    }
    if(request.method==='DELETE'){
      const body=await request.json();const idx=current.findIndex(x=>x.id===String(body.id||''));if(idx<0)return Response.json({error:'Proiectul nu a fost găsit.'},{status:404});const [removed]=current.splice(idx,1);if(removed.ext)await store().delete(`image/${removed.id}.${removed.ext}`);await store().setJSON(META_KEY,current);return Response.json({deleted:publicItem(removed)});
    }
    return new Response('Method not allowed',{status:405});
  }catch(error){return Response.json({error:error?.message||'Galeria nu a putut fi actualizată.'},{status:500})}
};
export const config={path:'/api/gallery'};
