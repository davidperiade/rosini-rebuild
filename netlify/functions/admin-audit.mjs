import { getStore } from '@netlify/blobs';
import { getUser, admin } from '@netlify/identity';

const bootstrapAdmins = new Set(['rosinigrup@gmail.com', 'davidperiade@gmail.com']);
async function currentAdmin() {
  const user = await getUser();
  if (!user) return null;
  if (user.roles?.includes('admin')) return user;
  if (bootstrapAdmins.has(String(user.email).toLowerCase())) {
    await admin.updateUser(user.id, { appMetadata: { ...(user.appMetadata || {}), roles: ['admin'] } });
    return user;
  }
  return null;
}

export default async () => {
  if (!(await currentAdmin())) return new Response('Forbidden', { status: 403 });
  const store = getStore({ name: 'rosini-admin-audit' });
  const { blobs } = await store.list({});
  const events = [];
  for (const item of blobs) {
    const value = await store.get(item.key, { type: 'json' });
    if (value) events.push(value);
  }
  events.sort((a,b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0));
  return Response.json({ events: events.slice(0, 200) });
};
export const config = { path: '/api/admin-audit' };
