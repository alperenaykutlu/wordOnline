// ── Enums ─────────────────────────────────────────────────
export enum LetterState {
  Pending       = 0,
  Correct       = 1,   // Yeşil
  WrongPosition = 2,   // Sarı
  NotFound      = 3,   // Gri
}

export enum GameMode {
  Solo     = 0,
  SameWord = 1,
  GiveWord = 2,
}

export enum GameStatus {
  WaitingForPlayers = 0,
  WaitingForWords   = 1,
  InProgress        = 2,
  Completed         = 3,
  Abandoned         = 4,
}

// ── Game State ────────────────────────────────────────────
export interface GuessRow {
  letters:      string[];
  letterStates: LetterState[];
  scoreEarned:  number;
  attemptNumber:number;
  isSubmitted:  boolean;
}

export interface SoloGameState {
  roomId:           string;
  wordLength:       number;
  firstLetter:      string;
  maxAttempts:      number;
  timeLimitSeconds: number;
  guessRows:        GuessRow[];
  currentGuess:     string;
  totalScore:       number;
  remainingAttempts:number;
  status:           GameStatus;
  error:            string | null;
}

// ── Opponent (GiveWord izleme) ────────────────────────────
export interface OpponentGuessRow {
  guessWord:        string;
  letterStates:     LetterState[];
  scoreEarned:      number;
  attemptNumber:    number;
  guessedAt:        string;
}

export interface OpponentViewState {
  opponentId:        string;
  opponentUsername:  string;
  totalScore:        number;
  remainingAttempts: number;
  isWinner:          boolean;
  isEliminated:      boolean;
  firstLetter:       string;
  wordLength:        number;
  guessHistory:      OpponentGuessRow[];
  isVisible:         boolean;   // Panel açık mı?
  isLoading:         boolean;
}

// ── Keyboard ─────────────────────────────────────────────
export interface KeyboardLetterState {
  [letter: string]: LetterState;
}

// ── SignalR Payloads ──────────────────────────────────────
export interface GuessResultPayload {
  letterStates:     LetterState[];
  scoreEarned:      number;
  totalScore:       number;
  remainingAttempts:number;
  isCorrect:        boolean;
  isGameOver:       boolean;
  timeBonusEarned:  number | null;
}

export interface OpponentGuessUpdatePayload {
  playerId:         string;
  guessWord:        string;
  letterStates:     LetterState[];
  scoreEarned:      number;
  remainingAttempts:number;
  isCorrect:        boolean;
  round:            number;
}
