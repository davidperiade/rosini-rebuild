import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';
const STORE='rosini-leads';
const STATUSES=['Lead nou','Contactat','A venit în showroom','Vânzare realizată','Fără vânzare','Anulat'];
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8'}});
const isAdmin=async(c:Context)=>{const u=c.clientContext?.user;return !!u&&Array.isArray(u.app_metadata?.roles)&&u.app_metadata.roles.includes('admin')};
async function nextId(store:ReturnType<typeof getStore>){const c=await store.get('counter',{type:'json'}) as {value?:number}|null;const n=Math.max(1000,Number(c?.value||1000))+1;await store.setJSON('counter',{value:n});return `ROS-${n}`}
export default async(req:Request,c:Context)=>{const store=getStore(STORE);
 if(req.method==='POST'){const b=await req.json().catch(()=>null);if(!b?.name||!b?.phone||!b?.product||b?.consent!==true)return json({error:'Completează câmpurile obligatorii și acordul privind datele.'},400);const now=new Date().toISOString(),id=await nextId(store);const lead={id,name:String(b.name).trim(),phone:String(b.phone).trim(),product:String(b.product).trim(),message:String(b.message??'').trim(),source:'Site Rosini',createdAt:now,status:'Lead nou',saleValue:0,commissionRate:0,commission:0,notes:'',history:[{at:now,status:'Lead nou'}]};await store.setJSON(id,lead,{onlyIfNew:true});return json({id,leadId:id},201)}
 if(!(await isAdmin(c)))return json({error:'Neautorizat'},401);
 if(req.method==='GET'){const {blobs}=await store.list();const leads=[];for(const x of blobs.filter(x=>/^ROS-\d+$/.test(x.key))){const l=await store.get(x.key,{type:'json'});if(l)leads.push(l)}leads.sort((a:any,b:any)=>String(b.createdAt).localeCompare(String(a.createdAt)));return json({leads,statuses:STATUSES})}
 if(req.method==='PATCH'){const b=await req.json().catch(()=>null),id=b?.id;if(!id||!/^ROS-\d+$/.test(id))return json({error:'ID invalid'},400);const lead=await store.get(id,{type:'json'}) as any;if(!lead)return json({error:'Lead inexistent'},404);const old=lead.status;if(b.status&&!STATUSES.includes(b.status))return json({error:'Status invalid'},400);lead.status=b.status??old;lead.saleValue=Number(b.saleValue??lead.saleValue??0)||0;lead.commissionRate=Number(b.commissionRate??b.commissionPercent??lead.commissionRate??0)||0;lead.commission=Math.round(lead.saleValue*lead.commissionRate)/100;lead.notes=String(b.notes??lead.notes??'');if(lead.status!==old)lead.history=[...(lead.history||[]),{at:new Date().toISOString(),status:lead.status}];await store.setJSON(id,lead);return json(lead)}
 return json({error:'Method not allowed'},405)};
export const config={path:'/api/leads'};
