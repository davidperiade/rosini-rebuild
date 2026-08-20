const MAX_BODY = 6 * 1024 * 1024;

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const origin = req.headers.get('origin');
  if (origin && !origin.endsWith('.netlify.app') && origin !== 'https://rosini-site.netlify.app') {
    return Response.json({ error: 'Origine neautorizată.' }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Funcția AI este instalată, dar cheia OPENAI_API_KEY nu este configurată încă în Netlify.' }, { status: 503 });
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY) return Response.json({ error: 'Fotografia este prea mare. Alege o imagine sub 5 MB.' }, { status: 413 });

  try {
    const body = await req.json();
    const roomImage = String(body.roomImage || '');
    const productImage = String(body.productImage || '');
    const productName = String(body.productName || 'produs Rosini').slice(0, 160);

    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(roomImage)) {
      return Response.json({ error: 'Fotografia camerei nu are un format acceptat.' }, { status: 400 });
    }
    if (roomImage.length > 5.5 * 1024 * 1024) return Response.json({ error: 'Fotografia este prea mare. Alege o imagine sub 4 MB.' }, { status: 413 });

    const content = [
      {
        type: 'input_text',
        text: `Editează fotografia camerei pentru un preview realist de amenajare. Integrează produsul de mobilier Rosini numit „${productName}” în cameră, folosind fotografia produsului ca referință. Păstrează arhitectura, pereții, ferestrele, podeaua și obiectele existente cât mai neschimbate. Așază produsul într-o poziție plauzibilă, respectând perspectiva, scara, iluminarea și umbrele. Nu inventa un alt model de mobilier și nu schimba designul produsului. Rezultatul trebuie să arate ca o fotografie realistă a aceleiași camere după amplasarea produsului.`
      },
      { type: 'input_image', image_url: roomImage, detail: 'high' }
    ];

    if (productImage && /^https?:\/\//i.test(productImage)) {
      content.push({ type: 'input_image', image_url: productImage, detail: 'high' });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.6',
        input: [{ role: 'user', content }],
        tools: [{ type: 'image_generation', action: 'edit' }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI room preview error', data);
      return Response.json({ error: 'Serviciul AI nu a putut genera previzualizarea. Încearcă din nou.' }, { status: 502 });
    }

    const image = (data.output || []).find(item => item.type === 'image_generation_call')?.result;
    if (!image) return Response.json({ error: 'AI-ul nu a returnat o imagine.' }, { status: 502 });

    return Response.json({ image });
  } catch (error) {
    console.error('room-preview error', error);
    return Response.json({ error: 'A apărut o eroare la generarea previzualizării.' }, { status: 500 });
  }
};

export const config = { path: '/api/room-preview' };
