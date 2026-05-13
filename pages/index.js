import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import Navigation from '../components/Navigation';
import HeaderSection from '../components/HeaderSection';
import FeatureCard from '../components/FeatureCard';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

export default function Home() {
  const { isLoaded } = useAuth();
  const router = useRouter();

  // Show loading while Clerk is initialising
  if (!isLoaded) {
    return <Loading />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}

      <main style={{ flex: 1, maxWidth: 1280, margin: '0 auto', width: '100%', padding: '24px 32px 0' }}>

        {/* Hero / Header Section */}
        <HeaderSection />

        {/* Feature Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          padding: '32px 0 32px',
        }}>
          {/* 01 - Sign Recognition */}
          <FeatureCard
            number="01"
            title="Sign Recognition"
            description="Real-time sign language to text translation using advanced AI and computer vision technology."
            imageSrc="/images/Sign Recognition Icon.png"
            buttonText="Try Now"
            onClick={() => router.push('/sign-recognition')}
          />

          {/* 02 - Gaming Module */}
          <FeatureCard
            number="02"
            title="Gaming Module"
            description="Learn and practice through fun games designed to improve your sign language skills."
            imageSrc="/images/Gaming Module Controller.png"
            buttonText="Play Now"
            onClick={() => router.push('/custom-training')}
          />

          {/* 03 - Learning Module */}
          <FeatureCard
            number="03"
            title="Learning Module"
            description="Explore signs by characters and watch video demonstrations to learn Malayalam Sign Language step by step."
            imageSrc="/images/Learning Module Screen.png"
            buttonText="Start Learning"
            onClick={() => router.push('/learning')}
          />

          {/* 04 - Voice & Text Tools */}
          <FeatureCard
            number="04"
            title="Voice & Text Tools"
            description="Convert speech to text and text to speech in Malayalam for seamless communication."
            imageSrc="/images/Voice Wave Icon (Small Variant).png"
            buttonText="Explore Tools"
            onClick={() => router.push('/sign-recognition?mode=voice')}
          />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
