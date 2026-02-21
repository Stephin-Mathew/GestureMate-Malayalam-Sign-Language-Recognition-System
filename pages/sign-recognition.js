import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import Head from 'next/head';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

export default function SignRecognition() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  // ── Page state ─────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);

  // ── Sign recognition state ─────────────────────────────────────────────────
  const [char, setChar] = useState('—');
  const [sentence, setSentence] = useState('');
  const [confidence, setConfidence] = useState(0.0);
  const [isConnected, setIsConnected] = useState(false);

  // ── Voice state ────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  // true = user deliberately paused the mic; auto-resume after TTS should skip
  const micPausedRef = useRef(false);
  const recognitionRef = useRef(null);

  // ── TTS state ──────────────────────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef(null);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);
  const toastTimerRef = useRef(null);

  const videoFeedUrl = '/api/video-feed';

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || isLoading) return;
    if (!isSignedIn) router.push('/login');
  }, [isLoaded, isSignedIn, isLoading, router]);

  // ── Flask status poll ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn || isLoading) return;
    const poll = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const d = await res.json();
          setChar(d.char || '—');
          setSentence(d.sentence || '');
          setConfidence(d.confidence || 0.0);
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch {
        setIsConnected(false);
      }
    };
    const id = setInterval(poll, 200);
    poll();
    return () => clearInterval(id);
  }, [isLoaded, isSignedIn, isLoading]);

  // ── Auto-start mic once the page is ready ────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn || isLoading) return;
    micPausedRef.current = false;
    startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, isLoading]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => () => { stopAudio(); stopRecording(false); }, []); // eslint-disable-line

  // ── Toast helper ───────────────────────────────────────────────────────────
  const displayToast = useCallback((msg, isError = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 3000);
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // SIGN MODE HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const handleReset = async () => {
    stopAudio();
    setSentence(''); setChar('—'); setConfidence(0.0);
    try { await fetch('/api/reset', { method: 'POST' }); } catch { }
  };

  const handleBackspace = async () => {
    stopAudio();
    setSentence(prev => {
      const next = [...prev].slice(0, -1).join('');
      syncToFlask(next);
      return next;
    });
    setChar('—'); setConfidence(0.0);
  };

  const syncToFlask = async (s) => {
    try {
      const r = await fetch('/api/reset', { method: 'POST' });
      if (r.ok && s.length > 0) {
        await fetch('/api/patch-sentence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sentence: s }),
        }).catch(() => { });
      }
    } catch { }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TTS
  // ══════════════════════════════════════════════════════════════════════════

  const createWavBlob = (b64, sr = 24000, ch = 1) => {
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    const h = new ArrayBuffer(44), v = new DataView(h);
    const ba = ch * 2;
    v.setUint32(0, 0x46464952, true); v.setUint32(4, 36 + raw.length, true);
    v.setUint32(8, 0x45564157, true); v.setUint32(12, 0x20746d66, true);
    v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, ch, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr * ba, true); v.setUint16(32, ba, true);
    v.setUint16(34, 16, true); v.setUint32(36, 0x61746164, true);
    v.setUint32(40, raw.length, true);
    return new Blob([v, arr], { type: 'audio/wav' });
  };

  // text: the string to speak (sign sentence or voice transcript)
  const speakText = async (text) => {
    if (!text.trim()) { displayToast('Nothing to speak!', true); return; }
    if (isSpeaking) { stopAudio(); return; }

    // Pause the mic while TTS plays (don't touch micPausedRef — this is auto, not manual)
    stopRecording(false);

    setIsSpeaking(true);
    displayToast('Converting text to speech…');
    try {
      const res = await fetch('/api/gemini-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: 'Kore' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        if (res.status === 429) {
          const s = err?.retryAfterMs ? Math.ceil(err.retryAfterMs / 1000) : 5;
          throw new Error(`Rate limit — wait ~${s}s and try again.`);
        }
        throw new Error(err?.error || `Error ${res.status}`);
      }
      const data = await res.json();
      const b64 = data?.audio?.data;
      if (!b64) throw new Error('No audio in response');
      const blob = createWavBlob(b64, data.audio.sampleRate ?? 24000, data.audio.channels ?? 1);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      stopAudio();
      currentAudioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        displayToast('Playback complete');
        // Wait 1.5s after audio ends before restarting mic, so there's no
        // accidental pickup of the audio tail or room echo.
        if (!micPausedRef.current) setTimeout(() => startRecording(), 1500);
      };
      await audio.play();
      displayToast(data.fromCache ? 'Playing cached audio ⚡' : 'Playing audio…');
    } catch (e) {
      console.error(e);
      displayToast(e.message, true);
      setIsSpeaking(false);
      // Resume mic on error after a short gap, unless manually paused
      if (!micPausedRef.current) setTimeout(() => startRecording(), 1500);
    }
  };

  const stopAudio = () => {
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); currentAudioRef.current.currentTime = 0; } finally {
        if (currentAudioRef.current?.src?.startsWith('blob:')) URL.revokeObjectURL(currentAudioRef.current.src);
        currentAudioRef.current = null;
      }
    }
    setIsSpeaking(false);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VOICE RECOGNITION
  // ══════════════════════════════════════════════════════════════════════════

  const initSR = () => {
    if (!('webkitSpeechRecognition' in window)) {
      displayToast('Voice recognition requires Chrome or Edge.', true);
      return false;
    }
    const SR = window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'ml-IN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => { setIsRecording(true); displayToast('Listening for Malayalam speech…'); };
    rec.onend = () => { setIsRecording(false); setInterimTranscript(''); };
    rec.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (final) setVoiceTranscript(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + final);
      setInterimTranscript(interim);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech') return;
      displayToast(e.error === 'not-allowed' ? 'Mic permission denied.' : `Voice error: ${e.error}`, true);
      stopRecording();
    };
    recognitionRef.current = rec;
    return true;
  };

  const startRecording = () => {
    if (!recognitionRef.current && !initSR()) return;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // If already started, ignore the error
      if (e?.message?.includes('already started')) return;
      displayToast('Failed to start mic.', true);
    }
  };

  // manual=true means the user clicked Pause, so auto-resume should be suppressed
  const stopRecording = (manual = true) => {
    if (manual) micPausedRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording(true); // manual pause
    } else {
      micPausedRef.current = false; // user is manually resuming
      startRecording();
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────
  if (!isLoaded || !isSignedIn) return <Loading />;
  if (isLoading) return <Loading />;

  // ══════════════════════════════════════════════════════════════════════════
  // UI
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-white">
      <Head><title>Sign Recognition – GestureMate</title></Head>
      <Navigation />

      <main className="w-full max-w-[1440px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Camera feed ──────────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-brand-dark" style={{ fontFamily: 'var(--font-inter)' }}>
                Live Camera Feed
              </h2>
              <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '● Connected' : '● Disconnected'}
              </span>
            </div>
            <div className="rounded-xl overflow-hidden border-2 border-brand-orange bg-gray-50">
              <img
                src={videoFeedUrl}
                alt="Video Feed"
                className="w-full h-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const p = e.target.parentElement;
                  if (p && !p.querySelector('.feed-error')) {
                    const d = document.createElement('div');
                    d.className = 'feed-error';
                    d.style.cssText = 'text-align:center;color:#94a3b8;padding:64px 24px;';
                    d.innerHTML = '<p style="font-size:1.1rem;margin-bottom:8px">Unable to connect to video feed</p><p style="font-size:.85rem">Start Flask backend on port 5000</p>';
                    p.appendChild(d);
                  }
                }}
              />
            </div>
          </div>

          {/* ── RIGHT: Controls ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* ── Sign output ─────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-inter)' }}>Sign Recognition</p>

              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'var(--font-inter)' }}>Detected</p>
                  <div className="text-5xl font-bold text-brand-orange leading-none">{char}</div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'var(--font-inter)' }}>Confidence</p>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-brand-orange h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(confidence * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{(confidence * 100).toFixed(1)}%</p>
                </div>
              </div>

              {/* Sentence box */}
              <div
                className="text-xl bg-gray-50 border border-gray-200 rounded-xl min-h-[72px] p-3 text-brand-dark mb-3 break-words"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {sentence || <span className="text-gray-300">Sentence will appear here…</span>}
              </div>

              {/* Sign action buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={handleReset}
                  className="bg-brand-orange text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors"
                  style={{ fontFamily: 'var(--font-glory)' }}>
                  Reset
                </button>
                <button onClick={handleBackspace} disabled={!sentence}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  style={{ fontFamily: 'var(--font-glory)' }}>
                  ⌫ Backspace
                </button>
              </div>

              <button
                onClick={() => speakText(sentence)}
                disabled={!sentence.trim()}
                className={`w-full text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${isSpeaking ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                style={{ fontFamily: 'var(--font-glory)' }}
              >
                {isSpeaking ? '■ Stop Audio' : '▶ Speak (TTS)'}
              </button>
            </div>

            {/* ── Divider ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium px-1" style={{ fontFamily: 'var(--font-inter)' }}>ALSO</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ── Voice input ─────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-inter)' }}>Voice → Text</p>

              {/* Mic button + status */}
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={toggleRecording}
                  title={isRecording ? 'Pause mic' : 'Resume mic'}
                  className={`w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white transition-all duration-200 shadow-md ${isRecording
                    ? 'bg-emerald-500 animate-pulse shadow-emerald-200'
                    : isSpeaking
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gray-500 hover:bg-gray-600'
                    }`}
                >
                  {isRecording ? (
                    /* pause icon — two bars */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    /* mic icon */
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2a1 1 0 1 0-2 0v2a9 9 0 0 0 8 8.94V22H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-1.06A9 9 0 0 0 21 12v-2a1 1 0 1 0-2 0z" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-dark" style={{ fontFamily: 'var(--font-inter)' }}>
                    {isRecording
                      ? '● Listening…'
                      : isSpeaking
                        ? '⏸ Paused (TTS playing)'
                        : '⏸ Paused — click to resume'}
                  </p>
                  <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-inter)' }}>Malayalam (ml-IN)</p>
                </div>
                {voiceTranscript && (
                  <button
                    onClick={() => { setVoiceTranscript(''); setInterimTranscript(''); }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
                    title="Clear transcript">
                    ✕ Clear
                  </button>
                )}
              </div>

              {/* Interim text */}
              {interimTranscript && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                  <p className="text-sm text-blue-600 italic" style={{ fontFamily: 'var(--font-inter)' }}>{interimTranscript}</p>
                </div>
              )}

              {/* Final transcript */}
              <div
                className="bg-gray-50 border border-gray-200 rounded-xl min-h-[72px] p-3 text-brand-dark text-base break-words mb-3"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {voiceTranscript || <span className="text-gray-300">Spoken text appears here automatically…</span>}
              </div>

              {/* Speak voice transcript */}
              <button
                onClick={() => speakText(voiceTranscript)}
                disabled={!voiceTranscript.trim()}
                className={`w-full text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${isSpeaking ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                style={{ fontFamily: 'var(--font-glory)' }}
              >
                {isSpeaking ? '■ Stop Audio' : '▶ Speak Voice Text (TTS)'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Toast */}
      {showToast && (
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg z-50 text-white text-sm font-medium transition-all duration-300 ${toastIsError ? 'bg-red-500' : 'bg-gray-800'
          }`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
