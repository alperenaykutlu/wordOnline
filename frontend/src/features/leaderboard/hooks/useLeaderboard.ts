import { useState, useEffect, useCallback, useRef } from 'react';
import { leaderboardApi, type LeaderboardResult } from '../api/leaderboardApi';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/store';

interface UseLeaderboardReturn {
  data:         LeaderboardResult | null;
  isLoading:    boolean;
  isLoadingMore:boolean;
  error:        string | null;
  playerRank:   number;
  refresh:      () => Promise<void>;
  loadMore:     () => Promise<void>;
  expandTable:  () => void;
  isExpanded:   boolean;
}

export const useLeaderboard = (): UseLeaderboardReturn => {
  const userId = useSelector((s: RootState) => s.auth.userId);

  const [data,          setData]         = useState<LeaderboardResult | null>(null);
  const [isLoading,     setIsLoading]    = useState(true);
  const [isLoadingMore, setIsLoadingMore]= useState(false);
  const [error,         setError]        = useState<string | null>(null);
  const [isExpanded,    setIsExpanded]   = useState(false);
  const [page,          setPage]         = useState(1);

  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  const fetchContext = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await leaderboardApi.getLeaderboard(true);
      if (isMounted.current) setData(result);
    } catch {
      if (isMounted.current) setError('Liderlik tablosu yüklenemedi.');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchContext(); }, [fetchContext]);

  // Tablo büyütüldüğünde tam sayfalı listeye geç
  const expandTable = useCallback(async () => {
    setIsExpanded(true);
    setIsLoading(true);
    try {
      const result = await leaderboardApi.getLeaderboard(false, 1, 20);
      if (isMounted.current) {
        setData(result);
        setPage(1);
      }
    } catch {
      if (isMounted.current) setError('Liste yüklenemedi.');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  // Scroll ile daha fazla yükle
  const loadMore = useCallback(async () => {
    if (!data?.hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const result = await leaderboardApi.getLeaderboard(false, nextPage, 20);
      if (isMounted.current) {
        setData(prev => prev
          ? { ...result, entries: [...prev.entries, ...result.entries] }
          : result
        );
        setPage(nextPage);
      }
    } catch {
      if (isMounted.current) setError('Daha fazla yüklenemedi.');
    } finally {
      if (isMounted.current) setIsLoadingMore(false);
    }
  }, [data?.hasMore, isLoadingMore, page]);

  return {
    data,
    isLoading,
    isLoadingMore,
    error,
    playerRank:  data?.playerRank ?? 0,
    refresh:     fetchContext,
    loadMore,
    expandTable,
    isExpanded,
  };
};
