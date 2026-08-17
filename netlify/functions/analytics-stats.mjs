import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';

export default async () => {
  const user = await getUser();
  if (!user || !user.roles?.includes('admin')) return new Response('Forbidden', { status: 403 });
  const store = getStore({ name: 'rosini-analytics' });
  const { blobs } = await store.list({ prefix: 'events/' });
  const events = [];
  for (const item of blobs) {
    const value = await store.get(item.key, { type: 'json' });
    if (value) events.push(value);
  }
  const now = Date.now();
  const recent = events.filter(e => now - Date.parse(e.timestamp) <= 30 * 86400000);
  const count = type => recent.filter(e => e.type === type).length;
  const durations = recent.filter(e => e.type === 'page_view' && e.durationSeconds > 0).map(e => e.durationSeconds);
  const avg = durations.length ? Math.round(durations.reduce((a,b) => a+b, 0) / durations.length) : 0;
  const pages = {};
  for (const e of recent.filter(e => e.type === 'page_view')) pages[e.path] = (pages[e.path] || 0) + 1;
  const topPages = Object.entries(pages).sort((a,b) => b[1] - a[1]).slice(0, 10);
  return Response.json({ periodDays: 30, totalEvents: recent.length, pageViews: count('page_view'), phoneClicks: count('phone_click'), whatsappClicks: count('whatsapp_click'), emailClicks: count('email_click'), ctaClicks: count('cta_click'), contactSubmits: count('contact_submit'), averageEngagementSeconds: avg, topPages });
};
export const config = { path: '/api/analytics-stats' };
