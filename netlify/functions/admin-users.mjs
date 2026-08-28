import { getUser, admin } from '@netlify/identity';

const bootstrapAdmins = new Set(['rosinigrup@gmail.com', 'davidperiade@gmail.com']);

async function currentAdmin() {
  const user = await getUser();
  if (!user) return null;
  if (user.roles?.includes('admin')) return user;
  if (bootstrapAdmins.has(String(user.email || '').toLowerCase())) {
    await admin.updateUser(user.id, {
      appMetadata: { ...(user.appMetadata || {}), roles: ['admin'] }
    });
    return user;
  }
  return null;
}

function isAdmin(user) {
  return Boolean(user?.roles?.includes('admin')) || bootstrapAdmins.has(String(user?.email || '').toLowerCase());
}

function jsonError(message, status = 400) {
  return new Response(message, { status });
}

export default async (req) => {
  const actor = await currentAdmin();
  if (!actor) return new Response('Forbidden', { status: 403 });

  try {
    const users = await admin.listUsers();
    const admins = users.filter(isAdmin);

    if (req.method === 'GET') {
      return Response.json({
        currentUserId: actor.id,
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          roles: u.roles || [],
          isAdmin: isAdmin(u),
          confirmed: !!u.confirmedAt,
          createdAt: u.createdAt,
          lastLogin: u.lastLoginAt
        }))
      });
    }

    const body = await req.json();

    if (req.method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !email.includes('@')) return jsonError('Introdu o adresă de email validă.');
      if (password.length < 10) return jsonError('Parola trebuie să aibă minimum 10 caractere.');

      const existing = users.find(u => String(u.email || '').toLowerCase() === email);
      if (existing) return jsonError('Există deja un utilizator cu această adresă de email.', 409);

      const created = await admin.createUser({
        email,
        password,
        appMetadata: { roles: ['admin'] },
        confirm: true
      });
      return Response.json({ id: created.id, email: created.email });
    }

    if (req.method === 'PATCH') {
      const target = String(body.id || actor.id);
      const password = String(body.password || '');
      if (!password || password.length < 10) return jsonError('Parola trebuie să aibă minimum 10 caractere.');

      const targetUser = users.find(u => u.id === target);
      if (!targetUser) return jsonError('Administratorul nu a fost găsit.', 404);
      if (!isAdmin(targetUser)) return jsonError('Poți modifica doar conturi de administrator.', 403);

      const updated = await admin.updateUser(target, { password });
      return Response.json({ id: updated.id, email: updated.email });
    }

    if (req.method === 'DELETE') {
      const target = String(body.id || '');
      if (!target) return jsonError('User id required');
      if (admins.length <= 1) return jsonError('Ultimul administrator nu poate fi șters sau eliminat.', 409);

      const targetUser = admins.find(u => u.id === target);
      if (!targetUser) return jsonError('Administratorul nu a fost găsit.', 404);

      // Self-removal is allowed only while another administrator remains.
      await admin.deleteUser(target);
      return Response.json({ ok: true, selfDeleted: target === actor.id });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Identity operation failed' }, { status: 500 });
  }
};

export const config = { path: '/api/admin-users' };
