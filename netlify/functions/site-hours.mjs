import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';
const defaults=[['Luni','09:00','18:00'],['Marți','09:00','18:00'],['Miercuri','09:00','18:00'],['Joi','09:00','18:00'],['Vineri','09:00','18:00'],['Sâmbătă','09:00','14:00'],['Duminică','Închis','']].map(([day,open,close])=>({day,open,close}));
const store=()=>getStore({name:'rosini-site-config'});
const admin=async()=>{const u=await getUser();return !!(u&&(u.roles?.includes('admin')||['rosinigrup@gmail.com','davidperiade@gmail.com'].includes(String(u.email).toLowerCase())))};
export default async req=>{const s=store();if(req.method==='GET'){const x=await s.get('hours',{type:'json'});return Response.json({hours:Array.isArray(x)?x:defaults},{headers:{'Cache-Control':'no-store'}})}if(!(await admin()))return new Response('Forbidden',{status:403});if(req.method==='PUT'){try{const b=await req.json(),hours=Array.isArray(b.hours)?b.hours.slice(0,7).map(x=>({day:String(x.day||'').slice(0,30),open:String(x.open||'').slice(0,20),close:String(x.close||'').slice(0,20)})):null;if(!hours||hours.length!==7)throw 0;await s.setJSON('hours',hours);return Response.json({ok:true,hours})}catch{return new Response('Program invalid',{status:400})}}return new Response('Method not allowed',{status:405})};
export const config={path:'/api/site-hours'};
