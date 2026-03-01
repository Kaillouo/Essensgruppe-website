import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';
import { User } from '../types';

interface DailyClaimResponse {
  claimed: boolean;
  newBalance?: number;
  nextClaimIn?: number;
  lastDailyClaim?: string;
}

export const DailyCoinsClaim = ({
  onClaimed,
  autoClaim = false
}: {
  onClaimed?: (newBalance: number) => void;
  autoClaim?: boolean;
}) => {
  const { user, updateUser } = useAuth();
  const [canClaim, setCanClaim] = useState(true);
  const [nextClaimMs, setNextClaimMs] = useState(0);
  const [nextClaimAt, setNextClaimAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const getTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Derive canClaim and absolute deadline from the lastDailyClaim timestamp
  useEffect(() => {
    if (user?.lastDailyClaim) {
      const claimAt = new Date(user.lastDailyClaim).getTime() + 24 * 60 * 60 * 1000;
      const remaining = claimAt - Date.now();
      if (remaining > 0) {
        setCanClaim(false);
        setNextClaimAt(claimAt);
        setNextClaimMs(remaining);
      } else {
        setCanClaim(true);
        setNextClaimAt(0);
        setNextClaimMs(0);
      }
    } else {
      setCanClaim(true);
      setNextClaimAt(0);
      setNextClaimMs(0);
    }
  }, [user?.lastDailyClaim]);

  // Tick against the absolute deadline so the display stays accurate
  // even when the browser throttles timers in background tabs
  useEffect(() => {
    if (canClaim || nextClaimAt === 0) return;

    const interval = setInterval(() => {
      const remaining = nextClaimAt - Date.now();
      if (remaining <= 0) {
        setCanClaim(true);
        setNextClaimMs(0);
        setNextClaimAt(0);
      } else {
        setNextClaimMs(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [canClaim, nextClaimAt]); // stable deps — does NOT restart every second

  const handleClaim = async () => {
    if (!canClaim || loading) return;

    setLoading(true);
    try {
      const response = await ApiService.request<DailyClaimResponse>(
        '/users/daily-claim',
        { method: 'POST', body: JSON.stringify({}) },
        true
      );

      if (response.claimed && user) {
        setClaimed(true);
        updateUser({ ...user, balance: response.newBalance ?? user.balance, lastDailyClaim: response.lastDailyClaim } as User);
        onClaimed?.(response.newBalance ?? 0);
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
