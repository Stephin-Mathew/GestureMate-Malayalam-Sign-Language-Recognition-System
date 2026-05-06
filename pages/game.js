import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import Head from 'next/head';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

// ─────────────────────────────────────────────────────────────────────────────
// MALAYALAM CHARACTER → VIDEO MAPPING (mirrors AlphabetTutorial.js)
// ─────────────────────────────────────────────────────────────────────────────
const ALPHABETS = [
  { id: 'sign_01', letter: '\u0D05' },
  { id: 'sign_02', letter: '\u0D06' },
  { id: 'sign_03', letter: '\u0D07' },
  { id: 'sign_04', letter: '\u0D08' },
  { id: 'sign_05', letter: '\u0D09' },
  { id: 'sign_06', letter: '\u0D0A' },
  { id: 'sign_07', letter: '\u0D0B' },
  { id: 'sign_08', letter: '\u0D0E' },
  { id: 'sign_09', letter: '\u0D0F' },
  { id: 'sign_10', letter: '\u0D10' },
  { id: 'sign_11', letter: '\u0D12' },
  { id: 'sign_12', letter: '\u0D13' },
  { id: 'sign_13', letter: '\u0D14' },
  { id: 'sign_14', letter: '\u0D05\u0D66' },
  { id: 'sign_15', letter: '\u0D05\u0D03' },
  { id: 'sign_16', letter: '\u0D15' },
  { id: 'sign_17', letter: '\u0D16' },
  { id: 'sign_18', letter: '\u0D17' },
  { id: 'sign_19', letter: '\u0D18' },
  { id: 'sign_20', letter: '\u0D19' },
  { id: 'sign_21', letter: '\u0D1A' },
  { id: 'sign_22', letter: '\u0D1B' },
  { id: 'sign_23', letter: '\u0D1C' },
  { id: 'sign_24', letter: '\u0D1D' },
  { id: 'sign_25', letter: '\u0D1E' },
  { id: 'sign_26', letter: '\u0D1F' },
  { id: 'sign_27', letter: '\u0D20' },
  { id: 'sign_28', letter: '\u0D21' },
  { id: 'sign_29', letter: '\u0D22' },
  { id: 'sign_30', letter: '\u0D23' },
  { id: 'sign_31', letter: '\u0D24' },
  { id: 'sign_32', letter: '\u0D25' },
  { id: 'sign_33', letter: '\u0D26' },
  { id: 'sign_34', letter: '\u0D27' },
  { id: 'sign_35', letter: '\u0D28' },
  { id: 'sign_36', letter: '\u0D2A' },
  { id: 'sign_37', letter: '\u0D2B' },
  { id: 'sign_38', letter: '\u0D2C' },
  { id: 'sign_39', letter: '\u0D2D' },
  { id: 'sign_40', letter: '\u0D2E' },
  { id: 'sign_41', letter: '\u0D2F' },
  { id: 'sign_42', letter: '\u0D30' },
  { id: 'sign_43', letter: '\u0D32' },
  { id: 'sign_44', letter: '\u0D35' },
  { id: 'sign_45', letter: '\u0D36' },
  { id: 'sign_46', letter: '\u0D37' },
  { id: 'sign_47', letter: '\u0D38' },
  { id: 'sign_48', letter: '\u0D39' },
  { id: 'sign_49', letter: '\u0D33' },
  { id: 'sign_50', letter: '\u0D34' },
  { id: 'sign_51', letter: '\u0D31' },
  { id: 'sign_52', letter: '\u0D7A' },
  { id: 'sign_53', letter: '\u0D7E' },
  { id: 'sign_54', letter: '\u0D7C' },
  { id: 'sign_55', letter: '\u0D7D' },
  { id: 'sign_56', letter: '\u0D15\u0D3E' },
  { id: 'sign_57', letter: '\u0D15\u0D3F' },
  { id: 'sign_58', letter: '\u0D15\u0D40' },
  { id: 'sign_59', letter: '\u0D15\u0D41' },
  { id: 'sign_60', letter: '\u0D15\u0D42' },
  { id: 'sign_61', letter: '\u0D15\u0D43' },
  { id: 'sign_62', letter: '\u0D15\u0D46' },
  { id: 'sign_63', letter: '\u0D15\u0D47' },
  { id: 'sign_64', letter: '\u0D15\u0D48' },
  { id: 'sign_65', letter: '\u0D15\u0D4A' },
  { id: 'sign_66', letter: '\u0D15\u0D4B' },
  { id: 'sign_67', letter: '\u0D15\u0D57' },
  { id: 'sign_68', letter: '\u0D15\u0D4D\u0D2F' },
  { id: 'sign_69', letter: '\u0D15\u0D4D\u0D30' },
  { id: 'sign_70', letter: '\u0D15\u0D4D\u0D35' },
  { id: 'sign_71', letter: '\u0D15\u0D4D' },
];

