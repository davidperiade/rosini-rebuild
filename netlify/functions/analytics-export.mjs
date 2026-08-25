import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';
const isAdmin=async()=>{const u=await getUser();return !!(u&&(u.roles?.includes('admin')||['rosinigrup@gmail.com','davidperiade@gmail.com'].includes(String(u.email).toLowerCase())))};
const q=v=>`"${String(v??'').replaceAll('"','""')}"`;
export default async()=>{if(!(await isAdmin()))return new Response('Forbidden',{status:403});const s=getStore({name:'rosini-analytics'}),{blobs}=await s.list({prefix:'events/'}),events=(await Promise.all(blobs.map(x=>s.get(x.key,{type:'json'})))).filter(Boolean).sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));const head='timestamp,type,sessionId,path,referrer,durationSeconds';const rows=events.map(e=>[e.timestamp,e.type,e.sessionId,e.path,e.referrer,e.durationSeconds].map(q).join(','));return new Response([head,...rows].join('\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="rosini-analytics.csv"'}})};
export const config={path:'/api/analytics-export'};
