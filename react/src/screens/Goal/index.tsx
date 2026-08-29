import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, CheckCircle2 } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useApi, errorMessage } from '@/lib/useApi';
import { useAuth } from '@/state/AuthContext';
import { formatSparks } from '@/lib/money';
import { Loading } from '@/components/Feedback';
import { ProgressTrack } from '@/components/system/ProgressTrack';
import { Button } from '@/components/ui/button';
import { ProductVisual } from '@/components/commerce/ProductVisual';

/**
 * The goal loop in warm luxury bento styling.
 */
export const GoalScreen: React.FC = () => {
  const navigate = useNavigate();
  const { refreshWallet } = useAuth();
  const goals = useApi(() => api.goals.active(), []);
  const [dropping, setDropping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const goal = goals.data?.goal ?? null;

  async function dropGoal() {
    setError(null);
    setDropping(true);
    try {
      await api.goals.drop();
      await refreshWallet();
      goals.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDropping(false);
    }
  }

  if (goals.loading && !goals.data) return <Loading label="LOADING GOAL" />;

  if (!goal) {
    return (
      <section className="bento-card mx-auto max-w-md p-10 text-center">
        <div className="mb-4 flex justify-center text-[#FDB827]">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF5D6] text-[#D97706] shadow-sm">
            <Target size={32} />
          </span>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-[#191B1D]">No Goal Set Yet</h1>
        <p className="mt-2 mb-6 text-sm text-[#666057]">
          Pick a dream reward to chase, and every match you win will pull you closer.
        </p>
        <Button variant="gold" onClick={() => navigate('/store')}>
          Browse Rewards Store
        </Button>
      </section>
    );
  }

  const sessionsToGoal = Math.ceil(goal.remainingSparks / 150);
  const reached = goal.remainingSparks === 0;

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="bento-card p-8 text-center bg-gradient-to-b from-white via-white to-[#FFFDF5]">
        <div className="mb-4 flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF5D6] text-[#D97706] shadow-sm">
            <Target size={30} />
          </span>
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#9B9489] mb-2">
          Your Active Spark Goal
        </div>

        <div className="mx-auto mb-6 flex max-w-sm items-center gap-4 rounded-2xl border border-[#E6DFD2] bg-[#FAF6EE] p-4 text-left">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E6DFD2] bg-white">
            <ProductVisual
              name={goal.productName}
              imageUrl={goal.productImage}
            />
          </div>
          <div className="min-w-0 flex-1">
            <b className="block truncate text-base font-bold text-[#191B1D]">{goal.productName}</b>
            <span className="flex items-center gap-1 text-xs font-bold text-[#D97706] mt-0.5">
              <span>✦</span> {formatSparks(goal.targetSparks)} Sparks Target
            </span>
          </div>
        </div>

        <ProgressTrack
          value={goal.progressSparks}
          max={goal.targetSparks}
          label={`${formatSparks(goal.progressSparks)} / ${formatSparks(goal.targetSparks)} SPARKS`}
          rightLabel={reached ? 'GOAL REACHED' : `${formatSparks(goal.remainingSparks)} LEFT`}
          className="mb-4"
        />

        <p className="text-sm font-semibold text-[#10B981]">
          {reached
            ? '🎉 Congratulations! Goal reached — claim your reward now.'
            : `About ${sessionsToGoal} more match victory${sessionsToGoal === 1 ? '' : 's'} to unlock this reward.`}
        </p>

        {error && <p className="mt-3 text-xs font-semibold text-[#EF4444]">{error}</p>}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/product/${goal.productId}`)}>
            View Reward Details
          </Button>
          <Button variant="ghost" disabled={dropping} onClick={() => void dropGoal()}>
            {dropping ? 'Dropping…' : 'Drop Goal'}
          </Button>
        </div>

        {reached && (
          <Link
            to={`/product/${goal.productId}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#10B981] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#059669] transition-all"
          >
            <CheckCircle2 size={15} /> Redeem Reward Now
          </Link>
        )}
      </div>
    </section>
  );
};
