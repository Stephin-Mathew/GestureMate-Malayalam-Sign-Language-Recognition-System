import Link from 'next/link';
import { useRouter } from 'next/router';
import { UserButton, useUser } from '@clerk/nextjs';

const Navigation = () => {
  const router = useRouter();
  const { isSignedIn, user } = useUser();

  const navItems = [
    { name: 'Home', href: '/', active: router.pathname === '/' },
    { name: 'Sign Recognition', href: '/sign-recognition', active: router.pathname === '/sign-recognition' },
    { name: 'Custom Training', href: '/custom-training', active: router.pathname === '/custom-training' },
    { name: 'Learning', href: '/learning', active: router.pathname === '/learning' },
    { name: 'Voice Translation', href: '/voice-translation', active: router.pathname === '/voice-translation' },
  ];

  return (
    <nav className="w-full bg-white shadow-nav flex items-center justify-between px-6 py-2.5">
      {/* Logo */}
      <div className="text-2xl font-bold text-brand-dark">
        SignLearn
      </div>

      {/* Navigation Items */}
      <div className="flex items-center gap-16">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`text-base font-medium transition-colors ${
              item.active
                ? 'text-brand-orange'
                : 'text-brand-dark hover:text-brand-orange'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      {/* Auth Section */}
      {isSignedIn ? (
        <div className="flex items-center gap-4">
          <span className="text-brand-dark font-medium" style={{ fontFamily: 'var(--font-inter)' }}>
            Welcome, {user?.firstName || 'User'}
          </span>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-10 h-10',
              },
            }}
          />
        </div>
      ) : (
        <Link
          href="/login"
          className="bg-brand-orange text-white px-6 py-3.5 rounded text-sm font-semibold hover:bg-orange-600 transition-colors"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Login
        </Link>
      )}
    </nav>
  );
};

export default Navigation;
