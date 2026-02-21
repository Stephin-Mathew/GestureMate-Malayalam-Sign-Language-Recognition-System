import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import Navigation from '../components/Navigation';
import HeaderSection from '../components/HeaderSection';
import StatsCard from '../components/StatsCard';
import FeatureCard from '../components/FeatureCard';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for Clerk to load authentication state
    if (isLoaded) {
      if (!isSignedIn) {
        router.push('/login');
        return;
      }

      // Simulate loading
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn, router]);

  const handleFeatureClick = (feature) => {
    switch (feature) {
      case 'sign-recognition':
        router.push('/sign-recognition');
        break;
      case 'voice-translation':
        // Voice translation is now a tab inside sign-recognition
        router.push('/sign-recognition?mode=voice');
        break;
      default:
        break;
    }
  };

  // Show loading while Clerk is loading or user is not authenticated
  if (!isLoaded || !isSignedIn) {
    return <Loading />;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="w-full max-w-[1440px] mx-auto">
        {/* Header Section and Stats Card Row */}
        <div className="relative px-8 pt-6">
          <div className="flex gap-4 items-start">
            {/* Header Section */}
            <div className="flex-1">
              <HeaderSection />
            </div>

            {/* Stats Card */}
            <div className="mt-24">
              <StatsCard />
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              title="Sign Recognition"
              description="Real-time sign language to text translation using advanced AI and computer vision technology"
              imageSrc="/images/sign-recognition-icon.svg"
              onClick={() => handleFeatureClick('sign-recognition')}
            />
            <FeatureCard
              title="Custom Training"
              description="Learn sign language at your own pace with interactive lessons and real-time feedback"
              imageSrc="/images/custom-training-icon.svg"
            />
            <FeatureCard
              title="Learning"
              description="Comprehensive sign language learning modules with progress tracking and interactive exercises"
              imageSrc="/images/learning-icon.svg"
            />
            <FeatureCard
              title="Voice Translation"
              description="Speak Malayalam and convert it to text using advanced voice recognition, then play it back with TTS"
              imageSrc="/images/voice-translation-icon.svg"
              onClick={() => handleFeatureClick('voice-translation')}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
