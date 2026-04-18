import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Modal } from 'react-native';
import { useSoloGameStore }         from '../solo/soloGameStore';
import { WordGrid }                 from '../shared/components/WordGrid/WordGrid';
import { GameKeyboard }             from '../shared/components/Keyboard/GameKeyboard';
import { CountdownTimer }           from '../shared/components/Timer/CountdownTimer';
import { OpponentPanel }            from '../shared/components/OpponentPanel/OpponentPanel';
import { useSignalRGame }           from '../shared/hooks/useSignalRGame';
import { AppButton }                from '../../../shared/components/ui/Button/AppButton';
import { InfoModal }                from '../../../shared/components/ui/Modal/InfoModal';
import { useModal }                 from '../../../shared/hooks/useModal';
import { toast }                    from '../../../shared/components/ui/Toast/Toast';
import { gameApi }                  from '../shared/api/gameApi';
import type { EcurieGameScreenProps } from '../../../app/navigation/types';
import { GameStatus, LetterState, type KeyboardLetterState } from '../shared/types/game.types';

const WordAssignModal: React.FC<{ visible: boolean; onAssign: (w: string) => void }> = ({ visible, onAssign }) => {
  const [word, setWord] = React.useState('');
  const [err,  setErr]  = React.useState<string | null>(null);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={as.overlay}>
        <View style={as.card}>
          <Text style={as.title}>Rakibine Kelime Ver</Text>
          <Text style={as.sub}>Rakibin bu kelimeyi bulmaya çalışacak.</Text>
          <View style={as.preview}>
            {Array.from({ length: Math.max(word.length, 3) }).map((_, i) => (
              <View key={i} style={[as.cell, i < word.length && as.cellFilled]}>
                <Text style={as.cellLetter}>{word[i] ?? ''}</Text>
              </View>
            ))}
          </View>
          {err && <Text style={as.err}>{err}</Text>}
          <GameKeyboard
            letterStates={{}}
            onLetter={l => { if (word.length < 8) { setWord(p => p + l); setErr(null); } }}
            onDelete={() => setWord(p => p.slice(0, -1))}
            onSubmit={() => { if (word.length < 3) { setErr('En az 3 harf gir.'); return; } onAssign(word); }}
            disabled={false}
          />
          <View style={{ marginTop: 12 }}>
            <AppButton label={word.length >= 3 ? `"${word}" gönder` : 'Kelime gir…'} onPress={() => { if (word.length < 3) { setErr('En az 3 harf gir.'); return; } onAssign(word); }} variant="success" size="md" fullWidth disabled={word.length < 3} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const as = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  card:    { backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: '#2A2A5E' },
  title:   { color: '#FFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  sub:     { color: '#7A8AAA', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  preview: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  cell:      { width: 44, height: 44, borderRadius: 8, borderWidth: 2, borderColor: '#2A2A5E', backgroundColor: '#13132A', alignItems: 'center', justifyContent: 'center' },
  cellFilled:{ borderColor: '#2980B9', backgroundColor: '#0D1A3E' },
  cellLetter:{ color: '#FFF', fontSize: 20, fontWeight: '800' },
  err:     { color: '#E74C3C', fontSize: 13, textAlign: 'center', marginBottom: 8 },
});

