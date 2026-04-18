import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation }   from '@react-navigation/native';
import { useSelector }     from 'react-redux';
import * as signalR        from '@microsoft/signalr';
import { apiClient }       from '../../../shared/api/apiClient';
import { AppButton }       from '../../../shared/components/ui/Button/AppButton';
import { ConfirmModal }    from '../../../shared/components/ui/Modal/ConfirmModal';
import { toast }           from '../../../shared/components/ui/Toast/Toast';
import { useModal }        from '../../../shared/hooks/useModal';
import { API_BASE_URL }    from '../../../shared/constants/apiConstants';
import type { RootState }  from '../../../shared/store';

interface Friend {
  userId:     string;
  username:   string;
  totalScore: number;
  winCount:   number;
  lossCount:  number;
  isOnline:   boolean;
}

interface IncomingInvite {
  inviteId:     string;
  fromUserId:   string;
  fromUsername: string;
  mode:         'sameWord' | 'giveWord';
}

const FriendRow: React.FC<{
  friend:         Friend;
  invitingId:     string | null;
  onInvite:       (f: Friend) => void;
  onViewProfile:  (id: string) => void;
}> = ({ friend, invitingId, onInvite, onViewProfile }) => {
  const winRate = friend.winCount + friend.lossCount > 0
    ? Math.round((friend.winCount / (friend.winCount + friend.lossCount)) * 100) : 0;

  return (
    <View style={s.row}>
      <View style={s.avatarWrap}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{friend.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={[s.dot, friend.isOnline ? s.dotOnline : s.dotOffline]} />
      </View>
      <TouchableOpacity style={s.info} onPress={() => onViewProfile(friend.userId)}>
        <Text style={s.name}>{friend.username}</Text>
        <Text style={s.stats}>
          {friend.totalScore.toLocaleString('tr-TR')} puan  •  %{winRate} galibiyet
        </Text>
      </TouchableOpacity>
      <AppButton
        label={invitingId === friend.userId ? '…' : '⚔️'}
        onPress={() => onInvite(friend)}
        variant="secondary"
        size="sm"
        loading={invitingId === friend.userId}
        disabled={invitingId === friend.userId}
      />
    </View>
  );
};

export const FriendsScreen: React.FC = () => {
  const navigation  = useNavigation<any>();
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);

  const [friends,       setFriends]       = useState<Friend[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [invitingId,    setInvitingId]    = useState<string | null>(null);
  const [incoming,      setIncoming]      = useState<IncomingInvite | null>(null);

  const inviteModal = useModal<{ friend: Friend }>();
  const connRef     = useRef<signalR.HubConnection | null>(null);

  // ── Arkadaşları yükle ────────────────────────────────
  const loadFriends = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<Friend[]>('/social/friends');
      setFriends(data);
    } catch {
      toast.show({ message: 'Arkadaş listesi yüklenemedi.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // ── Notification Hub bağlantısı ──────────────────────
  useEffect(() => {
    if (!accessToken) return;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/notification?access_token=${accessToken}`)
      .withAutomaticReconnect()
      .build();

    connRef.current = conn;

    conn.on('GameInviteReceived', (inv: IncomingInvite) => setIncoming(inv));

    conn.on('InviteAccepted', (d: { roomId: string; opponentUsername: string }) => {
      toast.show({ message: `${d.opponentUsername} daveti kabul etti!`, variant: 'success' });
      navigation.navigate('EcurieGame', { roomId: d.roomId, mode: 'sameWord' });
    });

    conn.on('InviteRejected', (d: { fromUsername: string }) => {
      toast.show({ message: `${d.fromUsername} daveti reddetti.`, variant: 'warning' });
    });

    conn.start().catch(() => {});

    return () => { conn.stop(); };
  }, [accessToken, navigation]);

  // ── Davet gönder ─────────────────────────────────────
  const handleSendInvite = useCallback(async (friend: Friend, mode: 'sameWord' | 'giveWord') => {
    inviteModal.close();
    setInvitingId(friend.userId);
    try {
      await apiClient.post('/social/invites', { toUserId: friend.userId, mode });
      toast.show({ message: `${friend.username}'a davet gönderildi.`, variant: 'info', duration: 4000 });
    } catch (err: any) {
      toast.show({ message: err?.response?.data?.error ?? 'Davet gönderilemedi.', variant: 'error' });
    } finally {
      setInvitingId(null);
    }
  }, [inviteModal]);

  // ── Gelen daveti kabul et ────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!incoming) return;
    try {
      const { data } = await apiClient.post<{ roomId: string }>(`/social/invites/${incoming.inviteId}/accept`);
      setIncoming(null);
      navigation.navigate('EcurieGame', { roomId: data.roomId, mode: incoming.mode });
    } catch {
      toast.show({ message: 'Davet kabul edilemedi.', variant: 'error' });
    }
  }, [incoming, navigation]);

  // ── Gelen daveti reddet ──────────────────────────────
  const handleReject = useCallback(async () => {
    if (!incoming) return;
    try { await apiClient.post(`/social/invites/${incoming.inviteId}/reject`); } catch {}
    setIncoming(null);
    toast.show({ message: 'Davet reddedildi.', variant: 'info' });
  }, [incoming]);

  if (isLoading) return (
    <SafeAreaView style={s.container}>
      <View style={s.centered}><ActivityIndicator size="large" color="#27AE60" /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={friends}
        keyExtractor={f => f.userId}
        renderItem={({ item }) => (
          <FriendRow
            friend={item}
            invitingId={invitingId}
            onInvite={f => inviteModal.open({ friend: f })}
            onViewProfile={id => navigation.navigate('Profile', { userId: id })}
          />
        )}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <Text style={s.title}>👥 Arkadaşlar ({friends.length})</Text>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyText}>Henüz arkadaş yok</Text>
          </View>
        }
      />

      {/* Mod seçim modalı — ConfirmModal iki seçenek için kullanılıyor */}
      {inviteModal.data && (
        <ConfirmModal
          visible={inviteModal.isOpen}
          title={`${inviteModal.data.friend.username}'a Davet`}
          message="Hangi modda oynamak istersiniz?"
          variant="info"
          icon="⚔️"
          confirmLabel="Aynı Kelime"
          cancelLabel="Kelime Ver"
          onConfirm={() => handleSendInvite(inviteModal.data!.friend, 'sameWord')}
          onCancel={() => handleSendInvite(inviteModal.data!.friend, 'giveWord')}
        />
      )}

      {/* Gelen davet — ConfirmModal */}
      {incoming && (
        <ConfirmModal
          visible
          title="Oyun Daveti!"
          message={`${incoming.fromUsername} seni "${incoming.mode === 'sameWord' ? 'Aynı Kelime' : 'Kelime Ver'}" moduna davet ediyor.`}
          variant="info"
          icon="⚔️"
          confirmLabel="Kabul Et"
          cancelLabel="Reddet"
          onConfirm={handleAccept}
          onCancel={handleReject}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: 16, gap: 8, paddingBottom: 40 },
  title:     { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 8 },

  row: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#13132A',
    borderRadius:    14,
    padding:         14,
    borderWidth:     1,
    borderColor:     '#1E1E3E',
    gap:             12,
  },

  avatarWrap: { position: 'relative' },
  avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A3A6E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  dot:        { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#0D0D1A' },
  dotOnline:  { backgroundColor: '#27AE60' },
  dotOffline: { backgroundColor: '#4A5A7A' },

  info:  { flex: 1, gap: 3 },
  name:  { color: '#E0E8FF', fontSize: 14, fontWeight: '700' },
  stats: { color: '#4A5A7A', fontSize: 11 },

  empty:     { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#3A4A6A', fontSize: 14 },
});
