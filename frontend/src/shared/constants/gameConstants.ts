export const GAME_CONSTANTS = {
  // Puan sistemi
  SCORE: {
    CORRECT_POSITION:  10,   // Yeşil
    WRONG_POSITION:     5,   // Sarı
    NOT_FOUND:          0,   // Gri
    LOSS_PENALTY:     -20,   // Raunt kaybı
    TIME_BONUS_MAX:    20,   // Kalan süre bonusu
  },

  // Solo oyun
  SOLO: {
    TIME_LIMIT_SECONDS: 60,
    WORD_MIN_LENGTH:     4,
    WORD_MAX_LENGTH:     8,
  },

  // Ecurie (Online) oyun
  ECURIE: {
    TOTAL_ROUNDS:        5,
    TIME_LIMIT_SECONDS: 90,
  },

  // Timer — kritik süre eşiği (animasyon + ses)
  CRITICAL_TIME_SECONDS: 10,

  // Son maç gösterimi
  MATCH_HISTORY_COUNT: 5,

  // Leaderboard context
  LEADERBOARD_CONTEXT_SIZE: 10, // Oyuncunun etrafındaki ±10 kişi
} as const;

export const LETTER_STATE = {
  IDLE:           'idle',
  CORRECT:        'correct',       // Yeşil
  WRONG_POSITION: 'wrong_position', // Sarı
  NOT_FOUND:      'not_found',     // Gri
} as const;

export type LetterState = typeof LETTER_STATE[keyof typeof LETTER_STATE];
