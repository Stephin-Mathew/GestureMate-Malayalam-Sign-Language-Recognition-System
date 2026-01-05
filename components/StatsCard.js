const StatsCard = () => {
  return (
    <div className="bg-brand-orange rounded-3xl p-8 flex flex-col items-center justify-center w-[320px] h-[132px]">
      <div className="text-5xl font-light text-white mb-1" style={{ fontFamily: 'var(--font-public-sans)' }}>
        65
      </div>
      <div className="text-sm font-bold text-white uppercase tracking-wider text-center" style={{ fontFamily: 'var(--font-public-sans)' }}>
        TOTAL HOURS
      </div>
    </div>
  );
};

export default StatsCard;
