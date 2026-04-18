import { useCallback, useEffect, useState } from 'react';
import { useSoloGameStore }from './soloGameStore';
import { gameApi }         from '../shared/api/gameApi';
import { GameStatus, type KeyboardLetterState, LetterState } from '../shared/types/game.types';

interface UseSoloGameOptions {
  wordLength: number;
}

export const useSoloGame = ({ wordLength }: UseSoloGameOptions) => {
  const store    = useSoloGameStore();

  const [keyboardStates, setKeyboardStates] = useState<KeyboardLetterState>({});
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [resultMessage,  setResultMessage]  = useState<string | null>(null);

  // ── Oyunu başlat ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const result = await gameApi.startSoloGame(wordLength);
        if (cancelled) return;
        store.initGame({
          roomId:           result.roomId,
          wordLength:       result.wordLength,
          firstLetter:      result.firstLetter,
          maxAttempts:      result.maxAttempts,
          timeLimitSeconds: result.timeLimitSeconds,
        });
      } catch (err: any) {
        if (!cancelled)
          store.setError('Oyun başlatılamadı. Lütfen tekrar deneyin.');
      }
    };

    start();
    return () => { cancelled = true; };
  }, [wordLength]);

  // ── Klavye durumu güncelle ────────────────────────────
  const updateKeyboardStates = useCallback((
    word: string,
    letterStates: LetterState[]
  ) => {
    setKeyboardStates(prev => {
      const updated = { ...prev };
      word.split('').forEach((letter, i) => {
        const current = updated[letter];
        const incoming = letterStates[i];
        // Daha iyi bir durum varsa üstüne yazma
        // Correct > WrongPosition > NotFound > Pending
        const priority = (s: LetterState) =>
          s === LetterState.Correct ? 3
          : s === LetterState.WrongPosition ? 2
          : s === LetterState.NotFound ? 1
          : 0;

        if (current === undefined || priority(incoming) > priority(current))
          updated[letter] = incoming;
      });
      return updated;
    });
  }, []);

  // ── Tahmin gönder ─────────────────────────────────────
  const submitGuess = useCallback(async () => {
    const { currentGuess, wordLength: wl, status, roomId } = store;

    if (status !== GameStatus.InProgress) return;
    if (currentGuess.length < wl) {
      store.setError(`Kelime ${wl} harf olmalı.`);
      setTimeout(() => store.setError(null), 2000);
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    store.setError(null);

    try {
      const result = await gameApi.submitGuess(roomId, currentGuess);

      store.applyGuessResult(result);
      updateKeyboardStates(currentGuess, result.letterStates);

      if (result.isCorrect) {
        const bonus = result.timeBonusEarned ?? 0;
        setResultMessage(
          `🎉 Tebrikler! Kelimeyi buldunuz!\nPuan: ${result.scoreEarned}${bonus > 0 ? ` + ${bonus} süre bonusu` : ''}`
        );
      } else if (result.isGameOver) {
        setResultMessage(`😔 Hakkınız bitti. Toplam puan: ${result.totalScore}`);
      }
    } catch (err: any) {
      store.setError(err?.response?.data?.error ?? 'Tahmin gönderilemedi.');
      setTimeout(() => store.setError(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  }, [store, isSubmitting, updateKeyboardStates]);

  // ── Süre doldu ────────────────────────────────────────
  const handleTimeExpired = useCallback(async () => {
    if (store.status !== GameStatus.InProgress) return;
    store.setCompleted();
    setResultMessage('⏰ Süre doldu!');
    // API'ye timeout bildirimi
    try { await gameApi.timeExpired(store.roomId); } catch {}
  }, [store]);

  return {
    store,
    keyboardStates,
    isSubmitting,
    resultMessage,
    submitGuess,
    handleTimeExpired,
    addLetter:   store.addLetter,
    removeLetter:store.removeLetter,
    clearMessage:() => setResultMessage(null),
  };
};
