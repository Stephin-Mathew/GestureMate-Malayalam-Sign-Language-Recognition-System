import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import Head from 'next/head';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

// Floating Malayalam characters for the animated background
const BG_CHARS = ['അ', 'ആ', 'ഇ', 'ക', 'ച', 'ന', 'മ', 'ര', 'ല', 'വ', 'സ', 'ഗ', 'ഭ', 'ജ', 'ത', 'പ', 'ബ', 'ഡ', 'ഹ', 'ഴ'];

function FloatingChar({ char, style }) {
  return (
    <div style={{
      position: 'absolute',
      fontSize: style.size,
      color: 'rgba(249,115,22,0.15)',
      fontFamily: 'serif',
      userSelect: 'none',
      pointerEvents: 'none',
      animation: `float-char ${style.duration}s ease-in-out ${style.delay}s infinite alternate`,
      left: style.left,
      top: style.top,
      transform: `rotate(${style.rotate}deg)`,
    }}>
      {char}
    </div>
  );
}

export default function CustomTraining() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [hovering, setHovering] = useState(false);
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || isLoading) return;
    if (!isSignedIn) router.push('/login');
  }, [isLoaded, isSignedIn, isLoading, router]);

  // Fetch user game progress for stats display
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/game-progress?clerkId=${user.id}`);
        if (res.ok) setProgress(await res.json());
      } catch { }
    };
    fetchProgress();
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn || isLoading) return <Loading />;

  // Generate stable floating characters
  const floatingChars = BG_CHARS.map((ch, i) => ({
    char: ch,
    style: {
      size: `${1.8 + (i % 4) * 0.7}rem`,
      left: `${(i * 17 + 5) % 95}%`,
      top: `${(i * 13 + 3) % 85}%`,
      duration: 3.5 + (i % 3) * 1.2,
      delay: (i % 5) * 0.6,
      rotate: -20 + (i % 7) * 8,
    }
  }));

  return (
    <>
      <Head><title>Sign Challenge – GestureMate</title></Head>

      <style>{`
        @keyframes float-char {
          from { transform: translateY(0px) rotate(var(--r, 0deg)); opacity: 0.10; }
          to   { transform: translateY(-22px) rotate(var(--r, 5deg)); opacity: 0.22; }
        }
        @keyframes hero-glow {
          0%,100% { box-shadow: 0 0 60px rgba(249,115,22,0.15), 0 0 120px rgba(168,85,247,0.08); }
          50%     { box-shadow: 0 0 80px rgba(249,115,22,0.28), 0 0 150px rgba(168,85,247,0.18); }
        }
        @keyframes slide-fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes badge-pop {
          0%   { transform: scale(0.8); opacity: 0; }
          80%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes btn-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .start-btn-inner {
          background: linear-gradient(135deg, #f97316, #ea580c, #f97316);
          background-size: 200% auto;
          transition: background-position 0.6s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }
        .start-btn-inner:hover {
          background-position: right center;
          transform: scale(1.04);
          box-shadow: 0 12px 40px rgba(249,115,22,0.55);
        }
        .feature-card {
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(249,115,22,0.35) !important;
          background: rgba(249,115,22,0.04) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
        <Navigation />

        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* ── HERO SECTION ─────────────────────────────────────────── */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(168,85,247,0.05) 50%, rgba(0,0,0,0) 100%)',
            border: '1.5px solid rgba(249,115,22,0.2)',
            borderRadius: '28px',
            padding: '60px 48px',
            marginBottom: '32px',
            animation: 'hero-glow 4s ease infinite, slide-fade-in 0.6s ease both',
            textAlign: 'center',
          }}>
            {/* Floating letter background */}
            {floatingChars.map((fc, i) => <FloatingChar key={i} char={fc.char} style={fc.style} />)}

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '999px', padding: '5px 18px', fontSize: '0.8rem', fontWeight: 600, color: '#fb923c', fontFamily: 'var(--font-inter)', marginBottom: '20px', animation: 'badge-pop 0.6s ease 0.3s both' }}>
                🎮 Interactive Gesture Game
              </div>

              <h1 style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
                fontWeight: 800,
                fontFamily: 'var(--font-work-sans)',
                lineHeight: 1.1,
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #f97316, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Sign Challenge
              </h1>

              <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '560px', margin: '0 auto 36px', fontFamily: 'var(--font-inter)', lineHeight: 1.6 }}>
                Practice Malayalam sign language through a fast-paced gesture typing game.
                Show signs, build sentences, and level up your skills!
              </p>

              {/* Start Game button */}
              <button
                className="start-btn-inner"
                onClick={() => router.push('/game')}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  color: '#fff', border: 'none', borderRadius: '16px',
                  padding: '17px 48px', fontSize: '1.15rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font-glory)',
                  boxShadow: '0 6px 28px rgba(249,115,22,0.4)',
                  marginBottom: '16px',
                }}
              >
                <span>{hovering ? '🚀' : '🎮'}</span>
                Start Game
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </button>

              {/* Mini progress pill under button */}
              {progress && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Level', value: progress.currentLevel },
                    { label: 'Total XP', value: `${progress.totalXP} ✨` },
                    { label: 'Done', value: `${progress.completedLevels?.length || 0}/15` },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f97316' }}>{s.value}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-inter)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── FEATURES GRID ────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '32px' }}>
            {[
              {
                icon: '👁️',
                title: 'Real-Time Sign Recognition',
                desc: 'Your camera detects Malayalam hand gestures instantly — each sign becomes a character in your sentence.',
                color: '#f97316',
                delay: '0.1s',
              },
              {
                icon: '⚡',
                title: 'Fast Conversation Mode',
                desc: 'Toggle Fast Mode for automatic character commits without needing the "next" gesture. Speed up your typing flow.',
                color: '#a855f7',
                delay: '0.2s',
              },
              {
                icon: '🏆',
                title: 'Progressive Levels',
                desc: '15 levels with increasing difficulty — from simple words like "അമ്മ" to complex Malayalam sentences.',
                color: '#22c55e',
                delay: '0.3s',
              },
              {
                icon: '💾',
                title: 'Progress Saved Per User',
                desc: 'Your XP, completed levels, and best times are securely saved in MongoDB — unique to your account.',
                color: '#3b82f6',
                delay: '0.4s',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="feature-card"
                style={{
                  background: 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: '18px',
                  padding: '24px',
                  animation: `slide-fade-in 0.5s ease ${f.delay} both`,
                }}
              >
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `${f.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '14px', border: `1.5px solid ${f.color}33` }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-inter)', marginBottom: '8px' }}>{f.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', fontFamily: 'var(--font-inter)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* ── HOW TO PLAY ──────────────────────────────────────────── */}
          <div style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)', borderRadius: '20px', padding: '32px', animation: 'slide-fade-in 0.6s ease 0.5s both', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-work-sans)', marginBottom: '24px', color: 'var(--foreground)' }}>
              🕹️ How to Play
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {[
                { step: '1', text: 'Click Start Game and choose a level', icon: '🎯' },
                { step: '2', text: 'Read the Malayalam sentence shown at the top', icon: '📖' },
                { step: '3', text: 'Show the corresponding hand gestures to your camera', icon: '🤚' },
                { step: '4', text: 'Each gesture adds a character to your sentence', icon: '✍️' },
                { step: '5', text: 'Match the full sentence to win and earn XP!', icon: '🏆' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(249,115,22,0.2)', border: '1.5px solid rgba(249,115,22,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#f97316', flexShrink: 0 }}>{s.step}</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', fontFamily: 'var(--font-inter)', lineHeight: 1.5, marginTop: '4px' }}>
                    {s.icon} {s.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </main>
        <Footer />
      </div>
    </>
  );
}
