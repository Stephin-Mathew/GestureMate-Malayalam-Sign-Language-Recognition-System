const Loading = () => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Loading Spinner */}
        <div className="relative mb-8">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin border-t-brand-orange"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-brand-orange animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>

        {/* Loading Text */}
        <h2 className="text-2xl font-semibold text-brand-dark mb-2" style={{ fontFamily: 'var(--font-work-sans)' }}>
          Loading...
        </h2>
        <p className="text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
          Please wait while we prepare your experience
        </p>
      </div>
    </div>
  );
};

export default Loading;
