import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';
const store=()=>getStore({name:'rosini-reviews'});
const isAdmin=async()=>{const u=await getUser();return !!(u&&(u.roles?.includes('admin')||['rosinigrup@gmail.com','davidperiade@gmail.com'].includes(String(u.email).toLowerCase())))};
const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
const unwrap=x=>x?.data??x;
export default async req=>{const s=store();
if(req.method==='POST'){try{const b=await req.json(),author=String(b.author||'').trim().slice(0,80),review=String(b.review||'').trim().slice(0,1500),rating=Math.max(1,Math.min(5,Number(b.rating||0)));if(author.length<2||review.length<10||!Number.isInteger(rating))return json({error:'Date invalide.'},400);const id=crypto.randomUUID();await s.setJSON(`reviews/${id}`,{id,author,review,rating,status:'pending',createdAt:new Date().toISOString()});return json({ok:true})}catch(error){console.error('reviews POST',error);return json({error:'Cerere invalidă.'},400)}}
const admin=await isAdmin();
if(req.method==='GET'){try{const{blobs}=await s.list({prefix:'reviews/'});const entries=await Promise.all(blobs.map(x=>s.get(x.key,{type:'json'})));const all=entries.map(unwrap).filter(Boolean).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));return json({reviews:admin?all:all.filter(x=>x.status==='approved')})}catch(error){console.error('reviews GET',error);return json({error:'Recenziile nu sunt disponibile momentan.'},500)}}
if(!admin)return json({error:'Forbidden'},403);
if(req.method==='PATCH'||req.method==='DELETE'){try{const b=await req.json(),id=String(b.id||'');if(!id)return json({error:'ID lipsă.'},400);const key=`reviews/${id}`,entry=await s.get(key,{type:'json'}),r=unwrap(entry);if(!r)return json({error:'Recenzia nu există.'},404);if(req.method==='DELETE'){await s.delete(key);return json({ok:true})}const status=['pending','approved','rejected'].includes(b.status)?b.status:r.status;await s.setJSON(key,{...r,status,updatedAt:new Date().toISOString()});return json({ok:true})}catch(error){console.error('reviews admin',error);return json({error:'Cerere invalidă.'},400)}}
return new Response('Method not allowed',{status:405})};
export const config={path:'/api/reviews'};
