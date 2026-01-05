const FeatureCard = ({ title, description, buttonText = "Start Now", imageSrc, onClick }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-[327px] flex flex-col hover:shadow-xl transition-shadow duration-300">
      {/* Icon/Image */}
      <div className="w-full h-[240px] bg-brand-orange rounded-xl mb-6 flex items-center justify-center overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-contain p-4"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-brand-orange text-2xl font-bold">
          {title.charAt(0)}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-semibold text-brand-dark mb-4" style={{ fontFamily: 'var(--font-inter)', letterSpacing: '1%' }}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-lg text-brand-dark mb-6 flex-grow leading-relaxed" style={{ fontFamily: 'var(--font-inter)', lineHeight: '1.39' }}>
        {description}
      </p>

      {/* Button */}
      <button
        onClick={onClick}
        className="bg-background-2 text-brand-dark px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors w-fit cursor-pointer"
        style={{ fontFamily: 'var(--font-glory)' }}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default FeatureCard;
