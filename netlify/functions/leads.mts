import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

const STORE = 'rosini-leads';
const ALLOWED = new Set(['Lead nou','Contactat','A venit în showroom','Vânzare realizată','Fără vânzare','Anulat']);

function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }); }
async function auth(context: Context) {
  const user = context.clientContext?.user;
  if (!user) return false;
  return Array.isArray(user.app_metadata?.roles) && user.app_metadata.roles.includes('admin');
}
async function nextId(store: ReturnType<typeof getStore>) {
  const counter = await store.get('counter', { type: 'json' }) as { value?: number } | null;
  const value = Math.max(1000, counter?.value ?? 1000) + 1;
  await store.setJSON('counter', { value });
  return `ROS-${value}`;
}
export default async (req: Request, context: Context) => {
  const store = getStore(STORE);
  if (req.method === 'POST') {
    const body = await req.json().catch(() => null);
    if (!body?.name || !body?.phone || !body?.product || body?.consent !== true) return json({ error: 'Completează câmpurile obligatorii și acordul privind datele.' }, 400);
    const id = await nextId(store);
    const lead = { id, name: String(body.name).trim(), phone: String(body.phone).trim(), product: String(body.product).trim(), message: String(body.message ?? '').trim(), source: 'Site Rosini', createdAt: new Date().toISOString(), status: 'Lead nou', saleValue: 0, commissionPercent: 0, commission: 0, notes: '', history: [{ at: new Date().toISOString(), status: 'Lead nou' }] };
    await store.setJSON(id, lead, { onlyIfNew: true });
    return json({ id }, 201);
  }
  if (!(await auth(context))) return json({ error: 'Neautorizat' }, 401);
  if (req.method === 'GET') {
    const { blobs } = await store.list();
    const leads = [];
    for (const b of blobs.filter(x => x.key.startsWith('ROS-'))) { const l = await store.get(b.key, { type: 'json' }); if (l) leads.push(l); }
    leads.sort((a: any,b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return json(leads);
  }
  if (req.method === 'PATCH') {
    const body = await req.json().catch(() => null); const id = body?.id;
    if (!id || !/^ROS-\d+$/.test(id)) return json({ error: 'ID invalid' }, 400);
    const lead = await store.get(id, { type: 'json' }) as any; if (!lead) return json({ error: 'Lead inexistent' }, 404);
    const oldStatus = lead.status;
    if (body.status && !ALLOWED.has(body.status)) return json({ error: 'Status invalid' }, 400);
    lead.status = body.status ?? lead.status;
    lead.saleValue = Number(body.saleValue ?? lead.saleValue ?? 0) || 0;
    lead.commissionPercent = Number(body.commissionPercent ?? lead.commissionPercent ?? 0) || 0;
    lead.commission = Math.round(lead.saleValue * lead.commissionPercent) / 100;
    lead.notes = String(body.notes ?? lead.notes ?? '');
    if (lead.status !== oldStatus) lead.history = [...(lead.history ?? []), { at: new Date().toISOString(), status: lead.status }];
    await store.setJSON(id, lead);
    return json(lead);
  }
  return json({ error: 'Method not allowed' }, 405);
};
export const config = { path: '/api/leads' };
