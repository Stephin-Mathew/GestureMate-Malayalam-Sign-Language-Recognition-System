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
  const [predictionType, setPredictionType] = useState('static');  // 'static' | 'dynamic'
  const [dynamicFrames, setDynamicFrames] = useState(0);           // 0-30
  const [dynamicLocked, setDynamicLocked] = useState(false);
  const [recognitionMode, setRecognitionMode] = useState('static'); // 'static' | 'dynamic'
  const [isConnected, setIsConnected] = useState(false);
  const [pendingChar, setPendingChar] = useState(null);             // dynamic mode: char waiting to commit

  // ── Fast conversation mode ────────────────────────────────────────────────
  const [fastMode, setFastMode] = useState(true);
  const fastCharBufferRef = useRef({ char: null, count: 0 });        // static mode: tracks stable-char streak
  const fastCooldownRef = useRef(null);                               // static mode: last char auto-appended (cooldown)
  const dynamicFastBufferRef = useRef({ char: null, count: 0 });     // dynamic mode: tracks stable pending_char streak
  const dynamicFastCooldownRef = useRef(null);                       // dynamic mode: last char auto-appended (cooldown)

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

  // Direct Flask URL — bypasses the Next.js /api/video-feed proxy for lower latency
  const videoFeedUrl = 'http://localhost:5000/video_feed';

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    // No artificial delay — render immediately
    setIsLoading(false);
  }, []);

  // ── No auth redirect — guests are allowed on this page ────────────────────

  // ── Flask status poll ──────────────────────────────────────────────────────
  useEffect(() => {
    // Allow polling for all users (including guests) so the camera feed works
    if (!isLoaded || isLoading) return;
    const poll = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const d = await res.json();
          const newChar = d.char || '—';
          const newConf = d.confidence || 0.0;
          setChar(newChar);
          setSentence(d.sentence || '');
          setConfidence(newConf);
          setPredictionType(d.prediction_type || 'static');
          setDynamicFrames(d.dynamic_frames ?? 0);
          setDynamicLocked(d.dynamic_locked ?? false);
          setRecognitionMode(d.recognition_mode || 'static');
          setPendingChar(d.pending_char ?? null);
          setIsConnected(true);

          // ── Fast Conversation auto-commit — static mode ───────────────────
          const currentMode = d.recognition_mode || 'static';
          const isControlChar = ['—', '✓', '␣', 'NEXT', 'SPACE', 'next', 'space'].includes(newChar);
          if (fastModeRef.current && currentMode === 'static' && !isControlChar && newChar && newConf > 0.55) {
            const buf = fastCharBufferRef.current;
            if (buf.char === newChar) {
              buf.count += 1;
            } else {
              buf.char = newChar;
              buf.count = 1;
            }
            // Require 3 consecutive identical readings (~600 ms) before committing
            if (buf.count === 3 && fastCooldownRef.current !== newChar) {
              fastCooldownRef.current = newChar;
              buf.count = 0; // reset so we don't keep appending
              // Append character directly to sentence and sync to Flask
              setSentence(prev => {
                const next = prev + newChar;
                syncToFlask(next);
                return next;
              });
              // Release cooldown after 1.5 s so the same letter can appear again
              setTimeout(() => { fastCooldownRef.current = null; }, 1500);
            }
          } else if (!fastModeRef.current || currentMode !== 'static') {
            // Reset static buffer when fast mode is off or in dynamic mode
            fastCharBufferRef.current = { char: null, count: 0 };
          }

          // ── Fast Conversation auto-commit — dynamic mode ──────────────────
          // When fast mode is ON in dynamic mode, auto-commit pending_char after
          // 3 stable consecutive polls (~600 ms), without waiting for the next gesture.
          if (fastModeRef.current && currentMode === 'dynamic') {
            const pending = d.pending_char ?? null;
            if (pending) {
              const dbuf = dynamicFastBufferRef.current;
              if (dbuf.char === pending) {
                dbuf.count += 1;
              } else {
                dbuf.char = pending;
                dbuf.count = 1;
              }
              // Commit after 3 stable readings (~600 ms)
              if (dbuf.count === 3 && dynamicFastCooldownRef.current !== pending) {
                dynamicFastCooldownRef.current = pending;
                dbuf.count = 0;
                setSentence(prev => {
                  const next = prev + pending;
                  syncToFlask(next);
                  return next;
                });
                // Release cooldown after 1.5 s so the same letter can repeat
                setTimeout(() => { dynamicFastCooldownRef.current = null; }, 1500);
              }
            } else {
              // No pending char — reset streak
              dynamicFastBufferRef.current = { char: null, count: 0 };
            }
          } else if (!fastModeRef.current || currentMode !== 'dynamic') {
            // Reset dynamic buffer when fast mode is off or not in dynamic mode
            dynamicFastBufferRef.current = { char: null, count: 0 };
          }
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
  }, [isLoaded, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a ref in sync with fastMode so the polling closure can read it without stale captures
  const fastModeRef = useRef(fastMode);
  useEffect(() => { fastModeRef.current = fastMode; }, [fastMode]);

  // ── Auto-start mic once the page is ready (signed-in users only) ─────────
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
    setPredictionType('static'); setDynamicFrames(0); setDynamicLocked(false);
    try { await fetch('/api/reset', { method: 'POST' }); } catch { }
  };

  const setMode = async (mode) => {
    setRecognitionMode(mode);
    setChar('—'); setConfidence(0.0); setDynamicFrames(0); setDynamicLocked(false); setPendingChar(null);
    try {
      await fetch('/api/set-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
    } catch { }
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
  // Guests are allowed — only block while Clerk is still initialising
  if (!isLoaded) return <Loading />;
  if (isLoading) return <Loading />;

  // ══════════════════════════════════════════════════════════════════════════
  // UI
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Head>
        <title>Sign Recognition – GestureMate</title>
        {/* Pre-open TCP connection to Flask so the feed loads faster */}
        <link rel="preconnect" href="http://localhost:5000" />
      </Head>
      <Navigation />

      <main className="w-full max-w-[1440px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Camera feed ──────────────────────────────────────────── */}
          <div style={{ gridColumn: 'span 2', background: 'var(--card-bg)', borderRadius: '0.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '1rem', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--foreground)', fontFamily: 'var(--font-inter)' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* ── Sign output ─────────────────────────────────────── */}
              <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '1.25rem', border: '1px solid var(--card-border)' }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-inter)' }}>Sign Recognition</p>

              {/* ── Fast Conversation toggle ─────────────────────────── */}
              <button
                onClick={() => {
                  setFastMode(prev => {
                    const next = !prev;
                    if (!next) {
                      fastCharBufferRef.current = { char: null, count: 0 };
                      fastCooldownRef.current = null;
                    }
                    return next;
                  });
                }}
                title={fastMode ? 'Fast Conversation is ON — click to turn off' : 'Fast Conversation is OFF — click to turn on'}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl mb-4 border text-xs font-semibold transition-all duration-200 ${fastMode
                  ? 'bg-violet-600 border-violet-700 text-white shadow-md'
                  : 'bg-gray-100 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                <span className="flex items-center gap-1.5">
                  <span style={{ fontSize: '1rem' }}>⚡</span>
                  Fast Conversation
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '2rem',
                    height: '1rem',
                    borderRadius: '9999px',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    backgroundColor: fastMode ? '#c4b5fd' : '#d1d5db',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '0.125rem',
                      left: fastMode ? '1.0rem' : '0.125rem',
                      width: '0.75rem',
                      height: '0.75rem',
                      borderRadius: '9999px',
                      backgroundColor: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s',
                    }}
                  />
                </span>
              </button>

              {/* ── Mode toggle ─────────────────────────────────────── */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', padding: '4px', background: 'var(--subtle-bg)', borderRadius: '0.75rem' }}>
                {['static', 'dynamic'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${recognitionMode === m
                      ? m === 'dynamic'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-brand-orange text-white shadow'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    {m === 'static' ? '🤚 Static' : '👋 Dynamic'}
                  </button>
                ))}
              </div>

              {/* Mode badge */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${predictionType === 'dynamic'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-orange-100 text-orange-700'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: predictionType === 'dynamic' ? '#3b82f6' : '#f97316' }} />
                  {predictionType === 'dynamic' ? 'Dynamic Gesture' : 'Static Gesture'}
                </span>
                {dynamicLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    <span>✓</span> Locked
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginBottom: '0.25rem', fontFamily: 'var(--font-inter)' }}>Detected</p>
                  <div className="text-5xl font-bold text-brand-orange leading-none">{char}</div>
                </div>
                <div style={{ flex: 1 }}>
                  {/* Confidence */}
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginBottom: '0.25rem', fontFamily: 'var(--font-inter)' }}>Confidence</p>
                    <div style={{ width: '100%', background: 'var(--subtle-bg)', borderRadius: '9999px', height: '8px' }}>
                      <div
                        className="bg-brand-orange h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(confidence * 100, 100)}%` }}
                      />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem', fontWeight: 500 }}>{(confidence * 100).toFixed(1)}%</p>
                  </div>
                  {recognitionMode === 'dynamic' ? (
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginBottom: '0.25rem', fontFamily: 'var(--font-inter)' }}>
                        Frames buffered<span className="ml-1 font-semibold text-blue-600">{dynamicFrames}/30</span>
                      </p>
                      <div style={{ width: '100%', background: 'var(--subtle-bg)', borderRadius: '9999px', height: '8px' }}>
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-150"
                          style={{ width: `${(dynamicFrames / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Pending char — dynamic mode only */}
              {recognitionMode === 'dynamic' && (
                <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-xl border transition-all duration-300"
                  style={{
                    background: pendingChar ? 'rgba(59,130,246,0.07)' : 'rgba(243,244,246,0.6)',
                    borderColor: pendingChar ? '#93c5fd' : '#e5e7eb',
                  }}
                >
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'var(--font-inter)' }}>Pending</p>
                    <div
                      className="text-3xl font-bold leading-none transition-all duration-300"
                      style={{ color: pendingChar ? '#3b82f6' : '#d1d5db' }}
                    >
                      {pendingChar || '—'}
                    </div>
                  </div>
                  <div className="flex-1">
                    {pendingChar ? (
                      <p className="text-xs text-blue-500 italic" style={{ fontFamily: 'var(--font-inter)' }}>
                        {fastMode
                          ? <span className="text-violet-500 font-semibold not-italic">⚡ Fast mode — auto-committing</span>
                          : <><span className="font-semibold not-italic">&ldquo;next&rdquo;</span> gesture to add to sentence</>}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic" style={{ fontFamily: 'var(--font-inter)' }}>
                        {fastMode ? <span className="text-violet-400">⚡ Fast mode active</span> : 'No character pending'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Sentence box */}
              <div
                style={{ fontSize: '1.25rem', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', minHeight: '72px', padding: '0.75rem', color: 'var(--foreground)', marginBottom: '0.75rem', wordBreak: 'break-words', fontFamily: 'var(--font-inter)' }}
              >
                {sentence || <span style={{ color: 'var(--muted-text-3)' }}>Sentence will appear here…</span>}
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

              {/* ── TTS — locked for guests ──────────────────────────────── */}
              {isSignedIn ? (
                <button
                  onClick={() => speakText(sentence)}
                  disabled={!sentence.trim()}
                  className={`w-full text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${isSpeaking ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  style={{ fontFamily: 'var(--font-glory)' }}
                >
                  {isSpeaking ? '■ Stop Audio' : '▶ Convert Text to Audio'}
                </button>
              ) : (
                <div
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed select-none"
                  style={{ fontFamily: 'var(--font-glory)' }}
                  title="Log in to use Text-to-Speech"
                >
                  <span style={{ fontSize: '1rem' }}>🔒</span>
                  <span>Text-to-Speech — <a href="/login" className="text-brand-orange font-semibold underline underline-offset-2 hover:text-orange-600">Log in</a> to unlock</span>
                </div>
              )}
            </div>

            {/* ── Divider ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-text-2)', fontWeight: 500, padding: '0 0.25rem', fontFamily: 'var(--font-inter)' }}>ALSO</span>
              <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
            </div>

            {/* ── Voice → Text — locked for guests ─────────────────── */}
            {isSignedIn ? (
              <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '1.25rem', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontFamily: 'var(--font-inter)' }}>Voice → Text</p>

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
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)', fontFamily: 'var(--font-inter)' }}>
                      {isRecording
                        ? '● Listening…'
                        : isSpeaking
                          ? '⏸ Paused (TTS playing)'
                          : '⏸ Paused — click to resume'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-text-2)', fontFamily: 'var(--font-inter)' }}>Malayalam (ml-IN)</p>
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
                  <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.5rem', padding: '0.5rem', marginBottom: '0.5rem' }}>
                    <p className="text-sm text-blue-600 italic" style={{ fontFamily: 'var(--font-inter)' }}>{interimTranscript}</p>
                  </div>
                )}

                {/* Final transcript */}
                <div
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', minHeight: '72px', padding: '0.75rem', color: 'var(--foreground)', fontSize: '1rem', wordBreak: 'break-words', marginBottom: '0.75rem', fontFamily: 'var(--font-inter)' }}
                >
                  {voiceTranscript || <span style={{ color: 'var(--muted-text-3)' }}>Spoken text appears here automatically…</span>}
                </div>


              </div>
            ) : (
              /* ── Guest lock card for Voice → Text ─────────────────── */
              <div style={{ background: 'var(--card-bg)', borderRadius: '0.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '2px dashed var(--card-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '40px 24px', textAlign: 'center' }}>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-md"
                  style={{ background: 'linear-gradient(135deg,#fde68a,#fbbf24)' }}
                >
                  🔒
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '1rem', marginBottom: '0.25rem', fontFamily: 'var(--font-inter)' }}>
                    Voice → Text &amp; TTS is locked
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', maxWidth: '200px', margin: '0 auto', fontFamily: 'var(--font-inter)' }}>
                    Log in to use Malayalam voice recognition and text-to-speech features.
                  </p>
                </div>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 bg-brand-orange text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-11v2H9l3 3 3-3h-2V9h-2z"/></svg>
                  Log in to unlock
                </a>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Toast */}
      {showToast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '12px 24px', borderRadius: '0.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 50, color: '#fff', fontSize: '0.875rem', fontWeight: 500, background: toastIsError ? '#ef4444' : '#1e1e2e', border: toastIsError ? 'none' : '1px solid #3a3a4a' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
