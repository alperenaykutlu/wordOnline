import { apiClient } from '@shared/api/apiClient';

// ── Types ─────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank:      number;
  userId:    string;
  username:  string;
  score:     number;
  winCount:  number;
  lossCount: number;
}

export interface LeaderboardResult {
  playerRank:   number;
  playerScore:  number;
  totalPlayers: number;
  entries:      LeaderboardEntry[];
  hasMore:      boolean;
}

export interface MatchHistoryItem {
  roomId:           string;
  mode:             number;
  isWinner:         boolean;
  finalScore:       number;
  opponentUsername: string | null;
  opponentScore:    number | null;
  playedAt:         string;
  roundsPlayed:     number;
  totalGuesses:     number;
}

export interface ProfileResult {
  userId:                   string;
  username:                 string;
  totalScore:               number;
  winCount:                 number;
  lossCount:                number;
  globalRank:               number;
  usernameChangesRemaining: number;
  isOwnProfile:             boolean;
}

// ── API ───────────────────────────────────────────────────
export const leaderboardApi = {
  getLeaderboard: async (
    playerContextOnly = true,
    page     = 1,
    pageSize = 20
  ): Promise<LeaderboardResult> => {
    const { data } = await apiClient.get<LeaderboardResult>('/leaderboard', {
      params: { playerContextOnly, page, pageSize },
    });
    return data;
  },

  getMatchHistory: async (count = 5): Promise<MatchHistoryItem[]> => {
    const { data } = await apiClient.get<MatchHistoryItem[]>(
      '/leaderboard/match-history',
      { params: { count } }
    );
    return data;
  },

  getMyProfile: async (): Promise<ProfileResult> => {
    const { data } = await apiClient.get<ProfileResult>('/leaderboard/profile/me');
    return data;
  },

  getProfile: async (userId: string): Promise<ProfileResult> => {
    const { data } = await apiClient.get<ProfileResult>(`/leaderboard/profile/${userId}`);
    return data;
  },
};
