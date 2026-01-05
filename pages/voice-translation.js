import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

export default function VoiceTranslation() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isSignedIn) {
    router.push('/login');
    return <Loading />;
  }

  const handleStartRecording = () => {
    setIsRecording(true);
    setTranscript('Listening...');
    // Simulate voice recognition
    setTimeout(() => {
      setTranscript('Hello, how are you today?');
      setTimeout(() => {
        setTranslation('👋 Hello, how are you today?');
        setIsRecording(false);
      }, 1000);
    }, 2000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setTranscript('Processing...');
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-brand-dark mb-4" style={{ fontFamily: 'var(--font-work-sans)' }}>
            Voice Translation
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-inter)' }}>
            Convert spoken language to sign language gestures using advanced voice recognition technology
          </p>
        </div>

        {/* Translation Interface */}
        <div className="max-w-4xl mx-auto">
          {/* Voice Input Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-semibold text-brand-dark mb-6" style={{ fontFamily: 'var(--font-inter)' }}>
              Speak to Translate
            </h2>

            {/* Recording Button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-semibold transition-all duration-300 ${
                  isRecording
                    ? 'bg-red-500 animate-pulse shadow-red-200'
                    : 'bg-brand-orange hover:bg-orange-600 shadow-lg hover:shadow-xl'
                }`}
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {isRecording ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C10.896 2 10 2.896 10 4V12C10 13.104 10.896 14 12 14C13.104 14 14 13.104 14 12V4C14 2.896 13.104 2 12 2Z"/>
                    <path d="M19 10V12C19 16.418 15.418 20 11 20H10C9.447 20 9 20.447 9 21S9.447 22 10 22H11C16.523 22 21 17.523 21 12V10C21 9.447 20.553 9 20 9S19 9.447 19 10Z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Transcript Display */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-medium text-brand-dark mb-3" style={{ fontFamily: 'var(--font-inter)' }}>
                Spoken Text:
              </h3>
              <p className="text-gray-700 text-lg min-h-[3rem] flex items-center" style={{ fontFamily: 'var(--font-inter)' }}>
                {transcript || 'Click the microphone to start speaking...'}
              </p>
            </div>
          </div>

          {/* Translation Output */}
          <div className="bg-gradient-to-br from-brand-orange to-orange-500 rounded-2xl shadow-lg p-8 text-white">
            <h2 className="text-2xl font-semibold mb-6" style={{ fontFamily: 'var(--font-inter)' }}>
              Sign Language Translation
            </h2>

            <div className="bg-white bg-opacity-10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-6xl mb-4 text-center min-h-[4rem] flex items-center justify-center">
                {translation || '🎭'}
              </div>
              <p className="text-center text-lg opacity-90" style={{ fontFamily: 'var(--font-inter)' }}>
                {translation || 'Translation will appear here...'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8 justify-center">
              <button className="bg-white text-brand-orange px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                Save Translation
              </button>
              <button className="bg-white bg-opacity-20 text-white px-6 py-3 rounded-lg font-medium hover:bg-opacity-30 transition-colors">
                Play Animation
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C10.896 2 10 2.896 10 4V12C10 13.104 10.896 14 12 14C13.104 14 14 13.104 14 12V4C14 2.896 13.104 2 12 2Z"/>
                  <path d="M19 10V12C19 16.418 15.418 20 11 20H10C9.447 20 9 20.447 9 21S9.447 22 10 22H11C16.523 22 21 17.523 21 12V10C21 9.447 20.553 9 20 9S19 9.447 19 10Z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
                Voice Recognition
              </h3>
              <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                Advanced AI-powered speech recognition with high accuracy
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                  <path d="M2 17L12 22L22 17"/>
                  <path d="M2 12L12 17L22 12"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
                Real-time Translation
              </h3>
              <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                Instant conversion to sign language gestures and animations
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-inter)' }}>
                Multiple Languages
              </h3>
              <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                Support for multiple spoken languages with regional variations
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
