import { useEffect, useRef, useCallback, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/store';
import type {
  GuessResultPayload,
  OpponentGuessUpdatePayload,
  OpponentViewState,
} from '../types/game.types';
import { API_BASE_URL } from '@shared/constants/apiConstants';

interface UseSignalRGameOptions {
  roomId:      string;
  onGuessResult:(result: GuessResultPayload) => void;
  onGameOver?:  (finalScores: Record<string, number>) => void;
  onRoundStart? :(round: number) => void;
  gameMode?:    number;  // 2 = GiveWord
}

interface UseSignalRGameReturn {
  isConnected:    boolean;
  submitGuess:    (word: string) => Promise<void>;
  assignWord:     (word: string) => Promise<void>;
  openOpponentPanel: () => Promise<void>;
  closeOpponentPanel:() => void;
  opponentState:  OpponentViewState;
  connectionError:string | null;
}

const initialOpponentState: OpponentViewState = {
  opponentId:        '',
  opponentUsername:  '',
  totalScore:        0,
  remainingAttempts: 0,
  isWinner:          false,
  isEliminated:      false,
  firstLetter:       '',
  wordLength:        0,
  guessHistory:      [],
  isVisible:         false,
  isLoading:         false,
};

export const useSignalRGame = ({
  roomId,
  onGuessResult,
  onGameOver,
  onRoundStart,
  gameMode: _gameMode,
}: UseSignalRGameOptions): UseSignalRGameReturn => {
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);

  const connectionRef  = useRef<signalR.HubConnection | null>(null);
  const [isConnected,    setIsConnected]    = useState(false);
  const [connectionError,setConnectionError]= useState<string | null>(null);
  const [opponentState,  setOpponentState]  = useState<OpponentViewState>(initialOpponentState);

  // ── Bağlantı kur ─────────────────────────────────────
  useEffect(() => {
    if (!roomId || !accessToken) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/game?access_token=${accessToken}`)
      .withAutomaticReconnect([0, 2000, 5000, 10000]) // Bağlantı kopunca retry
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // ── Event dinleyicileri ───────────────────────────
    connection.on('GuessResult', (result: GuessResultPayload) => {
      onGuessResult(result);
    });

    connection.on('GameOver', (finalScores: Record<string, number>) => {
      onGameOver?.(finalScores);
    });

    connection.on('GameStarted', (data: { round: number }) => {
      onRoundStart?.(data.round);
    });

    // GiveWord — rakibin yeni tahmini geldi
    connection.on('OpponentGuessUpdate', (payload: OpponentGuessUpdatePayload) => {
      setOpponentState(prev => ({
        ...prev,
        totalScore:        prev.totalScore + payload.scoreEarned,
        remainingAttempts: payload.remainingAttempts,
        isWinner:          payload.isCorrect,
        guessHistory: [
          ...prev.guessHistory,
          {
            guessWord:     payload.guessWord,
            letterStates:  payload.letterStates,
            scoreEarned:   payload.scoreEarned,
            attemptNumber: prev.guessHistory.length + 1,
            guessedAt:     new Date().toISOString(),
          },
        ],
      }));
    });

    // GiveWord — panel verisi geldi (ilk yükleme)
    connection.on('OpponentView', (view: Omit<OpponentViewState, 'isVisible' | 'isLoading'>) => {
      setOpponentState(prev => ({
        ...view,
        isVisible: prev.isVisible,
        isLoading: false,
      }));
    });

    connection.on('Error', (err: { code: string; message: string }) => {
      console.warn('[SignalR] Game error:', err.code, err.message);
      setConnectionError(err.message);
      setTimeout(() => setConnectionError(null), 4000);
    });

    // Reconnect events
    connection.onreconnecting(() => setIsConnected(false));
    connection.onreconnected(async () => {
      setIsConnected(true);
      await connection.invoke('JoinRoom', roomId).catch(() => {});
    });
    connection.onclose(() => setIsConnected(false));

    // Bağlan ve odaya katıl
    connection.start()
      .then(async () => {
        setIsConnected(true);
        await connection.invoke('JoinRoom', roomId);
      })
      .catch(err => {
        console.error('[SignalR] Connection failed:', err);
        setConnectionError('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
      });

    return () => {
      connection.invoke('LeaveRoom', roomId).catch(() => {});
      connection.stop();
    };
  }, [roomId, accessToken]);

  // ── Tahmin gönder ─────────────────────────────────────
  const submitGuess = useCallback(async (word: string) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      setConnectionError('Bağlantı kesildi. Lütfen bekleyin.');
      return;
    }
    await conn.invoke('SubmitGuess', roomId, word);
  }, [roomId]);

  // ── GiveWord: kelime ata ──────────────────────────────
  const assignWord = useCallback(async (word: string) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    await conn.invoke('AssignWord', roomId, word);
  }, [roomId]);

  // ── GiveWord: rakip paneli aç ─────────────────────────
  const openOpponentPanel = useCallback(async () => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;

    setOpponentState(prev => ({ ...prev, isVisible: true, isLoading: true }));
    await conn.invoke('GetOpponentView', roomId);
  }, [roomId]);

  const closeOpponentPanel = useCallback(() => {
    setOpponentState(prev => ({ ...prev, isVisible: false }));
  }, []);

  return {
    isConnected,
    submitGuess,
    assignWord,
    openOpponentPanel,
    closeOpponentPanel,
    opponentState,
    connectionError,
  };
};
