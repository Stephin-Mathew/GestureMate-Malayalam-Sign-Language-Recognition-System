const Footer = () => {
  return (
    <footer style={{
      background: 'var(--footer-bg)',
      borderTop: '1px solid var(--divider-2)',
      padding: '20px 40px',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
      }}>
        {/* Trusted & Secure */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <img
            src="/images/Security Shield Icon.png"
            alt="Trusted & Secure"
            style={{ width: 36, height: 36, objectFit: 'contain' }}
          />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
              Trusted &amp; Secure
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted-text)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
              Your privacy and data are protected
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, background: 'var(--divider-2)', flexShrink: 0 }} />

        {/* Built for Everyone */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="12" cy="10" r="4" stroke="var(--muted-text)" strokeWidth="1.8"/>
              <circle cx="22" cy="10" r="4" stroke="var(--muted-text)" strokeWidth="1.8"/>
              <path d="M2 26c0-4.4 4.5-8 10-8s10 3.6 10 8" stroke="var(--muted-text)" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M24 18c3.3.8 6 3.2 6 6" stroke="var(--muted-text)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
              Built for Everyone
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted-text)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
              Accessible, inclusive, and easy to use
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, background: 'var(--divider-2)', flexShrink: 0 }} />

        {/* Community Driven */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 24S3 17.5 3 10a6 6 0 0112 0 6 6 0 0112 0C27 17.5 14 24 14 24z" stroke="var(--muted-text)" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
              Community Driven
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted-text)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
              Together we build better communication
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
