import React, { useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector }       from 'react-redux';
import { useNavigation }     from '@react-navigation/native';
import { useLeaderboard }    from './hooks/useLeaderboard';
import { PlayerRankRow }     from './components/PlayerRankRow';
import type { RootState }    from '../../shared/store';
import type { LeaderboardEntry } from './api/leaderboardApi';

export const LeaderboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const currentUserId = useSelector((s: RootState) => s.auth.userId ?? '');
  const {
    data, isLoading, isLoadingMore,
    playerRank, refresh, loadMore, expandTable, isExpanded,
  } = useLeaderboard();
  const flatListRef = useRef<FlatList>(null);

  const handleRowPress = useCallback((userId: string) => {
    navigation.navigate('Profile', { userId });
  }, [navigation]);

  const scrollToPlayer = useCallback(() => {
    if (!data) return;
    const idx = data.entries.findIndex(e => e.userId === currentUserId);
    if (idx >= 0) flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  }, [data, currentUserId]);

  const renderItem = useCallback(({ item }: { item: LeaderboardEntry }) => (
    <PlayerRankRow
      entry={item}
      isCurrentPlayer={item.userId === currentUserId}
      onPress={handleRowPress}
    />
  ), [currentUserId, handleRowPress]);

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>🏆 Liderlik Tablosu</Text>
        {!isExpanded && (
          <TouchableOpacity style={styles.expandBtn} onPress={expandTable}>
            <Text style={styles.expandBtnText}>Tamamını Gör</Text>
          </TouchableOpacity>
        )}
      </View>
      {data && (
        <TouchableOpacity style={styles.myRankCard} onPress={scrollToPlayer}>
          <View><Text style={styles.myRankLabel}>Senin Sıran</Text>
            <Text style={styles.myRankValue}>#{playerRank.toLocaleString('tr-TR')}</Text></View>
          <View style={styles.myRankDivider} />
          <View><Text style={styles.myRankLabel}>Puan</Text>
            <Text style={styles.myRankValue}>{data.playerScore.toLocaleString('tr-TR')}</Text></View>
          <View style={styles.myRankDivider} />
          <View><Text style={styles.myRankLabel}>Toplam Oyuncu</Text>
            <Text style={styles.myRankValue}>{data.totalPlayers.toLocaleString('tr-TR')}</Text></View>
        </TouchableOpacity>
      )}
      <View style={styles.columnHeaders}>
        <Text style={[styles.colHeader, { width: 48 }]}>#</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>Oyuncu</Text>
        <Text style={[styles.colHeader, { width: 80, textAlign: 'right' }]}>Puan</Text>
      </View>
    </View>
  );

  if (isLoading && !data) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#27AE60" />
        <Text style={styles.loadingText}>Sıralama yükleniyor…</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={data?.entries ?? []}
        keyExtractor={item => `${item.rank}-${item.userId}`}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={() => isLoadingMore
          ? <ActivityIndicator color="#27AE60" style={{ marginVertical: 20 }} />
          : null}
        contentContainerStyle={styles.listContent}
        onEndReached={isExpanded ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#27AE60" />}
        onScrollToIndexFailed={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D1A' },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText:  { color: '#7A8AAA', fontSize: 14, marginTop: 12 },
  listContent:  { padding: 16, paddingBottom: 40 },
  listHeader:   { gap: 12, marginBottom: 8 },
  titleRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:        { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  expandBtn:    { backgroundColor: '#1A2A4E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2A3A6E' },
  expandBtnText:{ color: '#7ABAFF', fontSize: 12, fontWeight: '600' },
  myRankCard:   { backgroundColor: '#1A2A4E', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: '#2980B9' },
  myRankLabel:  { color: '#5DADE2', fontSize: 11, textAlign: 'center' },
  myRankValue:  { color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  myRankDivider:{ width: 1, height: 36, backgroundColor: '#2A3A6E' },
  columnHeaders:{ flexDirection: 'row', paddingHorizontal: 12, marginTop: 4 },
  colHeader:    { color: '#3A4A6A', fontSize: 11, fontWeight: '700' },
});
