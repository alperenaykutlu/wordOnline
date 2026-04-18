import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LetterState, type OpponentViewState, type OpponentGuessRow } from '../../types/game.types';

interface OpponentPanelProps {
  state:     OpponentViewState;
  onClose:   () => void;
  onOpen:    () => void;
}

// ── Küçük harf hücresi (rakibin satırlarını göstermek için) ──
const MiniLetterCell: React.FC<{ letter: string; state: LetterState }> = ({ letter, state }) => {
  const colors: Record<LetterState, string> = {
    [LetterState.Pending]:       '#2C2C3E',
    [LetterState.Correct]:       '#27AE60',
    [LetterState.WrongPosition]: '#D4A017',
    [LetterState.NotFound]:      '#4A4A5A',
  };
  return (
    <View style={[miniStyles.cell, { backgroundColor: colors[state] }]}>
      <Text style={miniStyles.letter}>{letter}</Text>
    </View>
  );
};

const miniStyles = StyleSheet.create({
  cell:   { width: 28, height: 28, borderRadius: 4, alignItems: 'center', justifyContent: 'center', margin: 2 },
  letter: { fontSize: 12, fontWeight: 'bold', color: '#FFF' },
});

// ── Rakip tahmin satırı ──────────────────────────────────
const OpponentGuessRowItem: React.FC<{ row: OpponentGuessRow; isLatest?: boolean }> = ({
  row, isLatest,
}) => (
  <View style={[panelStyles.guessRow, isLatest && panelStyles.latestRow]}>
    <View style={panelStyles.letters}>
      {row.guessWord.split('').map((letter, i) => (
        <MiniLetterCell
          key={i}
          letter={letter}
          state={row.letterStates[i] ?? LetterState.Pending}
        />
      ))}
    </View>
    <Text style={panelStyles.rowScore}>+{row.scoreEarned}</Text>
  </View>
);

// ── Ana Panel ────────────────────────────────────────────
export const OpponentPanel: React.FC<OpponentPanelProps> = ({ state, onClose, onOpen }) => {
  if (!state.isVisible) {
    return (
      <TouchableOpacity style={panelStyles.openButton} onPress={onOpen}>
        <Text style={panelStyles.openButtonText}>👁 Rakibi İzle</Text>
        {state.guessHistory.length > 0 && (
          <View style={panelStyles.badge}>
            <Text style={panelStyles.badgeText}>{state.guessHistory.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <Modal
      visible={state.isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={panelStyles.overlay}>
        <View style={panelStyles.panel}>

          {/* Header */}
          <View style={panelStyles.header}>
            <View>
              <Text style={panelStyles.title}>👁 {state.opponentUsername}</Text>
              <Text style={panelStyles.subtitle}>
                {state.wordLength} harfli kelime  •  {state.firstLetter}_ _ _ _
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={panelStyles.closeBtn}>
              <Text style={panelStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={panelStyles.statsRow}>
            <View style={panelStyles.statBox}>
              <Text style={panelStyles.statValue}>{state.totalScore}</Text>
              <Text style={panelStyles.statLabel}>Puan</Text>
            </View>
            <View style={panelStyles.statBox}>
              <Text style={panelStyles.statValue}>{state.remainingAttempts}</Text>
              <Text style={panelStyles.statLabel}>Kalan Hak</Text>
            </View>
            <View style={[
              panelStyles.statBox,
              state.isWinner     && panelStyles.winnerBox,
              state.isEliminated && panelStyles.eliminatedBox,
            ]}>
              <Text style={panelStyles.statValue}>
                {state.isWinner ? '🏆' : state.isEliminated ? '💀' : '⏳'}
              </Text>
              <Text style={panelStyles.statLabel}>
                {state.isWinner ? 'Kazandı' : state.isEliminated ? 'Elendi' : 'Devam'}
              </Text>
            </View>
          </View>

          {/* Tahmin geçmişi */}
          <Text style={panelStyles.sectionTitle}>
            Tahminler ({state.guessHistory.length})
          </Text>

          {state.isLoading ? (
            <Text style={panelStyles.emptyText}>Yükleniyor…</Text>
          ) : state.guessHistory.length === 0 ? (
            <Text style={panelStyles.emptyText}>Henüz tahmin yok</Text>
          ) : (
            <ScrollView
              style={panelStyles.scrollArea}
              showsVerticalScrollIndicator={false}
            >
              {[...state.guessHistory].reverse().map((row, idx) => (
                <OpponentGuessRowItem
                  key={row.attemptNumber}
                  row={row}
                  isLatest={idx === 0}
                />
              ))}
            </ScrollView>
          )}

          {/* Gerçek zamanlı güncelleme notu */}
          <View style={panelStyles.liveIndicator}>
            <View style={panelStyles.liveDot} />
            <Text style={panelStyles.liveText}>Gerçek zamanlı güncelleniyor</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const panelStyles = StyleSheet.create({
  // Açma butonu
  openButton: {
    position:        'absolute',
    right:           0,
    top:             120,
    backgroundColor: '#16213E',
    paddingVertical: 10,
    paddingHorizontal:14,
    borderTopLeftRadius:   10,
    borderBottomLeftRadius:10,
    borderWidth:     1,
    borderRightWidth:0,
    borderColor:     '#3A3A6E',
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    zIndex:          10,
  },
  openButtonText: { color: '#A0B4E0', fontSize: 13, fontWeight: '600' },
  badge: {
    backgroundColor: '#E74C3C',
    borderRadius:    10,
    width:           20,
    height:          20,
    alignItems:      'center',
    justifyContent:  'center',
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  // Modal overlay
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'flex-end',
  },

  // Panel
  panel: {
    backgroundColor:  '#1A1A2E',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:          20,
    maxHeight:        '75%',
    borderTopWidth:   1,
    borderColor:      '#3A3A6E',
  },

  // Header
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   16,
  },
  title:    { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 13, color: '#7A8AAA', marginTop: 2 },
  closeBtn: {
    width:          32,
    height:         32,
    backgroundColor:'#2C2C4E',
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#AAB', fontSize: 16 },

  // Stats
  statsRow: {
    flexDirection:  'row',
    gap:            10,
    marginBottom:   16,
  },
  statBox: {
    flex:            1,
    backgroundColor: '#0F1929',
    borderRadius:    10,
    padding:         10,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     '#2A2A4E',
  },
  winnerBox:     { borderColor: '#27AE60', backgroundColor: '#0A2A18' },
  eliminatedBox: { borderColor: '#E74C3C', backgroundColor: '#2A0A0A' },
  statValue:     { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  statLabel:     { fontSize: 11, color: '#7A8AAA', marginTop: 2 },

  // Guess history
  sectionTitle: { fontSize: 13, color: '#7A8AAA', marginBottom: 8, fontWeight: '600' },
  scrollArea:   { maxHeight: 280 },
  guessRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius:   8,
    marginBottom:   4,
  },
  latestRow: { backgroundColor: '#0F2A3E', borderWidth: 1, borderColor: '#2980B9' },
  letters:   { flexDirection: 'row' },
  rowScore:  { color: '#F39C12', fontSize: 13, fontWeight: 'bold', minWidth: 36, textAlign: 'right' },

  emptyText: { color: '#4A5A7A', fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  // Live indicator
  liveIndicator: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      12,
    gap:            6,
  },
  liveDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: '#27AE60',
  },
  liveText: { color: '#5A7A5A', fontSize: 11 },
});
