import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

export default function CustomTraining() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (!isSignedIn) {
    router.push('/login');
    return <Loading />;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="w-full max-w-[1440px] mx-auto px-8 py-8">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="bg-white rounded-3xl p-8 relative overflow-hidden shadow-lg">
              <div className="absolute -top-8 -left-8 w-[1200px] h-[250px] bg-brand-orange rounded-full opacity-10"></div>
              <h1 className="text-4xl font-bold text-brand-dark mb-4" style={{ fontFamily: 'var(--font-work-sans)' }}>
                Custom Training
              </h1>
              <p className="text-gray-600 mb-6" style={{ fontFamily: 'var(--font-inter)' }}>
                Build your personalized sign language learning path with interactive modules and practice sessions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-lg font-bold">1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
                    Basics Module
                  </h3>
                  <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                    Learn the alphabet, numbers, and common greetings with guided exercises.
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-lg font-bold">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
                    Practice Sessions
                  </h3>
                  <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                    Practice with timed drills and instant feedback to improve accuracy.
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-lg font-bold">3</span>
                  </div>
                  <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
                    Progress Tracking
                  </h3>
                  <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                    Track your progress and unlock new levels as you complete lessons.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-[350px]">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
                Upcoming Features
              </h3>
              <ul className="text-gray-600 space-y-2" style={{ fontFamily: 'var(--font-inter)' }}>
                <li>• Interactive quizzes</li>
                <li>• Community challenges</li>
                <li>• Advanced gesture training</li>
              </ul>
              <button
                className="mt-6 bg-brand-orange text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors w-full"
                style={{ fontFamily: 'var(--font-glory)' }}
              >
                Start a Demo Lesson
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
