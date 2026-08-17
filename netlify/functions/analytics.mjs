import { getStore } from '@netlify/blobs';
const allowed = new Set(['page_view','phone_click','whatsapp_click','email_click','contact_submit','cta_click']);
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const body = await req.json();
    const type = String(body.type || '');
    if (!allowed.has(type)) return new Response('Invalid event', { status: 400 });
    const event = { id: crypto.randomUUID(), type, path: String(body.path || '/').slice(0,300), referrer: String(body.referrer || '').slice(0,500), timestamp: new Date().toISOString(), durationSeconds: Math.max(0, Math.min(Number(body.durationSeconds || 0),86400)) };
    await getStore({ name: 'rosini-analytics' }).setJSON(`events/${event.id}`, event);
    return Response.json({ ok: true });
  } catch { return new Response('Invalid request', { status: 400 }); }
};
export const config = { path: '/api/analytics' };
