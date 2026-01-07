import { useEffect, useRef, useState } from 'react';
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const currentAudioRef = useRef(null);

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
    if (!isLoaded || !isSignedIn || isLoading) return;

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
  }, [isLoaded, isSignedIn, isLoading]);

  useEffect(() => {
    if (!isLoaded || isLoading) return;
    if (!isSignedIn) {
      router.push('/login');
    }
  }, [isLoaded, isSignedIn, isLoading, router]);

  if (!isLoaded || !isSignedIn) {
    return <Loading />;
  }

  const handleReset = () => {
    stopAudio();
    setSentence('');
    setChar('—');
    setConfidence(0.0);
  };

  // WAV Blob converter for TTS
  const createWavBlob = (base64Data, sampleRate = 24000, numChannels = 1) => {
    const raw = atob(base64Data);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));
    for (let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }

    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const bitsPerSample = 16;
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = rawLength;
    const fileSize = 36 + dataSize;
    
    view.setUint32(0, 0x46464952, true); // 'RIFF'
    view.setUint32(4, fileSize, true);
    view.setUint32(8, 0x45564157, true); // 'WAVE'
    view.setUint32(12, 0x20746d66, true); // 'fmt '
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 0x61746164, true); // 'data'
    view.setUint32(40, dataSize, true);

    return new Blob([view, array], { type: 'audio/wav' });
  };

  // Toast notification
  const displayToast = (message, isError = false) => {
    setToastMessage(message);
    setToastIsError(isError);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Speak sentence using Gemini TTS
  const speakSentence = async () => {
    if (!sentence.trim()) {
      displayToast('No sentence to speak!', true);
      return;
    }

    if (isSpeaking) {
      stopAudio();
      return;
    }

    setIsSpeaking(true);
    displayToast('Converting text to speech...');

    try {
      const response = await fetch('/api/gemini-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence, voiceName: 'Kore' }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const audioBase64 = data?.audio?.data;
      const sampleRate = data?.audio?.sampleRate ?? 24000;
      const channels = data?.audio?.channels ?? 1;

      if (audioBase64) {
        const wavBlob = createWavBlob(audioBase64, sampleRate, channels);
        const audioUrl = URL.createObjectURL(wavBlob);
        const audio = new Audio(audioUrl);
        stopAudio();
        currentAudioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          displayToast('Playback completed');
        };

        await audio.play();
        displayToast('Playing Malayalam audio');
      } else {
        throw new Error('No audio in response');
      }
    } catch (error) {
      console.error('TTS Error:', error);
      displayToast(`Audio Error: ${error.message}`, true);
      setIsSpeaking(false);
    }
  };

  const stopAudio = () => {
    const audio = currentAudioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } finally {
        if (typeof audio.src === 'string' && audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        currentAudioRef.current = null;
      }
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

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

            <button
              onClick={speakSentence}
              className={`mt-3 w-full text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                isSpeaking ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
              style={{ fontFamily: 'var(--font-glory)' }}
            >
              <span>{isSpeaking ? '■' : '▶'}</span>
              {isSpeaking ? 'Stop Audio' : 'Speak Sentence (TTS)'}
            </button>
          </div>
        </div>
      </main>
      <Footer />

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          toastIsError ? 'bg-red-500' : 'bg-gray-800'
        } text-white text-sm font-medium`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
