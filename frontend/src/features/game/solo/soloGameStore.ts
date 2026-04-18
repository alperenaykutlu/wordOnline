import { create } from 'zustand';
import { LetterState, GameStatus, type GuessRow, type SoloGameState } from '../shared/types/game.types';

interface SoloGameStore extends SoloGameState {
  // Actions
  initGame:        (params: InitGameParams) => void;
  addLetter:       (letter: string) => void;
  removeLetter:    () => void;
  applyGuessResult:(result: GuessResultData) => void;
  setError:        (error: string | null) => void;
  setCompleted:    () => void;
  reset:           () => void;
}

interface InitGameParams {
  roomId:           string;
  wordLength:       number;
  firstLetter:      string;
  maxAttempts:      number;
  timeLimitSeconds: number;
}

interface GuessResultData {
  letterStates:      LetterState[];
  scoreEarned:       number;
  totalScore:        number;
  remainingAttempts: number;
  isCorrect:         boolean;
  isGameOver:        boolean;
}

const emptyRow = (wordLength: number): GuessRow => ({
  letters:      Array(wordLength).fill(''),
  letterStates: Array(wordLength).fill(LetterState.Pending),
  scoreEarned:  0,
  attemptNumber:0,
  isSubmitted:  false,
});

const initialState: SoloGameState = {
  roomId:            '',
  wordLength:        5,
  firstLetter:       '',
  maxAttempts:       6,
  timeLimitSeconds:  60,
  guessRows:         [],
  currentGuess:      '',
  totalScore:        0,
  remainingAttempts: 6,
  status:            GameStatus.WaitingForPlayers,
  error:             null,
};

export const useSoloGameStore = create<SoloGameStore>((set, get) => ({
  ...initialState,

  initGame: (params) => {
    const rows = Array(params.maxAttempts)
      .fill(null)
      .map(() => emptyRow(params.wordLength));

    // İlk harf otomatik yerleştirilir ve değiştirilemez
    if (rows[0]) {
      rows[0].letters[0] = params.firstLetter.toUpperCase();
    }

    set({
      ...params,
      guessRows:        rows,
      currentGuess:     params.firstLetter.toUpperCase(),
      remainingAttempts:params.maxAttempts,
      totalScore:       0,
      status:           GameStatus.InProgress,
      error:            null,
    });
  },

  addLetter: (letter) => {
    const { currentGuess, wordLength, status } = get();
    if (status !== GameStatus.InProgress) return;
    if (currentGuess.length >= wordLength) return;

    // İlk harf (index 0) kilitli — kullanıcı değiştiremez
    const next = currentGuess + letter.toUpperCase();
    set({ currentGuess: next });

    // Aktif satırdaki görsel güncelleme
    set((s) => {
      const rows = [...s.guessRows];
      const rowIndex = s.maxAttempts - s.remainingAttempts;
      if (rowIndex < rows.length) {
        const row = { ...rows[rowIndex], letters: [...rows[rowIndex].letters] };
        row.letters[next.length - 1] = next[next.length - 1];
        rows[rowIndex] = row;
      }
      return { guessRows: rows };
    });
  },

  removeLetter: () => {
    const { currentGuess } = get();
    // İlk harfin gerisine gidemez
    if (currentGuess.length <= 1) return;

    const next = currentGuess.slice(0, -1);
    set({ currentGuess: next });

    set((s) => {
      const rows = [...s.guessRows];
      const rowIndex = s.maxAttempts - s.remainingAttempts;
      if (rowIndex < rows.length) {
        const row = { ...rows[rowIndex], letters: [...rows[rowIndex].letters] };
        row.letters[currentGuess.length - 1] = '';
        rows[rowIndex] = row;
      }
      return { guessRows: rows };
    });
  },

  applyGuessResult: (result) => {
    set((s) => {
      const rows = [...s.guessRows];
      const rowIndex = s.maxAttempts - s.remainingAttempts;

      if (rowIndex < rows.length) {
        rows[rowIndex] = {
          ...rows[rowIndex],
          letterStates: result.letterStates,
          scoreEarned:  result.scoreEarned,
          attemptNumber:rowIndex + 1,
          isSubmitted:  true,
        };
      }

      // Sonraki satır için ilk harfi yerleştir
      if (!result.isGameOver && rowIndex + 1 < rows.length) {
        const nextRow = { ...rows[rowIndex + 1], letters: [...rows[rowIndex + 1].letters] };
        nextRow.letters[0] = s.firstLetter;
        rows[rowIndex + 1] = nextRow;
      }

      return {
        guessRows:        rows,
        totalScore:       result.totalScore,
        remainingAttempts:result.remainingAttempts,
        currentGuess:     result.isGameOver ? s.currentGuess : s.firstLetter,
        status:           result.isGameOver ? GameStatus.Completed : GameStatus.InProgress,
      };
    });
  },

  setError: (error) => set({ error }),

  setCompleted: () => set({ status: GameStatus.Completed }),

  reset: () => set(initialState),
}));
