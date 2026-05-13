import Link from 'next/link';

const FeatureCard = ({
  number,
  title,
  description,
  imageSrc,
  buttonText = 'Try Now',
  buttonHref = '#',
  onClick,
}) => {
  return (
    <>
      <style>{`
        .feature-card {
          background: #fff;
          border-radius: 20px;
          padding: 28px 24px 24px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          border: 1.5px solid transparent;
          transition:
            box-shadow 0.28s ease,
            transform 0.28s ease,
            border-color 0.28s ease,
            background 0.28s ease;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(249,115,22,0.04) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.28s ease;
          border-radius: 20px;
          pointer-events: none;
        }
        .feature-card:hover {
          box-shadow: 0 12px 36px rgba(249,115,22,0.18);
          transform: translateY(-6px) scale(1.015);
          border-color: rgba(249,115,22,0.35);
        }
        .feature-card:hover::before {
          opacity: 1;
        }
        .feature-card:hover .card-image {
          transform: scale(1.06);
        }
        .card-image {
          transition: transform 0.35s ease;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .card-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1.5px solid #F97316;
          color: #F97316;
          padding: 9px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          font-family: Inter, sans-serif;
          cursor: pointer;
          width: fit-content;
          text-decoration: none;
          transition:
            background 0.22s ease,
            color 0.22s ease,
            box-shadow 0.22s ease,
            transform 0.18s ease;
        }
        .card-btn:hover {
          background: #F97316;
          color: #fff;
          box-shadow: 0 4px 14px rgba(249,115,22,0.35);
          transform: translateX(3px);
        }
        .card-btn svg path {
          transition: stroke 0.22s ease;
        }
      `}</style>

      <div className="feature-card">
        {/* Number badge */}
        {number && (
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#F97316',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            marginBottom: 16,
            flexShrink: 0,
            boxShadow: '0 3px 10px rgba(249,115,22,0.3)',
          }}>
            {number}
          </div>
        )}

        {/* Icon/Image */}
        <div style={{
          width: '100%',
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <img
            src={imageSrc}
            alt={title}
            className="card-image"
          />
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#111214',
          fontFamily: 'Inter, sans-serif',
          marginBottom: 10,
        }}>
          {title}
        </h3>

        {/* Description */}
        <p style={{
          fontSize: 13.5,
          color: '#666',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.65,
          marginBottom: 24,
          flexGrow: 1,
        }}>
          {description}
        </p>

        {/* Button */}
        {onClick ? (
          <button onClick={onClick} className="card-btn">
            {buttonText}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <Link href={buttonHref} className="card-btn">
            {buttonText}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        )}
      </div>
    </>
  );
};

export default FeatureCard;