// Reverse lookup: letter → sign ID (e.g. 'ക' → 'sign_16')
const CHAR_VIDEO = Object.fromEntries(ALPHABETS.map(a => [a.letter, a.id]));

// ─────────────────────────────────────────────────────────────────────────────
// GAME LEVELS — only characters from labels.txt are used
// ─────────────────────────────────────────────────────────────────────────────
const LEVELS = [
  // Easy — 2–3 signs each, only base consonants + single matras
  { level: 1, difficulty: 'Easy', xp: 50, sentence: 'കാർ', hint: 'Hand / Shore' },
  { level: 2, difficulty: 'Easy', xp: 75, sentence: 'വര', hint: 'Line / Come' },
  { level: 3, difficulty: 'Easy', xp: 100, sentence: 'നദി', hint: 'River' },
  { level: 4, difficulty: 'Easy', xp: 120, sentence: 'പനി', hint: 'Fever' },
  // Medium — 3–4 signs, includes one matra
  { level: 5, difficulty: 'Medium', xp: 150, sentence: 'കുതിര', hint: 'Horse' },
  { level: 6, difficulty: 'Medium', xp: 175, sentence: 'കടുവ', hint: 'Tiger' },
  { level: 7, difficulty: 'Medium', xp: 200, sentence: 'പടിക്കൽ', hint: 'On the steps' },
  { level: 8, difficulty: 'Medium', xp: 225, sentence: 'ഭൂമി', hint: 'Earth' },
  // Hard — 4–5 signs, virama cluster or multiple matras
  { level: 9, difficulty: 'Hard', xp: 275, sentence: 'സഹാനുഭൂതി', hint: 'Sympathy' },
  { level: 10, difficulty: 'Hard', xp: 300, sentence: 'സൂചിപ്പിക്കുന്നു', hint: 'To point out' },
  { level: 11, difficulty: 'Hard', xp: 350, sentence: 'സത്യസന്ധത', hint: 'Honesty' },
  { level: 12, difficulty: 'Hard', xp: 400, sentence: 'ഉരുളയ്ക്ക് ഉപ്പേരി', hint: 'Banana chips' },
  // Expert — 5+ signs, multiple matras + virama
  { level: 13, difficulty: 'Expert', xp: 500, sentence: 'എനിക്ക് പനിയാണ്', hint: 'I have a fever' },
  { level: 14, difficulty: 'Expert', xp: 600, sentence: 'ഞാൻ ഒരു പക്ഷിയെ കണ്ടു', hint: 'I saw a bird' },
  { level: 15, difficulty: 'Expert', xp: 750, sentence: 'എൻ്റെ വീട് ഒരു മന\u0D47\u0D3Eഹരമായ സ്ഥലമാണ്', hint: 'My house is a beautiful place' },
];

const DIFFICULTY_CONFIG = {
  Easy: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: '⭐ Easy' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '⭐⭐ Medium' },
  Hard: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '⭐⭐⭐ Hard' },
  Expert: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)', label: '⭐⭐⭐⭐ Expert' },
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STORAGE BACKUP — keyed by user email so multiple accounts don't clash
// ─────────────────────────────────────────────────────────────────────────────
function lsKey(email) {
  return `gesturemate_progress_${email}`;
}

