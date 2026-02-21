import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

export default function Learning() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || isLoading) return;
    if (!isSignedIn) {
      router.push('/login');
    }
  }, [isLoaded, isSignedIn, isLoading, router]);

  if (!isLoaded || !isSignedIn) {
    return <Loading />;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="w-full max-w-[1440px] mx-auto px-8 py-8">
        <div className="bg-white rounded-3xl p-8 relative overflow-hidden shadow-lg mb-8">
          <div className="absolute -top-8 -left-8 w-[1200px] h-[250px] bg-brand-orange rounded-full opacity-10"></div>
          <h1 className="text-4xl font-bold text-brand-dark mb-3" style={{ fontFamily: 'var(--font-work-sans)' }}>
            Learning
          </h1>
          <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
            Explore structured lessons and interactive content to master sign language step-by-step.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-lg font-bold">A</span>
            </div>
            <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
              Alphabet & Numbers
            </h3>
            <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
              Learn the foundational gestures with clear visuals and practice tasks.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-lg font-bold">C</span>
            </div>
            <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
              Common Phrases
            </h3>
            <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
              Practice greetings, questions, and everyday expressions.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-lg font-bold">I</span>
            </div>
            <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
              Interactive Exercises
            </h3>
            <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
              Hands-on tasks with real-time feedback to reinforce learning.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
