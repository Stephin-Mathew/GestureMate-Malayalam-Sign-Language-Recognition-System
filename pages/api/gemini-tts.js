/**
 * Cloud TTS API Route
 *
 * Uses Google Cloud Text-to-Speech with a service account JSON key.
 * Keeps the same response shape as the old Gemini TTS route so the
 * frontend (sign-recognition.js) requires zero changes.
 *
 * Response: { audio: { data: <base64 LINEAR16>, sampleRate: 24000, channels: 1 }, fromCache: bool }
 *
 * Features:
 * 1. In-memory LRU-style audio cache — same text = instant replay, zero extra API calls.
 * 2. Malayalam voice (ml-IN-Chirp3-HD-Achernar) via WaveNet/Standard.
 * 3. Returns LINEAR16 PCM encoded as base64; the frontend's createWavBlob() wraps it
 *    in a WAV header and plays it directly — no change needed on the frontend.
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import path from 'path';

// ─── Service-account client (singleton) ──────────────────────────────────────

let _client = null;

function getClient() {
  if (_client) return _client;

  const keyFile = path.join(process.cwd(), 'backend', 'gen-lang-client-0749893296-0e57b1d50841.json');
  _client = new TextToSpeechClient({ keyFilename: keyFile });
  return _client;
}

// ─── In-memory LRU audio cache ────────────────────────────────────────────────

const MAX_CACHE_SIZE = 50;
const audioCache = new Map();

function cacheGet(key) {
  if (!audioCache.has(key)) return null;
  const value = audioCache.get(key);
  audioCache.delete(key);
  audioCache.set(key, value); // move to end (MRU)
  return value;
}

function cacheSet(key, value) {
  if (audioCache.size >= MAX_CACHE_SIZE) {
    audioCache.delete(audioCache.keys().next().value); // evict oldest
  }
  audioCache.set(key, value);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  // ── 1. Cache hit → instant return ──────────────────────────────────────────
  const cacheKey = text;
  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log(`[cloud-tts] Cache HIT for "${text.slice(0, 40)}…"`);
    return res.status(200).json({ audio: cached, fromCache: true });
  }

  console.log(`[cloud-tts] Cache MISS — calling Cloud TTS for "${text.slice(0, 40)}…"`);

  try {
    const client = getClient();

    // Cloud TTS request — Malayalam Neural2 voice
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'ml-IN',
        name: 'ml-IN-Chirp3-HD-Achernar',   // High-quality Malayalam voice
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',    // Raw PCM — matches createWavBlob() in the frontend
        sampleRateHertz: 24000,
      },
    });

    // audioContent is a Buffer of raw PCM bytes
    const b64 = Buffer.from(response.audioContent).toString('base64');

    const audioPayload = {
      data: b64,
      sampleRate: 24000,
      channels: 1,
    };

    cacheSet(cacheKey, audioPayload);
    console.log(`[cloud-tts] Success. Cached audio for "${text.slice(0, 40)}…"`);

    return res.status(200).json({ audio: audioPayload, fromCache: false });

  } catch (err) {
    console.error('[cloud-tts] Error:', err);
    return res.status(500).json({ error: 'Failed to generate speech', detail: err.message });
  }
}
