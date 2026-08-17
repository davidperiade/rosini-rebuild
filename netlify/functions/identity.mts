import { getStore } from '@netlify/blobs';
import type { Config, UserLoginEvent, UserSignupEvent, UserModifiedEvent, UserDeletedEvent } from '@netlify/functions';

const bootstrapAdmins = new Set(['rosinigrup@gmail.com', 'davidperiade@gmail.com']);
const store = () => getStore({ name: 'rosini-admin-audit' });

export default {
  async userSignup(event: UserSignupEvent) {
    const email = String(event.user.email || '').toLowerCase();
    if (bootstrapAdmins.has(email)) {
      return { user: { ...event.user, appMetadata: { ...event.user.appMetadata, roles: ['admin'] } } };
    }
    return undefined;
  },
  async userLogin(event: UserLoginEvent) {
    const key = `login/${Date.now()}-${crypto.randomUUID()}`;
    await store().setJSON(key, { event: 'login', email: event.user.email, timestamp: new Date().toISOString() });
  },
  async userModified(event: UserModifiedEvent) {
    const key = `activity/${Date.now()}-${crypto.randomUUID()}`;
    await store().setJSON(key, { event: 'modified', email: event.user.email, timestamp: new Date().toISOString() });
  },
  async userDeleted(event: UserDeletedEvent) {
    const key = `activity/${Date.now()}-${crypto.randomUUID()}`;
    await store().setJSON(key, { event: 'deleted', email: event.user.email, timestamp: new Date().toISOString() });
  }
};

export const config: Config = { background: true };
