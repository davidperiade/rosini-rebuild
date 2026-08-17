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

export default async (req) => {
  const actor = await currentAdmin();
  if (!actor) return new Response('Forbidden', { status: 403 });

  try {
    if (req.method === 'GET') {
      const users = await admin.listUsers();
      return Response.json({
        users: users.map(u => ({ id: u.id, email: u.email, roles: u.roles || [], confirmed: !!u.confirmedAt, createdAt: u.createdAt, lastLogin: u.lastLoginAt }))
      });
    }

    const body = await req.json();
    if (req.method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) return new Response('Email required', { status: 400 });
      const created = await admin.createUser({ email, appMetadata: { roles: ['admin'] }, confirm: false });
      return Response.json({ id: created.id, email: created.email });
    }

    if (req.method === 'PATCH') {
      const target = String(body.id || '');
      if (!target) return new Response('User id required', { status: 400 });
      const updated = await admin.updateUser(target, { appMetadata: { roles: ['admin'] } });
      return Response.json({ id: updated.id, email: updated.email, roles: updated.roles || [] });
    }

    if (req.method === 'DELETE') {
      const target = String(body.id || '');
      const users = await admin.listUsers();
      const admins = users.filter(u => (u.roles || []).includes('admin') || bootstrapAdmins.has(String(u.email).toLowerCase()));
      if (admins.length <= 1) return new Response('Ultimul administrator nu poate fi șters.', { status: 409 });
      if (!target) return new Response('User id required', { status: 400 });
      if (target === actor.id) return new Response('Pentru siguranță, nu îți poți șterge propriul cont.', { status: 400 });
      await admin.deleteUser(target);
      return Response.json({ ok: true });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Identity operation failed' }, { status: 500 });
  }
};

export const config = { path: '/api/admin-users' };
