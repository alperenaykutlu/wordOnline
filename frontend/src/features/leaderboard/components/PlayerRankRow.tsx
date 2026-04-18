import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { LeaderboardEntry } from '../api/leaderboardApi';

interface PlayerRankRowProps {
  entry:          LeaderboardEntry;
  isCurrentPlayer:boolean;
  onPress?:       (userId: string) => void;
}

// Sıra rozeti renkleri
const getRankStyle = (rank: number) => {
  if (rank === 1) return { bg: '#FFD700', text: '#000', medal: '🥇' };
  if (rank === 2) return { bg: '#C0C0C0', text: '#000', medal: '🥈' };
  if (rank === 3) return { bg: '#CD7F32', text: '#FFF', medal: '🥉' };
  return { bg: '#2C2C4E', text: '#A0B0D0', medal: null };
};

export const PlayerRankRow: React.FC<PlayerRankRowProps> = ({
  entry, isCurrentPlayer, onPress,
}) => {
  const rankStyle = getRankStyle(entry.rank);
  const winRate   = entry.winCount + entry.lossCount > 0
    ? Math.round((entry.winCount / (entry.winCount + entry.lossCount)) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={[styles.row, isCurrentPlayer && styles.currentPlayerRow]}
      onPress={() => onPress?.(entry.userId)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Sıra */}
      <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg }]}>
        {rankStyle.medal
          ? <Text style={styles.medal}>{rankStyle.medal}</Text>
          : <Text style={[styles.rankText, { color: rankStyle.text }]}>
              {entry.rank}
            </Text>
        }
      </View>

      {/* Kullanıcı adı */}
      <View style={styles.userInfo}>
        <Text style={[styles.username, isCurrentPlayer && styles.currentUsername]}
          numberOfLines={1}>
          {entry.username}
          {isCurrentPlayer && ' (Sen)'}
        </Text>
        <Text style={styles.statsText}>
          {entry.winCount}G / {entry.lossCount}M  •  %{winRate}
        </Text>
      </View>

      {/* Puan */}
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, isCurrentPlayer && styles.currentScore]}>
          {entry.score.toLocaleString('tr-TR')}
        </Text>
        <Text style={styles.scoreSuffix}>puan</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical:10,
    paddingHorizontal:12,
    borderRadius:   10,
    marginVertical: 3,
    backgroundColor:'#13132A',
    borderWidth:    1,
    borderColor:    '#1E1E3E',
    gap:            12,
  },
  currentPlayerRow: {
    backgroundColor:'#0D2040',
    borderColor:    '#2980B9',
    borderWidth:    2,
  },

  // Rank badge
  rankBadge: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },
  medal:    { fontSize: 20 },
  rankText: { fontSize: 14, fontWeight: '800' },

  // User info
  userInfo:    { flex: 1, gap: 2 },
  username:    { color: '#D0D8F0', fontSize: 14, fontWeight: '600' },
  currentUsername: { color: '#5DADE2' },
  statsText:   { color: '#4A5A7A', fontSize: 11 },

  // Score
  scoreContainer: { alignItems: 'flex-end' },
  score:          { color: '#F39C12', fontSize: 16, fontWeight: '800' },
  currentScore:   { color: '#F1C40F' },
  scoreSuffix:    { color: '#4A5A7A', fontSize: 10 },
});