function loadProgressFromLS(email) {
  if (typeof window === 'undefined' || !email) return null;
  try {
    const raw = localStorage.getItem(lsKey(email));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProgressToLS(email, progress) {
  if (typeof window === 'undefined' || !email) return;
  try {
    localStorage.setItem(lsKey(email), JSON.stringify(progress));
  } catch {
    // localStorage unavailable or full — silently ignore
  }
}

/**
 * Merge API progress with localStorage backup — always take the best of both.
 * This handles the case where the API returned stale/empty data.
 */
function mergeProgress(apiData, lsData) {
  if (!lsData) return apiData;
  if (!apiData) return lsData;

  // Build a merged completedLevels list (union)
  const levelMap = new Map();
  [...(lsData.completedLevels || []), ...(apiData.completedLevels || [])].forEach(entry => {
    const existing = levelMap.get(entry.level);
    if (!existing) {
      levelMap.set(entry.level, { ...entry });
    } else {
      // Keep best time, most attempts
      levelMap.set(entry.level, {
        ...existing,
        attempts: Math.max(existing.attempts || 1, entry.attempts || 1),
        timeTakenSeconds: Math.min(existing.timeTakenSeconds || 999999, entry.timeTakenSeconds || 999999),
      });
    }
  });

  const mergedCompleted = Array.from(levelMap.values());
  const maxLevel = mergedCompleted.length > 0
    ? Math.max(...mergedCompleted.map(l => l.level)) + 1
    : 1;

  return {
    ...apiData,
    currentLevel: Math.max(apiData.currentLevel || 1, lsData.currentLevel || 1, maxLevel),
    totalXP: Math.max(apiData.totalXP || 0, lsData.totalXP || 0),
    completedLevels: mergedCompleted,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI HELPER
// ─────────────────────────────────────────────────────────────────────────────
function ConfettiPiece({ style }) {
  return <div style={style} />;
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    style: {
      position: 'fixed',
      top: `${Math.random() * -10}vh`,
      left: `${Math.random() * 100}vw`,
      width: `${6 + Math.random() * 8}px`,
      height: `${6 + Math.random() * 8}px`,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      background: ['#f97316', '#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 6)],
      animation: `confetti-fall ${1.5 + Math.random() * 2}s linear ${Math.random() * 0.8}s forwards`,
      zIndex: 9999,
      pointerEvents: 'none',
    }
  }));
  return <>{pieces.map(p => <ConfettiPiece key={p.id} style={p.style} />)}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER COMPARISON DISPLAY  (tiles are clickable → video modal)
// ─────────────────────────────────────────────────────────────────────────────
function CharComparison({ typed, target, onCharClick }) {
  const targetChars = [...target];
  const typedChars = [...typed];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '12px' }}>
      {targetChars.map((ch, i) => {
        const typedChar = typedChars[i];
        const hasVideo = !!CHAR_VIDEO[ch];
        let bg = 'rgba(255,255,255,0.08)';
        let color = 'rgba(255,255,255,0.35)';
        let border = '1.5px solid rgba(255,255,255,0.12)';
        if (typedChar !== undefined) {
          if (typedChar === ch) {
            bg = 'rgba(34,197,94,0.25)';
            color = '#86efac';
            border = '1.5px solid rgba(34,197,94,0.5)';
          } else {
            bg = 'rgba(239,68,68,0.25)';
            color = '#fca5a5';
            border = '1.5px solid rgba(239,68,68,0.5)';
          }
        }
        return (
          <div
            key={i}
            title={hasVideo ? `Click to watch sign for "${ch}"` : ch}
            onClick={() => hasVideo && onCharClick && onCharClick(ch)}
            style={{
              width: '44px', height: '54px', borderRadius: '10px',
              background: bg, color, border,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontFamily: 'serif',
              transition: 'all 0.2s ease',
              cursor: hasVideo ? 'pointer' : 'default',
              position: 'relative',
            }}
          >
            {typedChar || ch}
            {/* tiny play icon badge */}
            {hasVideo && (
              <span style={{
                position: 'absolute', bottom: '3px', right: '4px',
                fontSize: '0.45rem', opacity: 0.6, lineHeight: 1,
              }}>▶</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN VIDEO MODAL  (mini popup — same style as AlphabetTutorial)
// ─────────────────────────────────────────────────────────────────────────────
function SignVideoModal({ char, onClose }) {
  const signId = CHAR_VIDEO[char];
  if (!signId) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'slide-in-up 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg,#1a1a2e,#16213e)',
          border: '1.5px solid rgba(249,115,22,0.35)',
          borderRadius: '20px', overflow: 'hidden',
          width: 'min(380px, 92vw)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg,#f97316,#ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', fontFamily: 'serif', color: '#fff',
              flexShrink: 0,
            }}>{char}</div>
            <div>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-inter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Sign Tutorial</p>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-inter)' }}>
                {char} — {signId.replace('_', ' ').toUpperCase()}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: 'rgba(255,255,255,0.6)', fontSize: '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* Video */}
        <video
          key={signId}
          controls
          autoPlay
          loop
          style={{ width: '100%', display: 'block', maxHeight: '320px', background: '#000' }}
        >
          <source src={`/videos/${signId}.mp4`} type="video/mp4" />
        </video>

        {/* Footer */}
        <p style={{ padding: '10px 20px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-inter)' }}>
          File: <code style={{ color: 'rgba(249,115,22,0.7)' }}>{signId}.mp4</code>
          &nbsp;·&nbsp;Click outside to close
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function GamePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  // ── Page / auth state
  const [isLoading, setIsLoading] = useState(true);

  // ── View: 'levels' | 'game' | 'win'
  const [view, setView] = useState('levels');

  // ── Game progress from MongoDB
  const [progress, setProgress] = useState({ currentLevel: 1, completedLevels: [], totalXP: 0 });
  const [progressLoading, setProgressLoading] = useState(true);

  // ── Active level
  const [activeLevel, setActiveLevel] = useState(null); // LEVELS[x]

  // ── Sign recognition state (mirrors sign-recognition.js)
  const [char, setChar] = useState('—');
  const [sentence, setSentence] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [predictionType, setPredictionType] = useState('static');
  const [dynamicFrames, setDynamicFrames] = useState(0);
  const [dynamicLocked, setDynamicLocked] = useState(false);
  const [recognitionMode, setRecognitionMode] = useState('static');
  const [pendingChar, setPendingChar] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // ── Fast conversation
  const [fastMode, setFastMode] = useState(false);
  const fastModeRef = useRef(false);
  const fastCharBufferRef = useRef({ char: null, count: 0 });
  const fastCooldownRef = useRef(null);

  // ── Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const [attempts, setAttempts] = useState(1);

  // ── Win state
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle'|'saving'|'saved'|'savedLocally'|'error'

  // ── Video modal (char sign tutorial)
  const [videoModalChar, setVideoModalChar] = useState(null);

  // ─────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    // No artificial delay — render immediately
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoaded || isLoading) return;
    if (!isSignedIn) router.push('/login');
  }, [isLoaded, isSignedIn, isLoading, router]);

  // ─────────────────────────────────────────────────────────
  // Fetch user progress from MongoDB (with localStorage fallback)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const userEmail = user.primaryEmailAddress?.emailAddress || user.id;
    const fetchProgress = async () => {
      // 1. Load localStorage backup immediately so UI isn't empty
      const lsData = loadProgressFromLS(userEmail);
      if (lsData) setProgress(lsData);

      try {
        const res = await fetch(`/api/game-progress?clerkId=${user.id}`);
        if (res.ok) {
          const apiData = await res.json();
          // Merge API + LS — always show the best of both
          const merged = mergeProgress(apiData, lsData);
          setProgress(merged);
          // Keep localStorage in sync with the merged result
          saveProgressToLS(userEmail, merged);
        } else {
          // API returned an error — rely on localStorage data already set above
          console.warn('game-progress API returned error, using localStorage backup');
        }
      } catch (err) {
        // Network error — rely on localStorage data already set above
        console.warn('Failed to fetch game progress from API, using localStorage backup:', err);
      } finally {
        setProgressLoading(false);
      }
    };
    fetchProgress();
  }, [isLoaded, isSignedIn, user]);

  // ─────────────────────────────────────────────────────────
  // Sign recognition polling (only active during game)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'game' || !isLoaded || !isSignedIn) return;
    const poll = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const d = await res.json();
          const newChar = d.char || '—';
          const newConf = d.confidence || 0;
          setChar(newChar);
          setSentence(d.sentence || '');
          setConfidence(newConf);
          setPredictionType(d.prediction_type || 'static');
          setDynamicFrames(d.dynamic_frames ?? 0);
          setDynamicLocked(d.dynamic_locked ?? false);
          setRecognitionMode(d.recognition_mode || 'static');
          setPendingChar(d.pending_char ?? null);
          setIsConnected(true);

          // Fast conversation auto-commit — static mode ONLY
          // In dynamic mode the backend handles commits via the NEXT gesture;
          // running fast-mode here would auto-append the pending label or "✓" to the sentence.
          const currentMode = d.recognition_mode || 'static';
          const isControlChar = ['—', '✓', '␣', 'NEXT', 'SPACE', 'next', 'space'].includes(newChar);
          if (fastModeRef.current && currentMode === 'static' && !isControlChar && newChar && newConf > 0.55) {
            const buf = fastCharBufferRef.current;
            if (buf.char === newChar) buf.count += 1;
            else { buf.char = newChar; buf.count = 1; }
            if (buf.count === 3 && fastCooldownRef.current !== newChar) {
              fastCooldownRef.current = newChar;
              buf.count = 0;
              setSentence(prev => {
                const next = prev + newChar;
                syncToFlask(next);
                return next;
              });
              setTimeout(() => { fastCooldownRef.current = null; }, 1500);
            }
          } else if (!fastModeRef.current || currentMode !== 'static') {
            fastCharBufferRef.current = { char: null, count: 0 };
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
  }, [view, isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fastModeRef.current = fastMode; }, [fastMode]);

  // ─────────────────────────────────────────────────────────
  // Win detection — compare typed sentence to target
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'game' || !activeLevel) return;
    const typed = sentence.trim();
    const target = activeLevel.sentence.trim();
    if (typed === target && typed.length > 0) {
      handleWin();
    }
  }, [sentence, view, activeLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────
  // Timer
  // ─────────────────────────────────────────────────────────
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => () => stopTimer(), []);

  // ─────────────────────────────────────────────────────────
  // Flask helpers
  // ─────────────────────────────────────────────────────────
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

  const flaskReset = async () => {
    try { await fetch('/api/reset', { method: 'POST' }); } catch { }
  };

  const setMode = async (mode) => {
    setRecognitionMode(mode);
    setChar('—'); setConfidence(0); setDynamicFrames(0);
    setDynamicLocked(false); setPendingChar(null);
    try {
      await fetch('/api/set-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
    } catch { }
  };

  const handleReset = async () => {
    setSentence(''); setChar('—'); setConfidence(0);
    setDynamicFrames(0); setDynamicLocked(false); setPendingChar(null);
    setAttempts(a => a + 1);
    await flaskReset();
  };

  const handleBackspace = async () => {
    setSentence(prev => {
      const next = [...prev].slice(0, -1).join('');
      syncToFlask(next);
      return next;
    });
    setChar('—'); setConfidence(0);
  };

  // ─────────────────────────────────────────────────────────
  // Level navigation
  // ─────────────────────────────────────────────────────────
  const startLevel = async (lvl) => {
    setActiveLevel(lvl);
    setSentence(''); setChar('—'); setConfidence(0);
    setDynamicFrames(0); setDynamicLocked(false); setPendingChar(null);
    setAttempts(1); setElapsed(0);
    setFastMode(false);
    fastCharBufferRef.current = { char: null, count: 0 };
    fastCooldownRef.current = null;
    await flaskReset();
    setView('game');
    startTimer();
  };

  const handleWin = useCallback(async () => {
    stopTimer();
    const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const earned = activeLevel?.xp || 100;
    setXpEarned(earned);
    setShowConfetti(true);
    setView('win');

    if (user?.id) {
      setSaveStatus('saving');
      const userEmail = user.primaryEmailAddress?.emailAddress || user.id;

      // ── 1. Always update localStorage first (instant, never fails) ──────────
      setProgress(prev => {
        const existingIdx = prev.completedLevels?.findIndex(l => l.level === activeLevel.level) ?? -1;
        let newCompleted;
        if (existingIdx >= 0) {
          newCompleted = prev.completedLevels.map((l, i) =>
            i === existingIdx
              ? { ...l, attempts: l.attempts + 1, timeTakenSeconds: Math.min(l.timeTakenSeconds, finalTime) }
              : l
          );
        } else {
          newCompleted = [
            ...(prev.completedLevels || []),
            { level: activeLevel.level, timeTakenSeconds: finalTime, attempts, completedAt: new Date().toISOString() },
          ];
        }
        const newProgress = {
          ...prev,
          currentLevel: Math.max(prev.currentLevel || 1, activeLevel.level + 1),
          totalXP: existingIdx >= 0 ? prev.totalXP : (prev.totalXP || 0) + earned,
          completedLevels: newCompleted,
        };
        // Persist to localStorage immediately
        saveProgressToLS(userEmail, newProgress);
        return newProgress;
      });

      // ── 2. Also try to save to MongoDB (best-effort) ─────────────────────
      try {
        const res = await fetch('/api/game-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: user.id,
            level: activeLevel.level,
            timeTakenSeconds: finalTime,
            attempts,
            xpEarned: earned,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          // Merge API response with localStorage to keep them in sync
          const lsData = loadProgressFromLS(userEmail);
          const merged = mergeProgress(data, lsData);
          setProgress(merged);
          saveProgressToLS(userEmail, merged);
          setSaveStatus('saved');
        } else {
          // API failed — progress is already safely in localStorage
          console.warn('game-progress POST failed, progress saved locally');
          setSaveStatus('savedLocally');
        }
      } catch {
        // Network error — progress is already safely in localStorage
        console.warn('game-progress POST network error, progress saved locally');
        setSaveStatus('savedLocally');
      }
    }

    setTimeout(() => setShowConfetti(false), 4000);
  }, [activeLevel, attempts, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToNextLevel = async () => {
    const nextIdx = LEVELS.findIndex(l => l.level === activeLevel.level) + 1;
    if (nextIdx < LEVELS.length) {
      await startLevel(LEVELS[nextIdx]);
    } else {
      setView('levels');
    }
  };

  const retryLevel = async () => {
    await startLevel(activeLevel);
  };

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────
  const isLevelUnlocked = (lvl) => lvl.level <= (progress.currentLevel || 1);
  const isLevelCompleted = (lvl) => progress.completedLevels?.some(c => c.level === lvl.level);
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─────────────────────────────────────────────────────────
  // Render guards
  // ─────────────────────────────────────────────────────────
  if (!isLoaded || !isSignedIn || isLoading) return <Loading />;

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  // Direct Flask URL — bypasses the Next.js /api/video-feed proxy for lower latency
  const FLASK_URL = 'http://localhost:5000';

  return (
    <>
      <Head>
        <title>Sign Language Game – GestureMate</title>
        {/* Pre-open TCP connection to Flask so the feed loads faster */}
        <link rel="preconnect" href={FLASK_URL} />
        {/* Preload sign videos for all chars in the active level — instant playback on click */}
        {activeLevel && [...new Set([...activeLevel.sentence])]
          .filter(ch => CHAR_VIDEO[ch])
          .map(ch => (
            <link
              key={ch}
              rel="preload"
              as="video"
              href={`/videos/${CHAR_VIDEO[ch]}.mp4`}
            />
          ))
        }
      </Head>

      {/* Global game styles */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes float-up {
          0%   { transform: translateY(0px) scale(1); opacity: 0.12; }
          50%  { transform: translateY(-18px) scale(1.04); opacity: 0.18; }
          100% { transform: translateY(0px) scale(1); opacity: 0.12; }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(249,115,22,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        @keyframes level-unlock {
          0%   { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes char-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes win-bounce {
          0%,100% { transform: translateY(0); }
          40%     { transform: translateY(-18px); }
          60%     { transform: translateY(-10px); }
        }
        @keyframes slide-in-up {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes glow-pulse {
          0%,100% { text-shadow: 0 0 20px rgba(249,115,22,0.4); }
          50%     { text-shadow: 0 0 40px rgba(249,115,22,0.8), 0 0 60px rgba(249,115,22,0.3); }
        }
        .game-level-card:hover { transform: translateY(-4px) scale(1.02); }
        .game-level-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0e0e14', color: '#fff' }}>
        <Navigation />

        {/* ══════════════════ LEVEL SELECT VIEW ══════════════════ */}
        {view === 'levels' && (
          <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px 80px' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '48px', animation: 'slide-in-up 0.5s ease' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🎮</div>
              <h1 style={{ fontSize: '2.8rem', fontWeight: 800, background: 'linear-gradient(135deg,#f97316,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'var(--font-work-sans)', marginBottom: '10px' }}>
                Sign Language Game
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', fontFamily: 'var(--font-inter)' }}>
                Type Malayalam sentences using hand gestures. Progress through levels and earn XP!
              </p>

              {/* Stats bar */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '28px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Current Level', value: `${progress.currentLevel}`, icon: '🏅' },
                  { label: 'Total XP', value: `${progress.totalXP} ✨`, icon: '⚡' },
                  { label: 'Completed', value: `${progress.completedLevels?.length || 0} / ${LEVELS.length}`, icon: '✅' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px 24px', textAlign: 'center', minWidth: '130px' }}>
                    <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f97316' }}>{progressLoading ? '…' : s.value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-inter)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Level grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '18px' }}>
              {LEVELS.map((lvl, i) => {
                const unlocked = isLevelUnlocked(lvl);
                const completed = isLevelCompleted(lvl);
                const diff = DIFFICULTY_CONFIG[lvl.difficulty];
                const completedData = progress.completedLevels?.find(c => c.level === lvl.level);
                return (
                  <div
                    key={lvl.level}
                    className="game-level-card"
                    onClick={() => unlocked && startLevel(lvl)}
                    style={{
                      background: completed
                        ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
                        : unlocked
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(255,255,255,0.025)',
                      border: `1.5px solid ${completed ? 'rgba(34,197,94,0.4)' : unlocked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: '18px',
                      padding: '22px',
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                      opacity: unlocked ? 1 : 0.45,
                      animation: `level-unlock 0.4s ease ${i * 0.04}s both`,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Lock / complete icon */}
                    <div style={{ position: 'absolute', top: '14px', right: '14px', fontSize: '1.1rem' }}>
                      {completed ? '✅' : unlocked ? '🔓' : '🔒'}
                    </div>

                    {/* Level number */}
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-inter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Level</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: unlocked ? '#f97316' : 'rgba(255,255,255,0.3)', lineHeight: 1, marginBottom: '10px' }}>{lvl.level}</div>

                    {/* Sentence */}
                    <div style={{ fontSize: '1.5rem', fontFamily: 'serif', marginBottom: '4px', color: unlocked ? '#fff' : 'rgba(255,255,255,0.3)' }}>{lvl.sentence}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-inter)', marginBottom: '14px' }}>{lvl.hint}</div>

                    {/* Difficulty badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: diff.bg, color: diff.color, borderRadius: '999px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-inter)' }}>
                      {diff.label}
                    </div>

                    {/* XP */}
                    <div style={{ position: 'absolute', bottom: '14px', right: '14px', fontSize: '0.75rem', color: '#a855f7', fontWeight: 700 }}>
                      +{lvl.xp} XP
                    </div>

                    {/* Best time */}
                    {completedData && (
                      <div style={{ marginTop: '10px', fontSize: '0.7rem', color: 'rgba(34,197,94,0.8)', fontFamily: 'var(--font-inter)' }}>
                        ⏱ Best: {formatTime(completedData.timeTakenSeconds)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Back button */}
            <div style={{ textAlign: 'center', marginTop: '48px' }}>
              <button
                onClick={() => router.push('/custom-training')}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', padding: '10px 28px', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-inter)', transition: 'all 0.2s' }}
              >
                ← Back to Training
              </button>
            </div>
          </main>
        )}

        {/* ══════════════════ GAME VIEW ══════════════════ */}
        {view === 'game' && activeLevel && (
          <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '24px 24px 60px' }}>

            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', animation: 'slide-in-up 0.4s ease' }}>
              <button
                onClick={() => { stopTimer(); flaskReset(); setView('levels'); }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.55)', padding: '8px 18px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-inter)' }}
              >
                ← Levels
              </button>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {/* Timer */}
                <div style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '10px', padding: '8px 18px', fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#fb923c' }}>
                  ⏱ {formatTime(elapsed)}
                </div>
                {/* Attempt */}
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-inter)' }}>
                  Attempt #{attempts}
                </div>
                {/* Connection */}
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isConnected ? '#4ade80' : '#f87171' }}>
                  {isConnected ? '● Connected' : '● Disconnected'}
                </div>
              </div>
            </div>

            {/* Question card */}
            <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(168,85,247,0.1))', border: '1.5px solid rgba(249,115,22,0.3)', borderRadius: '20px', padding: '28px 32px', marginBottom: '24px', textAlign: 'center', animation: 'slide-in-up 0.45s ease' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-inter)', marginBottom: '8px' }}>
                Level {activeLevel.level} — {activeLevel.difficulty} · +{activeLevel.xp} XP
              </div>
              <div style={{ fontSize: '3rem', fontFamily: 'serif', color: '#fff', marginBottom: '6px', animation: 'glow-pulse 2s ease infinite' }}>
                {activeLevel.sentence}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-inter)' }}>
                {activeLevel.hint} • Type this sentence using your hand gestures
              </div>

              {/* Character comparison — tiles are clickable to show sign video */}
              <CharComparison
                typed={sentence}
                target={activeLevel.sentence}
                onCharClick={(ch) => setVideoModalChar(ch)}
              />
            </div>

            {/* Main game layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', animation: 'slide-in-up 0.5s ease' }}>

              {/* Camera feed */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '18px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', fontFamily: 'var(--font-inter)' }}>📷 Camera Feed</span>
                </div>
                <div style={{ background: '#000', borderRadius: '0 0 17px 17px', overflow: 'hidden' }}>
                  <img
                    src={`${FLASK_URL}/video_feed`}
                    alt="Video Feed"
                    style={{ width: '100%', display: 'block' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const p = e.target.parentElement;
                      if (p && !p.querySelector('.feed-error')) {
                        const d = document.createElement('div');
                        d.className = 'feed-error';
                        d.style.cssText = 'text-align:center;color:#94a3b8;padding:80px 24px;';
                        d.innerHTML = '<p style="font-size:1rem;margin-bottom:6px">📷 Unable to connect to camera</p><p style="font-size:0.8rem">Start Flask backend on port 5000</p>';
                        p.appendChild(d);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Right panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Recognition output */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '20px' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-inter)', marginBottom: '14px' }}>Sign Recognition</p>

                  {/* Fast Conversation toggle */}
                  <button
                    onClick={() => setFastMode(prev => {
                      const next = !prev;
                      if (!next) { fastCharBufferRef.current = { char: null, count: 0 }; fastCooldownRef.current = null; }
                      return next;
                    })}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: '10px', marginBottom: '14px', border: 'none', cursor: 'pointer',
                      background: fastMode ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ color: fastMode ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-inter)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⚡ Fast Conversation
                    </span>
                    <span style={{ width: '32px', height: '16px', borderRadius: '999px', background: fastMode ? '#7c3aed' : 'rgba(255,255,255,0.15)', position: 'relative', display: 'inline-block', transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: '2px', left: fastMode ? '16px' : '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                    </span>
                  </button>

                  {/* Mode toggle */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '4px' }}>
                    {['static', 'dynamic'].map(m => (
                      <button key={m} onClick={() => setMode(m)} style={{
                        flex: 1, padding: '6px 0', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-inter)', transition: 'all 0.2s',
                        background: recognitionMode === m ? (m === 'dynamic' ? '#3b82f6' : '#f97316') : 'transparent',
                        color: recognitionMode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                      }}>{m === 'static' ? '🤚 Static' : '👋 Dynamic'}</button>
                    ))}
                  </div>

                  {/* Detected character */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-inter)', marginBottom: '4px' }}>Detected</p>
                      <div style={{ fontSize: '3.8rem', fontWeight: 800, color: '#f97316', lineHeight: 1, animation: char !== '—' ? 'char-pop 0.2s ease' : 'none' }}>{char}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-inter)', marginBottom: '6px' }}>Confidence</p>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#f97316,#a855f7)', width: `${Math.min(confidence * 100, 100)}%`, transition: 'width 0.3s ease' }} />
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px', fontFamily: 'var(--font-inter)' }}>{(confidence * 100).toFixed(1)}%</p>

                      {recognitionMode === 'dynamic' && (
                        <>
                          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-inter)', marginTop: '8px', marginBottom: '4px' }}>
                            Frames <span style={{ color: '#60a5fa', fontWeight: 700 }}>{dynamicFrames}/30</span>
                          </p>
                          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '999px', background: '#3b82f6', width: `${(dynamicFrames / 30) * 100}%`, transition: 'width 0.15s' }} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pending char (dynamic mode) */}
                  {recognitionMode === 'dynamic' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: pendingChar ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)', border: pendingChar ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', transition: 'all 0.3s' }}>
                      <div>
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-inter)', marginBottom: '2px' }}>Pending</p>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: pendingChar ? '#60a5fa' : 'rgba(255,255,255,0.2)' }}>{pendingChar || '—'}</div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#60a5fa', fontFamily: 'var(--font-inter)', fontStyle: 'italic' }}>
                        {pendingChar ? '"next" gesture to commit' : 'No char pending'}
                      </p>
                    </div>
                  )}

                  {/* Typed sentence box */}
                  <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', minHeight: '64px', padding: '12px', marginBottom: '12px', fontSize: '1.5rem', fontFamily: 'serif', color: '#fff', wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {sentence || <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontFamily: 'var(--font-inter)' }}>Your typed sentence will appear here…</span>}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleReset} style={{ flex: 1, background: '#f97316', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 0', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-glory)', transition: 'background 0.2s' }}>
                      ↺ Reset
                    </button>
                    <button onClick={handleBackspace} disabled={!sentence} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: sentence ? '#fff' : 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '9px 0', fontSize: '0.82rem', fontWeight: 700, cursor: sentence ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-glory)', transition: 'all 0.2s' }}>
                      ⌫ Backspace
                    </button>
                  </div>
                </div>

                {/* Progress towards answer */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px 18px' }}>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-inter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Progress</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        borderRadius: '999px',
                        background: 'linear-gradient(90deg,#f97316,#a855f7)',
                        width: `${activeLevel ? Math.min(([...sentence].length / [...activeLevel.sentence].length) * 100, 100) : 0}%`,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-inter)', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>
                      {activeLevel ? `${[...sentence].length}/${[...activeLevel.sentence].length}` : '0/0'}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </main>
        )}

        {/* ══════════════════ WIN VIEW ══════════════════ */}
        {view === 'win' && activeLevel && (
          <>
            {showConfetti && <Confetti />}
            <main style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 24px', textAlign: 'center', animation: 'slide-in-up 0.5s ease' }}>

              {/* Trophy */}
              <div style={{ fontSize: '5rem', marginBottom: '16px', animation: 'win-bounce 0.8s ease' }}>🏆</div>
              <h1 style={{ fontSize: '2.8rem', fontWeight: 800, background: 'linear-gradient(135deg,#f97316,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'var(--font-work-sans)', marginBottom: '8px' }}>
                Level Complete!
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-inter)', marginBottom: '36px' }}>
                You signed <span style={{ color: '#f97316', fontFamily: 'serif', fontSize: '1.1rem' }}>{activeLevel.sentence}</span> ({activeLevel.hint}) correctly!
              </p>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '36px' }}>
                {[
                  { icon: '⏱', label: 'Time', value: formatTime(elapsed) },
                  { icon: '⚡', label: 'XP Earned', value: `+${xpEarned}` },
                  { icon: '🎯', label: 'Attempts', value: `${attempts}` },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '18px 12px' }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{s.icon}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f97316' }}>{s.value}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-inter)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Total XP */}
              <div style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '12px', padding: '12px 20px', marginBottom: '28px', fontSize: '0.9rem', color: '#c084fc', fontFamily: 'var(--font-inter)' }}>
                Total XP: <strong style={{ fontSize: '1.1rem' }}>{progress.totalXP} ✨</strong>
                {saveStatus === 'saving' && <span style={{ marginLeft: '10px', opacity: 0.6 }}>Saving…</span>}
                {saveStatus === 'saved' && <span style={{ marginLeft: '10px', color: '#4ade80' }}>✓ Saved</span>}
                {saveStatus === 'savedLocally' && <span style={{ marginLeft: '10px', color: '#fbbf24' }}>✓ Saved locally</span>}
                {saveStatus === 'error' && <span style={{ marginLeft: '10px', color: '#f87171' }}>⚠ Save failed</span>}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={goToNextLevel}
                  style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '14px', padding: '14px 36px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-glory)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)', animation: 'pulse-ring 2s ease infinite' }}
                >
                  Next Level →
                </button>
                <button
                  onClick={retryLevel}
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '14px 28px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-glory)' }}
                >
                  ↺ Retry
                </button>
                <button
                  onClick={() => setView('levels')}
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 22px', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-inter)' }}
                >
                  All Levels
                </button>
              </div>
            </main>
          </>
        )}

        <Footer />
      </div>

      {/* Sign video modal — opens when a char tile is clicked */}
      {videoModalChar && (
        <SignVideoModal
          char={videoModalChar}
          onClose={() => setVideoModalChar(null)}
        />
      )}
    </>
  );
}
