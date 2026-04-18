import { useState, useEffect, useRef, useCallback } from 'react';

// ── useDebounce ───────────────────────────────────────────
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── useThrottle ───────────────────────────────────────────
export function useThrottle<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  const lastCall  = useRef<number>(0);
  const timeoutRef= useRef<ReturnType<typeof setTimeout>>();
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      fn(...args);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => { lastCall.current = Date.now(); fn(...args); }, delay - (now - lastCall.current));
    }
  }, [fn, delay]) as T;
}

// ── useNetworkStatus ──────────────────────────────────────
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      unsubscribe = NetInfo.addEventListener((state: any) => setIsConnected(state.isConnected ?? true));
    } catch { /* package yoksa ignore */ }
    return () => unsubscribe?.();
  }, []);
  return { isConnected };
}

// ── useModal ──────────────────────────────────────────────
export { useModal, useConfirm } from './useModal';
