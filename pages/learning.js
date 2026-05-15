import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Loading from '../components/Loading';
import AlphabetTutorial from '../components/AlphabetTutorial';

export default function Learning() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || isLoading) return;
    if (!isSignedIn) router.push('/login');
  }, [isLoaded, isSignedIn, isLoading, router]);

  if (!isLoaded || !isSignedIn || isLoading) {
    return <Loading />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navigation />
      <main style={{ width: '100%', maxWidth: 1440, margin: '0 auto', padding: '32px' }}>

        {/* Hero banner */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '1.5rem',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          marginBottom: '2rem',
          border: '1px solid var(--card-border)',
        }}>
          <div style={{
            position: 'absolute', top: -32, left: -32,
            width: 1200, height: 250,
            background: 'var(--brand-orange)',
            borderRadius: '50%', opacity: 0.07,
            pointerEvents: 'none',
          }} />
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.75rem', fontFamily: 'var(--font-work-sans)' }}>
            Learning
          </h1>
          <p style={{ color: 'var(--muted-text)', fontFamily: 'var(--font-inter)' }}>
            Explore structured lessons and interactive content to master sign language step-by-step.
          </p>
        </div>

        {/* Malayalam alphabet video tutorial */}
        <AlphabetTutorial />

      </main>
      <Footer />
    </div>
  );
}
