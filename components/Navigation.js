import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import { useTheme } from '../context/ThemeContext';

const Navigation = () => {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { darkMode, toggleDarkMode } = useTheme();

  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setScrolled(current > 20);
      if (current < 10) {
        setVisible(true);
      } else if (current > lastScrollY.current + 4) {
        setVisible(false);
      } else if (current < lastScrollY.current - 4) {
        setVisible(true);
      }
      lastScrollY.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Sign Recognition', href: '/sign-recognition' },
    { name: 'Game', href: '/game-hub' },
    { name: 'Learning', href: '/learning' },
  ];

  const isActive = (href) => {
    if (href === '/') return router.pathname === '/';
    return router.pathname.startsWith(href) ||
      (href === '/game-hub' && router.pathname === '/game');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .nav-root {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 200;
          display: flex;
          justify-content: center;
          padding: 12px 24px;
          pointer-events: none;
          transition: transform 0.32s cubic-bezier(0.4,0,0.2,1);
        }
        .nav-root.hidden { transform: translateY(-110%); }

        .nav-bar {
          pointer-events: all;
          width: 100%;
          max-width: 1280px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6px 0 12px;
          height: 72px;
          border-radius: 18px;
          background: var(--nav-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--nav-border);
          box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
          transition: box-shadow 0.3s ease, background 0.3s ease;
        }
        .nav-bar.scrolled {
          background: var(--nav-bg-scrolled);
          box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.07);
        }

        /* ── Logo ── */
        .nav-logo {
          display: flex;
          align-items: center;
          text-decoration: none;
          flex-shrink: 0;
          margin-right: 8px;
        }
        .nav-logo img {
          height: 120px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        /* ── Links pill container ── */
        .nav-links {
          display: flex;
          align-items: center;
          gap: 2px;
          background: var(--nav-links-bg);
          border-radius: 12px;
          padding: 4px;
        }

        .nav-link {
          position: relative;
          padding: 7px 16px;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          color: var(--muted-text);
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.18s ease, background 0.18s ease;
          cursor: pointer;
        }
        .nav-link:hover {
          color: #F97316;
          background: rgba(249,115,22,0.08);
        }
        .nav-link.active {
          background: var(--nav-link-active-bg);
          color: #F97316;
          font-weight: 600;
          box-shadow: 0 1px 6px rgba(0,0,0,0.08), 0 0 0 1px rgba(249,115,22,0.15);
        }

        /* ── Right side actions ── */
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        /* ── Theme Toggle ── */
        .nav-theme-toggle {
          width: 70px;
          height: 38px;
          border-radius: 19px;
          border: 1.5px solid var(--card-border);
          background: var(--subtle-bg);
          display: flex;
          align-items: center;
          padding: 3px;
          cursor: pointer;
          position: relative;
          transition: background 0.3s ease, border-color 0.3s ease;
          flex-shrink: 0;
        }
        .nav-theme-toggle:hover {
          border-color: rgba(249,115,22,0.4);
          background: var(--nav-links-bg);
        }
        .nav-theme-knob {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.32s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease;
          position: absolute;
          left: 3px;
          font-size: 14px;
          line-height: 1;
        }
        .nav-theme-knob.dark {
          transform: translateX(32px);
          background: #1e1e2e;
        }
        .nav-theme-track-icons {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0 6px 0 8px;
          pointer-events: none;
          font-size: 12px;
        }

        /* Login */
        .nav-login {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 20px;
          background: #F97316;
          color: #fff !important;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          border-radius: 11px;
          text-decoration: none;
          box-shadow: 0 2px 10px rgba(249,115,22,0.35);
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .nav-login:hover {
          background: #E86A0A;
          box-shadow: 0 4px 18px rgba(249,115,22,0.45);
          transform: translateY(-1px);
        }

        /* User avatar wrapper */
        .nav-user {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          overflow: hidden;
          border: 1px solid var(--card-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className={`nav-root${visible ? '' : ' hidden'}`}>
        <div className={`nav-bar${scrolled ? ' scrolled' : ''}`}>

          {/* Logo */}
          <Link href="/" className="nav-logo">
            <img src="/images/GestureMate Logo.png" alt="GestureMate" />
          </Link>

          {/* Nav Links — pill group */}
          <div className="nav-links">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-link${isActive(item.href) ? ' active' : ''}`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="nav-actions">

            {/* Dark / Light mode toggle */}
            <button
              className="nav-theme-toggle"
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {/* Track icons (faint, always visible) */}
              <div className="nav-theme-track-icons">
                <span style={{ opacity: darkMode ? 0.3 : 1, transition: 'opacity 0.3s', fontSize: 13 }}>☀️</span>
                <span style={{ opacity: darkMode ? 1 : 0.3, transition: 'opacity 0.3s', fontSize: 13 }}>🌙</span>
              </div>
              {/* Sliding knob */}
              <span className={`nav-theme-knob${darkMode ? ' dark' : ''}`}>
                {darkMode ? '🌙' : '☀️'}
              </span>
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 26, background: 'var(--divider)', margin: '0 2px' }} />

            {/* Auth */}
            {isSignedIn ? (
              <div className="nav-user">
                <UserButton appearance={{ elements: { avatarBox: { width: 36, height: 36 } } }} />
              </div>
            ) : (
              <Link href="/login" className="nav-login">
                Sign In
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Spacer so page content starts below the floating nav */}
      <div style={{ height: 84 }} />
    </>
  );
};

export default Navigation;
