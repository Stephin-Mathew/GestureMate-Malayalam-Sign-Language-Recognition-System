import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import Head from 'next/head';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

export default function SignRecognition() {
  const [isLoading, setIsLoading] = useState(true);
  const [char, setChar] = useState('—');
  const [sentence, setSentence] = useState('');
  const [confidence, setConfidence] = useState(0.0);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  // Use Next.js API proxy for video feed to avoid CORS issues
  // If Flask has CORS configured, you can use: const flaskUrl = process.env.NEXT_PUBLIC_FLASK_BACKEND_URL || 'http://localhost:5000';
  const videoFeedUrl = '/api/video-feed';

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Update status from Flask backend
  useEffect(() => {
    if (!isSignedIn || isLoading) return;

    const updateStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (response.ok) {
          const data = await response.json();
          setChar(data.char || '—');
          setSentence(data.sentence || '');
          setConfidence(data.confidence || 0.0);
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error fetching status:', error);
        setIsConnected(false);
      }
    };

    // Update status every 200ms
    const interval = setInterval(updateStatus, 200);
    updateStatus(); // Initial fetch

    return () => clearInterval(interval);
  }, [isSignedIn, isLoading]);

  if (!isSignedIn) {
    router.push('/login');
    return <Loading />;
  }

  const handleReset = () => {
    setSentence('');
    setChar('—');
    setConfidence(0.0);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="w-full max-w-[1440px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-brand-dark" style={{ fontFamily: 'var(--font-inter)' }}>
                Live Camera Feed
              </h2>
              <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`} style={{ fontFamily: 'var(--font-inter)' }}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="rounded-xl overflow-hidden border-2 border-brand-orange bg-gray-50">
              <img
                src={videoFeedUrl}
                alt="Video Feed"
                className="w-full h-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const parent = e.target.parentElement;
                  if (parent && !parent.querySelector('.error-message')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.style.cssText = 'text-align: center; color: #64748b; padding: 24px;';
                    errorDiv.innerHTML = `
                      <p class="text-lg mb-2">Unable to connect to video feed</p>
                      <p class="text-sm">Make sure Flask backend is running on port 5000</p>
                    `;
                    parent.appendChild(errorDiv);
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>Detected Character</div>
              <div id="char" className="text-6xl font-bold text-brand-orange" style={{ fontFamily: 'var(--font-inter)' }}>
                {char}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-inter)' }}>Sentence</div>
              <div
                id="sentence"
                className="text-2xl bg-white border border-gray-200 rounded-xl min-h-[80px] p-4 text-brand-dark"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {sentence}
              </div>
            </div>

            <div id="confidence" className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
              Confidence: <span className="text-brand-dark">{confidence.toFixed(2)}</span>
            </div>

            <button
              onClick={handleReset}
              className="mt-6 bg-brand-orange text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors w-fit"
              style={{ fontFamily: 'var(--font-glory)' }}
            >
              Reset Sentence
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
