import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSelector }    from 'react-redux';
import { useRoute } from '@react-navigation/native';
import { leaderboardApi, type ProfileResult, type MatchHistoryItem } from '../../leaderboard/api/leaderboardApi';
import { authApi }        from '../../auth/api/authApi';
import { MatchHistoryCard } from './MatchHistoryCard';
import { InputModal }     from '../../../shared/components/ui/Modal/InputModal';
import { InfoModal }      from '../../../shared/components/ui/Modal/InfoModal';
import { AppButton }      from '../../../shared/components/ui/Button/AppButton';
import { toast }          from '../../../shared/components/ui/Toast/Toast';
import { useModal }       from '../../../shared/hooks/useModal';
import type { RootState } from '../../../shared/store';

export const ProfileScreen: React.FC = () => {
  const route        = useRoute<any>();
  const myUserId     = useSelector((s: RootState) => s.auth.userId ?? '');
  const targetId     = route.params?.userId ?? myUserId;
  const isOwnProfile = targetId === myUserId;

  const [profile,      setProfile]      = useState<ProfileResult | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Modal state — Alert.alert / Alert.prompt yerine
  const changeNameModal = useModal<{ remaining: number; current: string }>();
  const limitModal      = useModal();
  const errorModal      = useModal<{ message: string }>();

  // ── Veri yükleme ───────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [prof, history] = await Promise.all([
        isOwnProfile
          ? leaderboardApi.getMyProfile()
          : leaderboardApi.getProfile(targetId),
        isOwnProfile
          ? leaderboardApi.getMatchHistory(5)
          : Promise.resolve([]),
      ]);
      setProfile(prof);
      setMatchHistory(history);
    } catch {
      setError('Profil yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  }, [targetId, isOwnProfile]);

  useEffect(() => { load(); }, [load]);

  // ── Kullanıcı adı değiştirme ───────────────────────────
  const handleOpenChangeName = useCallback(() => {
    if (!profile) return;

    // Hak yoksa limit modalı göster
    if (profile.usernameChangesRemaining <= 0) {
      limitModal.open();
      return;
    }

    changeNameModal.open({
      remaining: profile.usernameChangesRemaining,
      current:   profile.username,
    });
  }, [profile, changeNameModal, limitModal]);

  const handleChangeUsername = useCallback(async (newName: string) => {
    setIsSaving(true);
    try {
      await authApi.changeUsername(newName);
      changeNameModal.close();
      toast.show({ message: 'Kullanıcı adın güncellendi! 🎉', variant: 'success' });
      load(); // Profili yenile
    } catch (err: any) {
      changeNameModal.close();
      errorModal.open({ message: err?.response?.data?.error ?? 'Güncelleme başarısız.' });
    } finally {
      setIsSaving(false);
    }
  }, [changeNameModal, errorModal, load]);

  // ── Validate ───────────────────────────────────────────
  const validateUsername = useCallback((value: string): string | null => {
    if (value.length < 3)  return 'En az 3 karakter olmalı.';
    if (value.length > 20) return 'En fazla 20 karakter olabilir.';
    if (!/^[a-zA-Z0-9_]+$/.test(value))
      return 'Sadece harf, rakam ve alt çizgi kullanılabilir.';
    if (value === profile?.username)
      return 'Yeni ad mevcut adınla aynı olamaz.';
    return null;
  }, [profile]);

  // ── Render ─────────────────────────────────────────────
  if (isLoading) return (
    <SafeAreaView style={s.container}>
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#27AE60" />
        <Text style={s.loadingText}>Profil yükleniyor…</Text>
      </View>
    </SafeAreaView>
  );

  if (error || !profile) return (
    <SafeAreaView style={s.container}>
      <View style={s.centered}>
        <Text style={s.errorIcon}>😔</Text>
        <Text style={s.errorText}>{error ?? 'Profil bulunamadı.'}</Text>
        <AppButton label="Tekrar Dene" onPress={load} variant="secondary" />
      </View>
    </SafeAreaView>
  );

  const winRate = profile.winCount + profile.lossCount > 0
    ? Math.round((profile.winCount / (profile.winCount + profile.lossCount)) * 100)
    : 0;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + İsim ────────────────────────── */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile.username.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.username}>{profile.username}</Text>
          <Text style={s.memberSince}>Toplam {profile.winCount + profile.lossCount} maç oynadı</Text>

          {isOwnProfile && (
            <TouchableOpacity style={s.editBtn} onPress={handleOpenChangeName} activeOpacity={0.75}>
              <Text style={s.editBtnText}>
                ✏️  Kullanıcı Adını Değiştir
              </Text>
              <View style={[
                s.changesBadge,
                profile.usernameChangesRemaining === 0 && s.changesBadgeDanger,
              ]}>
                <Text style={s.changesBadgeText}>
                  {profile.usernameChangesRemaining} hak kaldı
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Global Sıra ──────────────────────────── */}
        <View style={s.rankCard}>
          <View style={s.rankLeft}>
            <Text style={s.rankLabel}>🌍 Global Sıra</Text>
            <Text style={s.rankValue}>#{profile.globalRank.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={s.rankDivider} />
          <View style={s.rankRight}>
            <Text style={s.rankLabel}>Toplam Puan</Text>
            <Text style={s.scoreValue}>{profile.totalScore.toLocaleString('tr-TR')}</Text>
          </View>
        </View>

        {/* ── İstatistikler ─────────────────────────── */}
        <View style={s.statsGrid}>
          {[
            { label: '🏆 Galibiyet',  value: String(profile.winCount),  color: '#27AE60' },
            { label: '💀 Mağlubiyet', value: String(profile.lossCount), color: '#E74C3C' },
            { label: '📊 Kazanma',    value: `%${winRate}`,             color: '#F39C12' },
          ].map((item, i) => (
            <View key={i} style={s.statBox}>
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Son 5 Maç ────────────────────────────── */}
        {isOwnProfile && (
          <View style={s.historySection}>
            <Text style={s.sectionTitle}>Son 5 Maç</Text>
            {matchHistory.length === 0 ? (
              <View style={s.emptyHistory}>
                <Text style={s.emptyIcon}>🎮</Text>
                <Text style={s.emptyText}>Henüz maç oynanmadı</Text>
              </View>
            ) : (
              matchHistory.map((m, i) => <MatchHistoryCard key={i} match={m} />)
            )}
          </View>
        )}

      </ScrollView>

      {/* ── Kullanıcı Adı Değiştirme Modalı ─────────── */}
      <InputModal
        visible={changeNameModal.isOpen}
        title="Kullanıcı Adını Değiştir"
        message={`${changeNameModal.data?.remaining ?? 0} değiştirme hakkın kaldı. Değiştirdikten sonra geri alamazsın.`}
        label="Yeni Kullanıcı Adı"
        placeholder="Yeni adını gir…"
        defaultValue={changeNameModal.data?.current ?? ''}
        hint="3-20 karakter, harf/rakam/alt çizgi kullanılabilir."
        maxLength={20}
        icon="✏️"
        confirmLabel="Değiştir"
        cancelLabel="Vazgeç"
        validate={validateUsername}
        onConfirm={handleChangeUsername}
        onCancel={changeNameModal.close}
        loading={isSaving}
      />

      {/* ── Hak Doldu Modalı ─────────────────────────── */}
      <InfoModal
        visible={limitModal.isOpen}
        title="Limit Doldu"
        message="Kullanıcı adını en fazla 2 kez değiştirebilirsin. Bu hakkını doldurdun."
        variant="warning"
        icon="🚫"
        buttonLabel="Anladım"
        onClose={limitModal.close}
      />

      {/* ── Hata Modalı ──────────────────────────────── */}
      <InfoModal
        visible={errorModal.isOpen}
        title="İşlem Başarısız"
        message={errorModal.data?.message ?? 'Bir hata oluştu.'}
        variant="error"
        buttonLabel="Tamam"
        onClose={errorModal.close}
      />

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D1A' },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  loadingText: { color: '#7A8AAA', fontSize: 14, marginTop: 8 },
  errorIcon:   { fontSize: 48, marginBottom: 4 },
  errorText:   { color: '#E74C3C', fontSize: 15, textAlign: 'center' },

  scroll:      { padding: 20, paddingBottom: 60, gap: 16 },

  // Avatar
  avatarSection:{ alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#1A3A6E',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#2980B9',
    shadowColor: '#2980B9', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  avatarText:   { fontSize: 36, fontWeight: '900', color: '#FFF' },
  username:     { fontSize: 24, fontWeight: '800', color: '#FFF', marginTop: 4 },
  memberSince:  { color: '#4A5A7A', fontSize: 12 },

  editBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
    backgroundColor: '#12122A',
    borderRadius:    10,
    paddingHorizontal:14,
    paddingVertical: 8,
    borderWidth:     1,
    borderColor:     '#2A2A5E',
    marginTop:       4,
  },
  editBtnText:  { color: '#7ABAFF', fontSize: 13, fontWeight: '600' },
  changesBadge: {
    backgroundColor: '#1A3A1A', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#27AE60',
  },
  changesBadgeDanger: { backgroundColor: '#2A1A1A', borderColor: '#E74C3C' },
  changesBadgeText: { color: '#A0D0A0', fontSize: 11, fontWeight: '700' },

  // Rank card
  rankCard: {
    backgroundColor: '#1A2A4E',
    borderRadius:    16, padding: 20,
    flexDirection:   'row',
    alignItems:      'center',
    borderWidth:     1, borderColor: '#2980B9',
  },
  rankLeft:   { flex: 1, gap: 4 },
  rankRight:  { flex: 1, alignItems: 'flex-end', gap: 4 },
  rankDivider:{ width: 1, height: 48, backgroundColor: '#2A3A6E', marginHorizontal: 16 },
  rankLabel:  { color: '#5DADE2', fontSize: 12, fontWeight: '600' },
  rankValue:  { color: '#FFF', fontSize: 30, fontWeight: '900' },
  scoreValue: { color: '#F39C12', fontSize: 24, fontWeight: '800' },

  // Stats
  statsGrid:  { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: '#13132A', borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#1E1E3E',
    gap: 4,
  },
  statValue:  { fontSize: 22, fontWeight: '800' },
  statLabel:  { color: '#4A5A7A', fontSize: 11, textAlign: 'center' },

  // History
  historySection: { gap: 8 },
  sectionTitle:   { color: '#FFF', fontSize: 16, fontWeight: '800' },
  emptyHistory:   { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyIcon:      { fontSize: 40 },
  emptyText:      { color: '#3A4A6A', fontSize: 14 },
});
