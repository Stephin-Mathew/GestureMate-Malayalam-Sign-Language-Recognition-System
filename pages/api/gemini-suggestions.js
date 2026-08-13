/**
 * Gemini Word Suggestions API Route
 *
 * Uses Gemini API to predict common Malayalam words or phrase completions
 * based on the recognized character prefix or partial sentence.
 */

const MAX_CACHE_SIZE = 100;
const suggestionsCache = new Map();

function cacheGet(key) {
  if (!suggestionsCache.has(key)) return null;
  const val = suggestionsCache.get(key);
  suggestionsCache.delete(key);
  suggestionsCache.set(key, val);
  return val;
}

function cacheSet(key, val) {
  if (suggestionsCache.size >= MAX_CACHE_SIZE) {
    suggestionsCache.delete(suggestionsCache.keys().next().value);
  }
  suggestionsCache.set(key, val);
}

// Fallback suggestions for common Malayalam sign starting letters
const FALLBACK_SUGGESTIONS = {
  'ന': [
    { word: 'നമസ്കാരം', meaning: 'Greetings / Hello' },
    { word: 'നന്ദി', meaning: 'Thank you' },
    { word: 'നല്ലത്', meaning: 'Good / Well' },
    { word: 'നാളെ', meaning: 'Tomorrow' }
  ],
  'സു': [
    { word: 'സുപ്രഭാതം', meaning: 'Good morning' },
    { word: 'സുഖമാണോ', meaning: 'How are you?' },
    { word: 'സുഖം', meaning: 'Fine / Well' },
    { word: 'സുന്ദരം', meaning: 'Beautiful' }
  ],
  'അ': [
    { word: 'അമ്മ', meaning: 'Mother' },
    { word: 'അച്ഛൻ', meaning: 'Father' },
    { word: 'അതെ', meaning: 'Yes' },
    { word: 'അവിടെ', meaning: 'There' }
  ],
  'എ': [
    { word: 'എന്താണ്', meaning: 'What is it?' },
    { word: 'എവിടെ', meaning: 'Where?' },
    { word: 'എങ്ങനെ', meaning: 'How?' },
    { word: 'എനിക്ക്', meaning: 'To me / I have' }
  ],
  'വ': [
    { word: 'വരാം', meaning: 'Will come' },
    { word: 'വളരെ', meaning: 'Very much' },
    { word: 'വരു', meaning: 'Come' },
    { word: 'വഴി', meaning: 'Way / Path' }
  ]
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text = '', char = '' } = req.body || {};
  const queryText = (text || char || '').trim();

  if (!queryText) {
    return res.status(200).json({ suggestions: [] });
  }

  // Get last word or prefix if sentence has multiple words
  const words = queryText.split(/\s+/);
  const activePrefix = words[words.length - 1] || queryText;

  // 1. Cache hit
  const cached = cacheGet(activePrefix);
  if (cached) {
    return res.status(200).json({ suggestions: cached, fromCache: true });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback if no API key present
    const fallback = FALLBACK_SUGGESTIONS[activePrefix] || FALLBACK_SUGGESTIONS[activePrefix[0]] || [
      { word: `${activePrefix}ൽ`, meaning: `In ${activePrefix}` },
      { word: `${activePrefix}ുടെ`, meaning: `Of ${activePrefix}` },
      { word: `${activePrefix}മായി`, meaning: `With ${activePrefix}` }
    ];
    return res.status(200).json({ suggestions: fallback, fallback: true });
  }

  try {
    const prompt = `You are a Malayalam sign language predictive text assistant.
Given the current Malayalam text input/prefix: "${activePrefix}" (full context: "${queryText}"), suggest 4 to 6 common, natural Malayalam words or short phrase completions that start with or match this prefix.

Output ONLY a JSON array of objects with keys "word" (Malayalam string) and "meaning" (short English translation).
Example format:
[
  {"word": "നമസ്കാരം", "meaning": "Greetings / Hello"},
  {"word": "നന്ദി", "meaning": "Thank you"}
]`;

    // Try calling Gemini API with active working models: gemini-flash-latest, gemini-2.5-flash-lite, gemini-3.6-flash
    const modelsToTry = ['gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3.6-flash'];
    let response = null;
    let lastErrorStatus = null;

    for (const modelName of modelsToTry) {
      try {
        const apiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3
              }
            })
          }
        );
        if (apiRes.ok) {
          response = apiRes;
          console.log(`[gemini-suggestions] Successfully called model "${modelName}"`);
          break;
        } else {
          lastErrorStatus = apiRes.status;
          const errText = await apiRes.text().catch(() => '');
          console.warn(`[gemini-suggestions] Model "${modelName}" returned HTTP ${apiRes.status}: ${errText.slice(0, 150)}`);
        }
      } catch (err) {
        console.warn(`[gemini-suggestions] Failed to connect to model "${modelName}":`, err.message);
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Gemini API error: ${lastErrorStatus || 'Network failure'}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    let suggestions = [];
    try {
      suggestions = JSON.parse(rawText);
    } catch {
      console.error('[gemini-suggestions] Failed to parse JSON response from Gemini:', rawText);
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = FALLBACK_SUGGESTIONS[activePrefix] || FALLBACK_SUGGESTIONS[activePrefix[0]] || [];
    }

    cacheSet(activePrefix, suggestions);
    return res.status(200).json({ suggestions, fromCache: false });

  } catch (err) {
    console.error('[gemini-suggestions] Error fetching suggestions:', err);
    // Provide fallback suggestions on error
    const fallback = FALLBACK_SUGGESTIONS[activePrefix] || FALLBACK_SUGGESTIONS[activePrefix[0]] || [
      { word: `${activePrefix}ൽ`, meaning: `Completion` },
      { word: `${activePrefix}ും`, meaning: `Also` }
    ];
    return res.status(200).json({ suggestions: fallback, fallback: true, error: err.message });
  }
}
