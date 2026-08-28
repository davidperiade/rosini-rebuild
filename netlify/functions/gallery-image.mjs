import { getStore } from '@netlify/blobs';
const STORE_NAME='rosini-project-gallery';
export default async request=>{
  const id=new URL(request.url).searchParams.get('id');
  if(!id)return new Response('Missing id',{status:400});
  const store=getStore({name:STORE_NAME,consistency:'strong'});
  const meta=await store.get('items',{type:'json',consistency:'strong'})||[];
  const item=Array.isArray(meta)?meta.find(x=>x.id===id):null;
  if(!item||!item.ext)return new Response('Not found',{status:404});
  const blob=await store.get(`image/${item.id}.${item.ext}`,{type:'blob',consistency:'strong'});
  if(!blob)return new Response('Not found',{status:404});
  const type=item.ext==='jpg'?'image/jpeg':item.ext==='png'?'image/png':'image/webp';
  return new Response(blob,{headers:{'Content-Type':type,'Cache-Control':'public, max-age=31536000, immutable'}});
};
export const config={path:'/api/gallery-image'};
