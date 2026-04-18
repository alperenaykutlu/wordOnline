import { apiClient } from '@shared/api/apiClient';
import type { LetterState } from '../types/game.types';

// ── Response Types ────────────────────────────────────────
export interface StartSoloGameResponse {
  roomId:           string;
  firstLetter:      string;
  maxAttempts:      number;
  timeLimitSeconds: number;
  wordLength:       number;
}

export interface SubmitGuessResponse {
  letterStates:      LetterState[];
  scoreEarned:       number;
  totalScore:        number;
  remainingAttempts: number;
  isCorrect:         boolean;
  isGameOver:        boolean;
  timeBonusEarned:   number | null;
}

// ── API ───────────────────────────────────────────────────
export const gameApi = {
  startSoloGame: async (wordLength: number): Promise<StartSoloGameResponse> => {
    const { data } = await apiClient.post<StartSoloGameResponse>('/game/solo/start', {
      wordLength,
    });
    return data;
  },

  submitGuess: async (roomId: string, guessWord: string): Promise<SubmitGuessResponse> => {
    const { data } = await apiClient.post<SubmitGuessResponse>('/game/guess', {
      roomId,
      guessWord,
    });
    return data;
  },

  timeExpired: async (roomId: string): Promise<void> => {
    await apiClient.post('/game/timeout', { roomId });
  },

  assignWord: async (roomId: string, word: string) => {
    const { data } = await apiClient.post('/game/assign-word', { roomId, word });
    return data;
  },
};
