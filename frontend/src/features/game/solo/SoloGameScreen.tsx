import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Modal, TouchableOpacity,
} from 'react-native';
import { useSoloGame }       from './useSoloGame';
import { WordGrid }          from '../shared/components/WordGrid/WordGrid';
import { GameKeyboard }      from '../shared/components/Keyboard/GameKeyboard';
import { CountdownTimer }    from '../shared/components/Timer/CountdownTimer';
import { GameStatus }        from '../shared/types/game.types';
import type { SoloGameScreenProps } from '@app/navigation/types';

export const SoloGameScreen: React.FC<SoloGameScreenProps> = ({ route, navigation }) => {
  const { wordLength } = route.params;

  const {
    store,
    keyboardStates,
    isSubmitting,
    resultMessage,
    submitGuess,
    handleTimeExpired,
    addLetter,
    removeLetter,
    clearMessage,
  } = useSoloGame({ wordLength });

  const activeRowIndex = store.maxAttempts - store.remainingAttempts;
  const isGameOver     = store.status === GameStatus.Completed;

  const handleResultClose = useCallback(() => {
    clearMessage();
    navigation.goBack();
  }, [clearMessage, navigation]);

  if (!store.roomId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Oyun hazırlanıyor…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.modeLabel}>🎯 Tek Kişi</Text>
          <Text style={styles.wordLengthLabel}>{wordLength} Harfli</Text>
        </View>

        <CountdownTimer
          totalSeconds={store.timeLimitSeconds}
          onExpire={handleTimeExpired}
          paused={isGameOver}
        />

        <View style={styles.headerRight}>
          <Text style={styles.scoreLabel}>PUAN</Text>
          <Text style={styles.scoreValue}>{store.totalScore}</Text>
        </View>
      </View>

      {/* Hata mesajı */}
      {store.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{store.error}</Text>
        </View>
      )}

      {/* İlk harf ipucu */}
      <View style={styles.hintRow}>
        <Text style={styles.hintText}>
          İlk harf: <Text style={styles.hintLetter}>{store.firstLetter}</Text>
          {'  '}Kalan hak: <Text style={styles.hintLetter}>{store.remainingAttempts}</Text>
        </Text>
      </View>

      {/* Kelime ızgarası */}
      <WordGrid
        rows={store.guessRows}
        wordLength={store.wordLength}
        activeRowIndex={activeRowIndex}
        currentGuess={store.currentGuess}
      />

      {/* Klavye */}
      <GameKeyboard
        letterStates={keyboardStates}
        onLetter={addLetter}
        onDelete={removeLetter}
        onSubmit={submitGuess}
        disabled={isGameOver || isSubmitting}
        lockedLetter={store.firstLetter}
      />

      {/* Sonuç Modal */}
      <Modal visible={!!resultMessage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{resultMessage}</Text>
            <TouchableOpacity style={styles.resultButton} onPress={handleResultClose}>
              <Text style={styles.resultButtonText}>Ana Menüye Dön</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0D0D1A' },
  loadingContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:    { color: '#7A8AAA', fontSize: 16 },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E3E',
  },
  headerLeft:  { minWidth: 80 },
  headerRight: { minWidth: 80, alignItems: 'flex-end' },
  modeLabel:   { color: '#A0B4E0', fontSize: 12, fontWeight: '600' },
  wordLengthLabel:{ color: '#6A7A9A', fontSize: 11 },
  scoreLabel:  { color: '#7A8AAA', fontSize: 11, fontWeight: '600' },
  scoreValue:  { color: '#F39C12', fontSize: 22, fontWeight: 'bold' },

  // Hata
  errorBanner: {
    backgroundColor: '#2A0A0A',
    borderWidth:     1,
    borderColor:     '#E74C3C',
    marginHorizontal:16,
    marginVertical:  6,
    paddingVertical: 8,
    paddingHorizontal:12,
    borderRadius:    8,
  },
  errorText: { color: '#E74C3C', fontSize: 13, textAlign: 'center' },

  // İpucu
  hintRow: { alignItems: 'center', paddingVertical: 6 },
  hintText: { color: '#5A6A8A', fontSize: 13 },
  hintLetter:{ color: '#27AE60', fontWeight: 'bold' },

  // Sonuç modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  resultCard: {
    backgroundColor: '#1A1A2E',
    borderRadius:    16,
    padding:         28,
    alignItems:      'center',
    marginHorizontal:32,
    borderWidth:     1,
    borderColor:     '#3A3A6E',
  },
  resultText:       { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', lineHeight: 28 },
  resultButton:     { marginTop: 20, backgroundColor: '#27AE60', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28 },
  resultButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});
