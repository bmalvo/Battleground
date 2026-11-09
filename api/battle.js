// api/battle.js — Vercel serverless function
// Free stack: Gemini 1.5 Flash (verdict text) + Pollinations (character art)
// Rate limit: 5 battles per minute per IP (in-memory; resets on cold start)

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;      // per IP per minute
const requestTimes = new Map();

function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function prune(ip) {
  const now = Date.now();
  const times = (requestTimes.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  requestTimes.set(ip, times);
  return times;
}

function isRateLimited(ip) {
  return prune(ip).length >= MAX_REQUESTS;
}

function recordRequest(ip) {
  const times = requestTimes.get(ip) || [];
  times.push(Date.now());
  requestTimes.set(ip, times);
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

export default async function handler(req, res) {
  // Simple CORS (helpful for local development)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  // ---- Rate limit ----
  const ip = getIp(req);
  if (isRateLimited(ip)) {
    res.setHeader('Retry-After', '60');
    return sendJson(res, 429, {
      error: 'Too many battles. Wait a minute and try again.'
    });
  }

  // ---- Parse body ----
  let body;
  try {
    body = await parseBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }

  const fighter1 = String(body.fighter1 || '').trim();
  const fighter2 = String(body.fighter2 || '').trim();
  if (!fighter1 || !fighter2) {
    return sendJson(res, 400, { error: 'Both fighters are required' });
  }

  // ---- Gemini API key ----
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, { error: 'Server missing GEMINI_API_KEY' });
  }

  recordRequest(ip);

  // ---- Call Gemini ----
  const prompt = `Who would win in a fight between ${fighter1} and ${fighter2}? Write a short, fun, dramatic verdict in 2-3 short paragraphs. Declare a clear winner. Keep it under 200 words.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 500 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return sendJson(res, geminiRes.status, { error: 'Gemini API error', details: errText });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No verdict returned.';

    return sendJson(res, 200, { verdict: text });
  } catch (err) {
    return sendJson(res, 500, { error: 'Failed to get verdict', details: err.message });
  }
}