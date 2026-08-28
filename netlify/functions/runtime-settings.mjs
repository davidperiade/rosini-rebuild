import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';

const STORE_NAME = 'rosini-runtime-settings';
const KEY = 'site-contact';
const bootstrapAdmins = new Set(['rosinigrup@gmail.com', 'davidperiade@gmail.com']);

async function isAdmin() {
  const user = await getUser();
  if (!user) return false;
  return Boolean(user.roles?.includes('admin')) || bootstrapAdmins.has(String(user.email || '').toLowerCase());
}

function cleanPhone(value) {
  return String(value ?? '').replace(/[^0-9+ ]/g, '').trim();
}

export default async (request) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });

  if (request.method === 'GET') {
    const value = await store.get(KEY, { type: 'json', consistency: 'strong' });
    return Response.json(value || {}, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }

  if (request.method !== 'PUT' && request.method !== 'PATCH') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!(await isAdmin())) return new Response('Forbidden', { status: 403 });

  try {
    const body = await request.json();
    const whatsapp_phone = cleanPhone(body.whatsapp_phone);
    const whatsapp_message = String(body.whatsapp_message ?? '').trim();

    if (!whatsapp_phone) return Response.json({ error: 'Introdu numărul WhatsApp.' }, { status: 400 });
    if (!whatsapp_message) return Response.json({ error: 'Introdu mesajul WhatsApp.' }, { status: 400 });

    const value = {
      whatsapp_phone,
      whatsapp_message,
      updatedAt: new Date().toISOString()
    };
    await store.setJSON(KEY, value);

    return Response.json(value, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Nu s-au putut salva setările WhatsApp.' }, { status: 500 });
  }
};

export const config = { path: '/api/runtime-settings' };