export const EcurieGameScreen: React.FC<EcurieGameScreenProps> = ({ route, navigation }) => {
  const { roomId, mode } = route.params;
  const isGiveWord = mode === 'giveWord';
  const store = useSoloGameStore();

  const [keyboardStates,   setKeyboardStates]   = useState<KeyboardLetterState>({});
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [currentRound,     setCurrentRound]     = useState(1);
  const [wordAssigned,     setWordAssigned]     = useState(!isGiveWord);
  const [showAssignModal,  setShowAssignModal]  = useState(isGiveWord);

  const gameOverModal = useModal<{ message: string; isWin: boolean }>();
  const roundModal    = useModal<{ round: number }>();

  const updateKeyboard = useCallback((word: string, states: LetterState[]) => {
    setKeyboardStates(prev => {
      const u = { ...prev };
      const pri = (s: LetterState) => s === LetterState.Correct ? 3 : s === LetterState.WrongPosition ? 2 : s === LetterState.NotFound ? 1 : 0;
      word.split('').forEach((l, i) => { if (u[l] === undefined || pri(states[i]) > pri(u[l])) u[l] = states[i]; });
      return u;
    });
  }, []);

  const { submitGuess: signalRSubmit, assignWord, openOpponentPanel, closeOpponentPanel, opponentState, connectionError } = useSignalRGame({
    roomId, gameMode: isGiveWord ? 2 : 1,
    onGuessResult: (result) => { store.applyGuessResult(result); updateKeyboard(store.currentGuess, result.letterStates); },
    onGameOver: (finalScores) => {
      const scores = Object.values(finalScores);
      const isWin  = (scores[0] ?? 0) >= (scores[1] ?? 0);
      gameOverModal.open({ message: isWin ? `🏆 Kazandın! Puanın: ${scores[0]}` : `😔 Kaybettin. Puanın: ${scores[0]}`, isWin });
    },
    onRoundStart: (round) => { setCurrentRound(round); store.reset(); if (isGiveWord) setShowAssignModal(true); roundModal.open({ round }); },
  });

  const handleSubmit = useCallback(async () => {
    if (store.status !== GameStatus.InProgress || isSubmitting) return;
    if (store.currentGuess.length < store.wordLength) { toast.show({ message: `Kelime ${store.wordLength} harf olmalı.`, variant: 'warning' }); return; }
    setIsSubmitting(true);
    try { await signalRSubmit(store.currentGuess); }
    catch { toast.show({ message: 'Tahmin gönderilemedi.', variant: 'error' }); }
    finally { setIsSubmitting(false); }
  }, [store, isSubmitting, signalRSubmit]);

  const handleAssignWord = useCallback(async (word: string) => {
    setShowAssignModal(false);
    try {
      await assignWord(word);
      setWordAssigned(true);
      toast.show({ message: `"${word}" rakibine gönderildi!`, variant: 'info', duration: 3500 });
    } catch { toast.show({ message: 'Kelime gönderilemedi.', variant: 'error' }); setShowAssignModal(true); }
  }, [assignWord]);

  const handleTimeExpired = useCallback(async () => {
    if (store.status !== GameStatus.InProgress) return;
    store.setCompleted();
    try { await gameApi.timeExpired(roomId); } catch {}
    toast.show({ message: '⏰ Süre doldu!', variant: 'warning' });
  }, [store, roomId]);

  const activeRowIndex = store.maxAttempts - store.remainingAttempts;
  const isGameOver     = store.status === GameStatus.Completed;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.roundText}>Raunt {currentRound}/5</Text>
          <Text style={s.modeText}>{isGiveWord ? '🔄 Kelime Ver' : '🔤 Aynı Kelime'}</Text>
        </View>
        {store.roomId
          ? <CountdownTimer totalSeconds={store.timeLimitSeconds} onExpire={handleTimeExpired} paused={isGameOver || !wordAssigned} />
          : <Text style={s.waitText}>Bekleniyor…</Text>
        }
        <View style={s.headerRight}>
          <Text style={s.scoreLabel}>PUANIM</Text>
          <Text style={s.scoreValue}>{store.totalScore}</Text>
        </View>
      </View>

      {connectionError && <View style={s.errorBanner}><Text style={s.errorText}>{connectionError}</Text></View>}

      {store.firstLetter ? (
        <View style={s.hintRow}>
          <Text style={s.hintText}>İlk harf: <Text style={s.hintLetter}>{store.firstLetter}</Text>{'  '}Kalan: <Text style={s.hintLetter}>{store.remainingAttempts}</Text></Text>
          {isGiveWord && <TouchableOpacity style={s.watchBtn} onPress={openOpponentPanel}><Text style={s.watchBtnText}>👁 Rakibi İzle</Text></TouchableOpacity>}
        </View>
      ) : (
        <View style={s.waitingBox}><Text style={s.waitingText}>{isGiveWord && !wordAssigned ? 'Rakibine kelimeni gönder…' : 'Oyun başlatılıyor…'}</Text></View>
      )}

      {store.roomId
        ? <WordGrid rows={store.guessRows} wordLength={store.wordLength} activeRowIndex={activeRowIndex} currentGuess={store.currentGuess} />
        : <View style={s.gridPlaceholder} />
      }

      <GameKeyboard letterStates={keyboardStates} onLetter={store.addLetter} onDelete={store.removeLetter} onSubmit={handleSubmit} disabled={isGameOver || isSubmitting || !store.roomId || !wordAssigned} lockedLetter={store.firstLetter} />

      {isGiveWord && <OpponentPanel state={opponentState} onOpen={openOpponentPanel} onClose={closeOpponentPanel} />}
      {isGiveWord && <WordAssignModal visible={showAssignModal} onAssign={handleAssignWord} />}

      <InfoModal visible={roundModal.isOpen} title={`Raunt ${roundModal.data?.round ?? ''} Başlıyor!`} message={isGiveWord ? 'Rakibine bir kelime ver, o da sana verecek.' : 'Yeni kelime hazır!'} variant="info" icon="⚔️" buttonLabel="Hazırım!" onClose={roundModal.close} />
      <InfoModal visible={gameOverModal.isOpen} title={gameOverModal.data?.isWin ? 'Tebrikler!' : 'Oyun Bitti'} message={gameOverModal.data?.message ?? ''} variant={gameOverModal.data?.isWin ? 'success' : 'error'} buttonLabel="Ana Menüye Dön" onClose={() => { gameOverModal.close(); navigation.navigate('Home'); }} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D1A' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E1E3E' },
  headerLeft:   { minWidth: 80 },
  headerRight:  { minWidth: 80, alignItems: 'flex-end' },
  roundText:    { color: '#7ABAFF', fontSize: 13, fontWeight: '700' },
  modeText:     { color: '#4A5A7A', fontSize: 11 },
  waitText:     { color: '#4A5A7A', fontSize: 14 },
  scoreLabel:   { color: '#7A8AAA', fontSize: 11, fontWeight: '600' },
  scoreValue:   { color: '#F39C12', fontSize: 22, fontWeight: '800' },
  errorBanner:  { backgroundColor: '#2A0A0A', borderWidth: 1, borderColor: '#E74C3C', marginHorizontal: 16, marginVertical: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  errorText:    { color: '#E74C3C', fontSize: 12, textAlign: 'center' },
  hintRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6 },
  hintText:     { color: '#5A6A8A', fontSize: 13, flex: 1 },
  hintLetter:   { color: '#27AE60', fontWeight: '800' },
  watchBtn:     { backgroundColor: '#0F1929', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#2A3A6E' },
  watchBtnText: { color: '#5DADE2', fontSize: 12, fontWeight: '600' },
  waitingBox:   { alignItems: 'center', paddingVertical: 16 },
  waitingText:  { color: '#3A4A6A', fontSize: 14 },
  gridPlaceholder: { flex: 1 },
});
