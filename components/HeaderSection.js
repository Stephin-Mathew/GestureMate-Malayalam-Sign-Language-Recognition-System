import { useUser } from '@clerk/nextjs';

const HeaderSection = () => {
  const { user } = useUser();
  const displayName = user?.firstName || user?.fullName || user?.username || 'User';

  return (
    <div className="bg-white rounded-3xl p-8 mx-8 mt-24 relative overflow-hidden">
      {/* Background decorative element */}
      <div className="absolute -top-7 -left-7 w-[1350px] h-[305px] bg-brand-orange rounded-full opacity-10"></div>

      {/* Notification Icon */}
      <div className="absolute top-[54px] right-[163px] w-11 h-12 bg-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C10.896 2 10 2.896 10 4V5.586L8.707 6.879C8.317 7.269 8.317 7.902 8.707 8.293L10 9.586V20H14V9.586L15.293 8.293C15.683 7.902 15.683 7.269 15.293 6.879L14 5.586V4C14 2.896 13.104 2 12 2Z" fill="#F97316"/>
        </svg>
      </div>

      {/* Notification Badge */}
      <div className="absolute top-[54px] right-[157px] w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">8+</span>
      </div>

      {/* Profile Image */}
      <div className="absolute top-[31px] right-[26px] w-28 h-28 bg-gray-300 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg">
        <img
          src="/images/profile-image.svg"
          alt="Profile"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="w-full h-full bg-brand-orange flex items-center justify-center text-white text-xl font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Date */}
      <div className="text-2xl font-bold text-brand-dark mb-4" style={{ fontFamily: 'var(--font-work-sans)' }}>
        {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      </div>

      {/* Welcome Message */}
      <div className="mb-8">
        <h1 className="text-5xl font-semibold text-brand-dark mb-4" style={{ fontFamily: 'var(--font-work-sans)', letterSpacing: '4.5%' }}>
          Hello, {displayName}
        </h1>

        {/* Quote */}
        <div className="text-2xl font-bold text-brand-dark" style={{ fontFamily: 'var(--font-work-sans)', letterSpacing: '-3.5%' }}>
          life is not going stuck ,<br />
          our decision makes it stuck
        </div>
      </div>
    </div>
  );
};

export default HeaderSection;
