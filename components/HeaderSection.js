import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

const HeaderSection = () => {
  const { user } = useUser();
  const displayName = user?.firstName || user?.fullName?.split(' ')[0] || 'User';

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div style={{
      background: 'var(--hero-bg)',
      borderRadius: 24,
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      paddingLeft: 48,
      overflow: 'hidden',
      height: 300,
      border: '1px solid var(--card-border)',
    }}>

      {/* ── LEFT: Text content ── */}
      <div style={{
        flex: '0 0 auto',
        maxWidth: 420,
        padding: '40px 0 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <p style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#F97316',
          fontFamily: 'Inter, sans-serif',
          margin: '0 0 6px',
        }}>
          {formattedDate}
        </p>

        <h1 style={{
          fontSize: 54,
          fontWeight: 800,
          color: 'var(--foreground)',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.05,
          margin: '0 0 14px',
        }}>
          Hello, {displayName}
        </h1>

        <p style={{
          fontSize: 14.5,
          color: 'var(--muted-text)',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.65,
          margin: '0 0 30px',
          maxWidth: 360,
        }}>
          Empowering communication through Malayalam Sign Language,{' '}
          in collaboration with NISH Institute, Trivandrum.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/sign-recognition" style={{
            background: '#F97316',
            color: '#fff',
            padding: '12px 26px',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 15,
            fontFamily: 'Inter, sans-serif',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}>
            Get Started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <Link href="/learning" style={{
            background: 'transparent',
            color: 'var(--foreground)',
            padding: '12px 22px',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 15,
            fontFamily: 'Inter, sans-serif',
            textDecoration: 'none',
            border: '1.5px solid var(--card-border)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}>
            Learn More
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* ── RIGHT: Hero card image ── */}
      <img
        src="/images/herocard.png"
        alt="Hero Card"
        style={{
          height: '100%',
          width: 'auto',
          objectFit: 'contain',
          objectPosition: 'bottom right',
          display: 'block',
          flexShrink: 0,
        }}
      />
    </div>
  );
};

export default HeaderSection;
