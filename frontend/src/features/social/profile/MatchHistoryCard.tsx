import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MatchHistoryItem } from '../../leaderboard/api/leaderboardApi';

const MODE_LABELS: Record<number, string> = {
  0: '🎯 Solo',
  1: '⚔️ Aynı Kelime',
  2: '🔄 Kelime Ver',
};

interface MatchHistoryCardProps {
  match: MatchHistoryItem;
}

export const MatchHistoryCard: React.FC<MatchHistoryCardProps> = ({ match }) => {
  const date    = new Date(match.playedAt);
  const dateStr = date.toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  return (
    <View style={[styles.card, match.isWinner ? styles.winCard : styles.lossCard]}>
      {/* Sol kenarda renkli çizgi */}
      <View style={[styles.accent, match.isWinner ? styles.winAccent : styles.lossAccent]} />

      <View style={styles.content}>
        {/* Üst satır: Sonuç + Mod */}
        <View style={styles.topRow}>
          <View style={[styles.resultBadge, match.isWinner ? styles.winBadge : styles.lossBadge]}>
            <Text style={styles.resultText}>
              {match.isWinner ? '🏆 GALİP' : '💀 MAĞLUBİYET'}
            </Text>
          </View>
          <Text style={styles.modeText}>{MODE_LABELS[match.mode] ?? 'Bilinmiyor'}</Text>
        </View>

        {/* Orta: Rakip + Skor */}
        <View style={styles.middleRow}>
          <View style={styles.playerSide}>
            <Text style={styles.playerLabel}>Sen</Text>
            <Text style={styles.playerScore}>{match.finalScore}</Text>
          </View>

          {match.opponentUsername && (
            <>
              <Text style={styles.vsText}>VS</Text>
              <View style={styles.playerSide}>
                <Text style={styles.playerLabel} numberOfLines={1}>
                  {match.opponentUsername}
                </Text>
                <Text style={styles.playerScore}>{match.opponentScore ?? '—'}</Text>
              </View>
            </>
          )}
        </View>

        {/* Alt satır: Tahmin sayısı + Tarih */}
        <View style={styles.bottomRow}>
          <Text style={styles.metaText}>
            {match.totalGuesses} tahmin  •  {match.roundsPlayed} raunt
          </Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection:   'row',
    backgroundColor: '#13132A',
    borderRadius:    12,
    marginVertical:  5,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     '#1E1E3E',
  },
  winCard:  { borderColor: '#1A4A2A' },
  lossCard: { borderColor: '#3A1A1A' },

  accent:      { width: 4, minHeight: 80 },
  winAccent:   { backgroundColor: '#27AE60' },
  lossAccent:  { backgroundColor: '#E74C3C' },

  content:   { flex: 1, padding: 12, gap: 8 },

  topRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  winBadge:  { backgroundColor: '#0D2A18' },
  lossBadge: { backgroundColor: '#2A0D0D' },
  resultText:{ fontSize: 11, fontWeight: '800', color: '#FFF' },
  modeText:  { color: '#4A5A7A', fontSize: 12 },

  middleRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerSide:  { alignItems: 'center', minWidth: 60 },
  playerLabel: { color: '#7A8AAA', fontSize: 11 },
  playerScore: { color: '#F39C12', fontSize: 22, fontWeight: '800' },
  vsText:      { color: '#3A4A6A', fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'center' },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText:  { color: '#3A4A6A', fontSize: 11 },
  dateText:  { color: '#3A4A6A', fontSize: 11 },
});
