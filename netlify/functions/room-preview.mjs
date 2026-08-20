const MAX_BODY = 6 * 1024 * 1024;

function dataUrlToBlob(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error('Invalid image');
  const bytes = Buffer.from(m[2], 'base64');
  return new Blob([bytes], { type: m[1] });
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: 'Funcția AI este instalată, dar OPENAI_API_KEY nu este configurată în Netlify.' }, { status: 503 });
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY) return Response.json({ error: 'Fotografia este prea mare.' }, { status: 413 });
  try {
    const body = await req.json();
    const roomImage = String(body.roomImage || '');
    const productImage = String(body.productImage || '');
    const productName = String(body.productName || 'produs Rosini').slice(0, 160);
    const form = new FormData();
    form.append('model', 'gpt-image-2');
    form.append('prompt', `Integrează realist produsul Rosini „${productName}” în fotografia camerei. Folosește fotografia produsului ca referință exactă pentru forma, proporțiile, tapițeria și designul produsului. Păstrează camera, arhitectura și obiectele existente cât mai neschimbate. Respectă perspectiva, scara, iluminarea și umbrele. Nu înlocui produsul cu alt model și nu modifica designul lui. Rezultatul trebuie să arate ca o fotografie realistă a aceleiași camere cu produsul amplasat natural.`);
    form.append('image[]', dataUrlToBlob(roomImage), 'camera.png');
    if (productImage && /^https?:\/\//i.test(productImage)) {
      const r = await fetch(productImage);
      if (r.ok) form.append('image[]', await r.blob(), 'product.png');
    }
    form.append('size', '1536x1024');
    form.append('quality', 'medium');
    const response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    const data = await response.json();
    if (!response.ok) { console.error('OpenAI room preview error', data); return Response.json({ error: 'Serviciul AI nu a putut genera previzualizarea. Încearcă din nou.' }, { status: 502 }); }
    const image = data?.data?.[0]?.b64_json;
    if (!image) return Response.json({ error: 'AI-ul nu a returnat o imagine.' }, { status: 502 });
    return Response.json({ image });
  } catch (error) {
    console.error('room-preview error', error);
    return Response.json({ error: 'A apărut o eroare la generarea previzualizării.' }, { status: 500 });
  }
};

export const config = { path: '/api/room-preview' };
