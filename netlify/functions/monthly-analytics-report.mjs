import { getStore } from '@netlify/blobs';

const REPORT_TO = 'davidperiade@gmail.com';
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const ANALYTICS_STORE = 'rosini-analytics';
const STATE_STORE = 'rosini-report-state';
const STATE_KEY = 'monthly-report.json';

function csvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

async function loadEvents() {
  const store = getStore({ name: ANALYTICS_STORE });
  const { blobs } = await store.list({ prefix: 'events/' });
  const values = await Promise.all(
    blobs.map((blob) => store.get(blob.key, { type: 'json' }))
  );
  return values.filter(Boolean);
}

function buildStats(events) {
  const now = Date.now();
  const recent = events.filter((event) => {
    const timestamp = Date.parse(event.timestamp);
    return Number.isFinite(timestamp) && now - timestamp <= PERIOD_MS;
  });

  const count = (type) => recent.filter((event) => event.type === type).length;
  const sessions = new Set(recent.map((event) => event.sessionId).filter(Boolean));
  const durations = recent
    .filter((event) => event.type === 'engagement' && Number(event.durationSeconds) > 0)
    .map((event) => Number(event.durationSeconds));
  const averageSeconds = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : 0;

  const pages = {};
  for (const event of recent.filter((item) => item.type === 'page_view')) {
    pages[event.path] = (pages[event.path] || 0) + 1;
  }

  const topPages = Object.entries(pages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    periodDays: 30,
    totalEvents: recent.length,
    sessions: sessions.size,
    pageViews: count('page_view'),
    phoneClicks: count('phone_click'),
    whatsappClicks: count('whatsapp_click'),
    emailClicks: count('email_click'),
    ctaClicks: count('cta_click'),
    contactSubmits: count('contact_submit'),
    reviewSubmits: count('review_submit'),
    averageEngagementSeconds: averageSeconds,
    topPages,
    recent,
  };
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return minutes ? `${minutes} min ${remainder} sec` : `${remainder} sec`;
}

function renderHtml(stats) {
  const rows = [
    ['Sesiuni', stats.sessions],
    ['Vizualizări pagini', stats.pageViews],
    ['Clickuri telefon', stats.phoneClicks],
    ['Clickuri WhatsApp', stats.whatsappClicks],
    ['Clickuri email', stats.emailClicks],
    ['Clickuri CTA', stats.ctaClicks],
    ['Formulare trimise', stats.contactSubmits],
    ['Recenzii trimise', stats.reviewSubmits],
    ['Timp mediu de engagement', formatDuration(stats.averageEngagementSeconds)],
  ];

  const statsRows = rows
    .map(([label, value]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:700;text-align:right">${value}</td></tr>`)
    .join('');

  const pageRows = stats.topPages.length
    ? stats.topPages.map(([path, views]) => `<tr><td style="padding:7px 12px;border-bottom:1px solid #eee">${path}</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right">${views}</td></tr>`).join('')
    : '<tr><td colspan="2" style="padding:10px 12px">Nu există date.</td></tr>';

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222;line-height:1.45"><div style="max-width:680px;margin:auto"><h1 style="margin-bottom:4px">Raport Rosini</h1><p style="color:#666">Statistici pentru ultimele 30 de zile</p><table style="border-collapse:collapse;width:100%;margin:20px 0">${statsRows}</table><h2>Pagini cele mai vizitate</h2><table style="border-collapse:collapse;width:100%"><tr><th style="text-align:left;padding:7px 12px;border-bottom:2px solid #222">Pagină</th><th style="text-align:right;padding:7px 12px;border-bottom:2px solid #222">Vizualizări</th></tr>${pageRows}</table><p style="margin-top:24px;color:#777;font-size:13px">Raport generat automat de site-ul Rosini.</p></div></body></html>`;
}

function buildCsv(events) {
  const header = 'timestamp,type,sessionId,path,referrer,durationSeconds';
  const rows = events.map((event) => [
    event.timestamp,
    event.type,
    event.sessionId,
    event.path,
    event.referrer,
    event.durationSeconds,
  ].map(csvValue).join(','));
  return [header, ...rows].join('\n');
}

export default async () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured; monthly report was not sent.');
    return new Response('RESEND_API_KEY missing', { status: 500 });
  }

  const stateStore = getStore({ name: STATE_STORE });
  const state = (await stateStore.get(STATE_KEY, { type: 'json' })) || {};
  const now = Date.now();

  if (state.lastSentAt && now - Date.parse(state.lastSentAt) < PERIOD_MS) {
    return new Response('Not due yet', { status: 200 });
  }

  const events = await loadEvents();
  const stats = buildStats(events);
  const csv = buildCsv(stats.recent);
  const from = process.env.REPORT_FROM_EMAIL || 'Rosini <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [REPORT_TO],
      subject: 'Rosini — raport statistici ultimele 30 de zile',
      html: renderHtml(stats),
      attachments: [{
        filename: 'rosini-analytics-30-zile.csv',
        content: Buffer.from(csv, 'utf8').toString('base64'),
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Resend error:', errorText);
    return new Response('Email delivery failed', { status: 502 });
  }

  await stateStore.setJSON(STATE_KEY, { lastSentAt: new Date(now).toISOString() });
  return new Response('Monthly report sent', { status: 200 });
};

export const config = { schedule: '@daily' };
