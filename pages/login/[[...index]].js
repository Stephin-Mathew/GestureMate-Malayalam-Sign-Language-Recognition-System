import { SignIn } from '@clerk/nextjs';

const Login = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-orange to-orange-400 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-dark" style={{ fontFamily: 'var(--font-work-sans)' }}>
            SignLearn
          </h1>
          <p className="text-gray-600 mt-2" style={{ fontFamily: 'var(--font-inter)' }}>
            Welcome back! Please sign in to continue.
          </p>
        </div>

        <SignIn
          path="/login"
          routing="path"
          signUpUrl="/signup"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-brand-orange hover:bg-orange-600 text-white',
              card: 'shadow-none p-0',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton: 'border-gray-300 hover:bg-gray-50',
              formFieldInput: 'border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-orange focus:border-transparent',
              footerActionLink: 'text-brand-orange hover:underline',
            },
            layout: {
              socialButtonsPlacement: 'bottom',
              socialButtonsVariant: 'blockButton',
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;
