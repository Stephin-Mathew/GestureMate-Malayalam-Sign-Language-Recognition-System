import { useUser } from '@clerk/nextjs';

const StatsCard = () => {
  const { user } = useUser();
  const createdAt = typeof user?.createdAt === 'number' ? user.createdAt : null;
  const totalHours = createdAt ? Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60))) : null;

  return (
    <div className="bg-brand-orange rounded-3xl p-8 flex flex-col items-center justify-center w-[320px] h-[132px]">
      <div className="text-5xl font-light text-white mb-1" style={{ fontFamily: 'var(--font-public-sans)' }}>
        {totalHours ?? '—'}
      </div>
      <div className="text-sm font-bold text-white uppercase tracking-wider text-center" style={{ fontFamily: 'var(--font-public-sans)' }}>
        TOTAL HOURS
      </div>
    </div>
  );
};

export default StatsCard;
