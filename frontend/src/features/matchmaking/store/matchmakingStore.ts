import { create } from 'zustand';

export type MatchmakingStatus =
  | 'idle'
  | 'searching'
  | 'matched'
  | 'cancelled'
  | 'error';

interface MatchmakingState {
  status:       MatchmakingStatus;
  roomId:       string | null;
  opponentName: string | null;
  searchSince:  Date | null;
  error:        string | null;
  mode:         'sameWord' | 'giveWord' | null;

  startSearching:(mode: 'sameWord' | 'giveWord') => void;
  setMatched:    (roomId: string, opponent: string) => void;
  setError:      (err: string) => void;
  cancel:        () => void;
  reset:         () => void;
}

export const useMatchmakingStore = create<MatchmakingState>((set) => ({
  status:       'idle',
  roomId:       null,
  opponentName: null,
  searchSince:  null,
  error:        null,
  mode:         null,

  startSearching: (mode) => set({
    status:      'searching',
    mode,
    searchSince: new Date(),
    roomId:      null,
    opponentName:null,
    error:       null,
  }),

  setMatched: (roomId, opponentName) => set({
    status:      'matched',
    roomId,
    opponentName,
  }),

  setError: (error) => set({ status: 'error', error }),

  cancel: () => set({
    status:      'cancelled',
    searchSince: null,
  }),

  reset: () => set({
    status:       'idle',
    roomId:       null,
    opponentName: null,
    searchSince:  null,
    error:        null,
    mode:         null,
  }),
}));
