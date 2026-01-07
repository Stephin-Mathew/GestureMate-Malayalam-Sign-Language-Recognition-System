export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing GEMINI_API_KEY on server' });
    return;
  }

  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const voiceName = typeof req.body?.voiceName === 'string' ? req.body.voiceName : 'Kore';

  if (!text.trim()) {
    res.status(400).json({ error: 'Missing text' });
    return;
  }

  try {
    const modelId = 'gemini-2.5-flash-preview-tts';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

    const generate = async (promptText) => {
      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
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

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, errorText };
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const parts = candidate?.content?.parts;
      const audioPart = Array.isArray(parts)
        ? parts.find((part) => part?.inlineData?.data)
        : undefined;

      return { ok: true, data, candidate, parts, audioPart };
    };

    const attempt1 = await generate(`Read the following Malayalam text: "${text}"`);
    if (!attempt1.ok) {
      res.status(attempt1.status).send(attempt1.errorText);
      return;
    }

    let audioData = attempt1.audioPart?.inlineData?.data;

    let attempt2 = null;
    if (!audioData) {
      attempt2 = await generate(text);
      if (attempt2.ok) {
        audioData = attempt2.audioPart?.inlineData?.data;
      } else {
        res.status(attempt2.status).send(attempt2.errorText);
        return;
      }
    }

    if (!audioData) {
      const summarize = (attempt) => {
        const parts = attempt?.parts;
        const candidate = attempt?.candidate;
        const partSummaries = Array.isArray(parts)
          ? parts.map((part) => ({
              hasInlineData: Boolean(part?.inlineData?.data),
              inlineDataMimeType: part?.inlineData?.mimeType ?? null,
              hasText: typeof part?.text === 'string' && part.text.length > 0,
            }))
          : null;

        return {
          hasCandidates: Array.isArray(attempt?.data?.candidates) && attempt.data.candidates.length > 0,
          finishReason: candidate?.finishReason ?? null,
          parts: partSummaries,
          candidateHasContent: Boolean(candidate?.content),
          candidateContentKeys: candidate?.content ? Object.keys(candidate.content) : null,
        };
      };

      res.status(502).json({
        error: 'No audio data returned from Gemini',
        debug: {
          attempt1: summarize(attempt1),
          attempt2: attempt2 ? summarize(attempt2) : null,
        },
      });
      return;
    }

    res.status(200).json({
      audio: {
        data: audioData,
        sampleRate: 24000,
        channels: 1,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate speech' });
  }
}
