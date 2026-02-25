import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api.service';

interface DailyClaimResponse {
  claimed: boolean;
  newBalance?: number;
  nextClaimIn?: number;
}

export const DailyCoinsClaim = ({
  onClaimed,
  autoClaim = false
}: {
  onClaimed?: (newBalance: number) => void;
  autoClaim?: boolean;
}) => {
  const { user, refreshUser } = useAuth();
  const [canClaim, setCanClaim] = useState(true);
  const [nextClaimMs, setNextClaimMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Calculate time remaining
  const getTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Check if user has lastDailyClaim set
  useEffect(() => {
    if (user?.lastDailyClaim) {
      const lastClaim = new Date(user.lastDailyClaim).getTime();
      const now = new Date().getTime();
      const msSinceLastClaim = now - lastClaim;
      const nextClaimTime = 24 * 60 * 60 * 1000;

      if (msSinceLastClaim < nextClaimTime) {
        setCanClaim(false);
        setNextClaimMs(nextClaimTime - msSinceLastClaim);
      } else {
        setCanClaim(true);
      }
    } else {
      setCanClaim(true);
    }
  }, [user?.lastDailyClaim]);

  // Update countdown timer
  useEffect(() => {
    if (!canClaim && nextClaimMs > 0) {
      const interval = setInterval(() => {
        setNextClaimMs((prev) => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            setCanClaim(true);
            clearInterval(interval);
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [canClaim, nextClaimMs]);

  const handleClaim = async () => {
    if (!canClaim || loading) return;

    setLoading(true);
    try {
      const response = await apiService.request<DailyClaimResponse>(
        '/users/daily-claim',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true
      );

      if (response.claimed) {
        setClaimed(true);
        await refreshUser();
        onClaimed?.(response.newBalance ?? 0);

        // Show success message - could be extended to use a toast service
        console.log('✓ Du hast 1000 Münzen erhalten!');
      } else if (response.nextClaimIn) {
        setCanClaim(false);
        setNextClaimMs(response.nextClaimIn);
      }
    } catch (error) {
      console.error('Failed to claim daily coins:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-claim on first load if enabled and can claim
  useEffect(() => {
    if (autoClaim && canClaim && !loading && !claimed) {
      handleClaim();
    }
  }, [autoClaim, canClaim]);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={handleClaim}
      disabled={!canClaim || loading}
      className={`relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
        canClaim && !loading
          ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white shadow-lg hover:shadow-yellow-500/50 hover:scale-105'
          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
      }`}
    >
      <span className="text-lg">🪙</span>
      {canClaim && !loading ? (
        <span>1000 Münzen abholen</span>
      ) : (
        <span>Wieder in {getTimeRemaining(nextClaimMs)}</span>
      )}
    </motion.button>
  );
};
