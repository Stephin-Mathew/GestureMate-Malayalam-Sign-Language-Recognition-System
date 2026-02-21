/**
 * Gemini TTS API Route
 *
 * Key improvements over the original:
 * 1. In-memory LRU-style audio cache (MAX_CACHE_SIZE entries) — same text = instant
 *    replay with zero extra API calls, which is the primary fix for the rate-limit issue.
 * 2. Detects finishReason:"OTHER" (Gemini's silent rate-limit / quota signal) and
 *    returns a clear 429 with a human-readable message instead of a confusing 502.
 * 3. Single retry with a short exponential backoff (1 s) before giving up — catches
 *    transient blips without hammering the quota further.
 * 4. Rate-limit headers (x-ratelimit-*, Retry-After) are forwarded to the client when
 *    present so the frontend can surface accurate wait times in the future.
 */

// ─── In-memory audio cache ────────────────────────────────────────────────────
// Keyed by "<voiceName>|<text>" so different voices stay separate.
// Using a plain Map as a simple FIFO LRU — evict the oldest entry when full.
const MAX_CACHE_SIZE = 50;
const audioCache = new Map();

function getCacheKey(text, voiceName) {
  return `${voiceName}|${text.trim()}`;
}

function cacheGet(key) {
  if (!audioCache.has(key)) return null;
  // Move to end (most-recently-used)
  const value = audioCache.get(key);
  audioCache.delete(key);
  audioCache.set(key, value);
  return value;
}

function cacheSet(key, value) {
  if (audioCache.size >= MAX_CACHE_SIZE) {
    // Evict the oldest (first) entry
    audioCache.delete(audioCache.keys().next().value);
  }
  audioCache.set(key, value);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sleep for `ms` milliseconds */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pull rate-limit / retry headers from a fetch Response (if any) */
function extractRateLimitInfo(response) {
  return {
    retryAfter: response.headers.get('Retry-After'),
    limitRequests: response.headers.get('x-ratelimit-limit-requests'),
    remainingRequests: response.headers.get('x-ratelimit-remaining-requests'),
    limitTokens: response.headers.get('x-ratelimit-limit-tokens'),
    remainingTokens: response.headers.get('x-ratelimit-remaining-tokens'),
  };
}

// ─── Core TTS call ────────────────────────────────────────────────────────────

async function callGeminiTTS(promptText, voiceName, apiKey) {
  const modelId = 'gemini-2.5-flash-preview-tts';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const rateLimitInfo = extractRateLimitInfo(response);

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, status: response.status, errorText, rateLimitInfo };
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason ?? null;
  const parts = candidate?.content?.parts;
  const audioPart = Array.isArray(parts)
    ? parts.find((p) => p?.inlineData?.data)
    : undefined;

  return { ok: true, data, candidate, finishReason, parts, audioPart, rateLimitInfo };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY on server' });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const voiceName = typeof req.body?.voiceName === 'string' ? req.body.voiceName : 'Kore';

  if (!text.trim()) {
    return res.status(400).json({ error: 'Missing text' });
  }

  // ── 1. Cache hit → return immediately, no API call ──────────────────────────
  const cacheKey = getCacheKey(text, voiceName);
  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log(`[gemini-tts] Cache HIT for "${text.slice(0, 40)}…"`);
    return res.status(200).json({ audio: cached, fromCache: true });
  }

  console.log(`[gemini-tts] Cache MISS — calling Gemini TTS for "${text.slice(0, 40)}…"`);

  try {
    // ── 2. First attempt: preferred Malayalam prompt ─────────────────────────
    let result = await callGeminiTTS(
      `Read the following Malayalam text clearly: "${text}"`,
      voiceName,
      apiKey
    );

    // ── 3. If HTTP error, forward it ─────────────────────────────────────────
    if (!result.ok) {
      console.error(`[gemini-tts] HTTP ${result.status} from Gemini:`, result.errorText);
      return res.status(result.status).send(result.errorText);
    }

    // ── 4. Detect silent rate-limit (finishReason: "OTHER", no content) ───────
    //    Retry once with a 1-second pause and a simpler prompt before giving up.
    if (!result.audioPart && result.finishReason === 'OTHER') {
      console.warn('[gemini-tts] finishReason=OTHER (likely rate-limited). Retrying in 1 s…');
      await sleep(1000);

      result = await callGeminiTTS(text, voiceName, apiKey);

      if (!result.ok) {
        return res.status(result.status).send(result.errorText);
      }

      // Still rate-limited after retry → return a clear 429
      if (!result.audioPart && result.finishReason === 'OTHER') {
        console.error('[gemini-tts] Still rate-limited after retry.');
        return res.status(429).json({
          error:
            'Gemini TTS rate limit reached. Please wait a few seconds and try again.',
          retryAfterMs: 5000,
          rateLimitInfo: result.rateLimitInfo,
        });
      }
    }

    // ── 5. Try plain text prompt as a second variation (different phrasing) ───
    if (!result.audioPart) {
      console.warn('[gemini-tts] No audio on attempt 1, trying plain text prompt…');
      await sleep(500);
      result = await callGeminiTTS(text, voiceName, apiKey);

      if (!result.ok) {
        return res.status(result.status).send(result.errorText);
      }
    }

    // ── 6. Both attempts failed without a clear reason ────────────────────────
    if (!result.audioPart) {
      return res.status(502).json({
        error: 'Gemini TTS returned no audio. The model may be temporarily unavailable.',
        finishReason: result.finishReason,
        rateLimitInfo: result.rateLimitInfo,
      });
    }

    // ── 7. Success → cache and return ─────────────────────────────────────────
    const audioPayload = {
      data: result.audioPart.inlineData.data,
      sampleRate: 24000,
      channels: 1,
    };

    cacheSet(cacheKey, audioPayload);
    console.log(`[gemini-tts] Success. Cached audio for "${text.slice(0, 40)}…"`);

    return res.status(200).json({ audio: audioPayload, fromCache: false });

  } catch (err) {
    console.error('[gemini-tts] Unexpected error:', err);
    return res.status(500).json({ error: 'Failed to generate speech', detail: err.message });
  }
}
