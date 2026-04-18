import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Animated, Easing,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector }   from 'react-redux';
import * as signalR      from '@microsoft/signalr';
import { useMatchmakingStore } from './store/matchmakingStore';
import { InfoModal }     from '../../shared/components/ui/Modal/InfoModal';
import { useModal }      from '../../shared/hooks/useModal';
import { toast }         from '../../shared/components/ui/Toast/Toast';
import { Colors }        from '../../shared/constants/colors';
import { API_BASE_URL }  from '../../shared/constants/apiConstants';
import type { RootState }from '../../shared/store';

type Mode = 'sameWord' | 'giveWord';

// ── 3 Katmanlı Spinner ───────────────────────────────────
const TripleSpinner: React.FC = () => {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = (anim: Animated.Value, duration: number, reverse = false) =>
      Animated.loop(
        Animated.timing(anim, {
          toValue:         reverse ? -1 : 1,
          duration,
          easing:          Easing.linear,
          useNativeDriver: true,
        })
      ).start();

    spin(r1, 1400);
    spin(r2, 2100, true);
    spin(r3, 3000);
  }, []);

  const rot = (anim: Animated.Value) => ({
    transform: [{
      rotate: anim.interpolate({ inputRange: [-1, 1], outputRange: ['-360deg', '360deg'] }),
    }],
  });

  return (
    <View style={sp.wrap}>
      <Animated.View style={[sp.ring, sp.ring1, rot(r1)]} />
      <Animated.View style={[sp.ring, sp.ring2, rot(r2)]} />
      <Animated.View style={[sp.ring, sp.ring3, rot(r3)]} />
      <View style={sp.core}><Text style={{ fontSize: 22 }}>🎮</Text></View>
    </View>
  );
};

const sp = StyleSheet.create({
  wrap: { width: 138, height: 138, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 2, borderColor: 'transparent', top: 0, left: 0, right: 0, bottom: 0 },
  ring1: { borderTopColor: Colors.orange, borderRightColor: 'rgba(230,126,34,0.28)' },
  ring2: { top: 16, left: 16, right: 16, bottom: 16, borderTopColor: Colors.silver, borderLeftColor: 'rgba(189,195,199,0.28)' },
  ring3: { top: 32, left: 32, right: 32, bottom: 32, borderTopColor: 'rgba(230,126,34,0.45)' },
  core:  { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.dark3, borderWidth: 1, borderColor: 'rgba(230,126,34,0.18)', alignItems: 'center', justifyContent: 'center' },
});

// ── Oyuncu kartı ─────────────────────────────────────────
const PlayerCard: React.FC<{
  initial:  string;
  name:     string;
  score:    string;
  accent?:  string;
  isFound?: boolean;
}> = ({ initial, name, score, accent = Colors.orange, isFound = false }) => (
  <View style={pc.wrap}>
    <View style={[pc.av, {
      backgroundColor: isFound ? 'rgba(39,174,96,0.14)' : `${accent}14`,
      borderColor:     isFound ? 'rgba(39,174,96,0.38)' : `${accent}38`,
    }]}>
      <Text style={[pc.avText, { color: isFound ? Colors.green : accent }]}>{initial}</Text>
    </View>
    <Text style={pc.name}>{name}</Text>
    <Text style={pc.score}>{score}</Text>
  </View>
);

const pc = StyleSheet.create({
  wrap:   { flex: 1, alignItems: 'center', gap: 6 },
  av:     { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 20, fontWeight: '800' },
  name:   { fontSize: 11, fontWeight: '600', color: Colors.silver, textAlign: 'center' },
  score:  { fontSize: 9,  color: Colors.muted },
});

// ── Ana Ekran ─────────────────────────────────────────────
export const MatchmakingScreen: React.FC = () => {
  const navigation  = useNavigation<any>();
  const route       = useRoute<any>();
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const username    = useSelector((s: RootState) => s.auth.username ?? 'Sen');

  const [mode,        setMode]        = useState<Mode>(route.params?.mode ?? 'sameWord');
  const [elapsed,     setElapsed]     = useState(0);
  const [opponentFound, setOpponentFound] = useState(false);
  const [opponent,    setOpponent]    = useState<{ name: string; score: string } | null>(null);

  const store      = useMatchmakingStore();
  const errorModal = useModal<{ message: string }>();
  const connRef    = useRef<signalR.HubConnection | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval>>();

  // ── SignalR bağlantısı ────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    store.startSearching(mode);

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/matchmaking?access_token=${accessToken}`)
      .withAutomaticReconnect()
      .build();

    connRef.current = conn;

    conn.on('MatchFound', (data: { roomId: string; opponentUsername: string }) => {
      setOpponentFound(true);
      setOpponent({ name: data.opponentUsername, score: '—' });
      store.setMatched(data.roomId, data.opponentUsername);
      toast.show({ message: `${data.opponentUsername} ile eşleşildi!`, variant: 'success' });

      if (elapsedRef.current) clearInterval(elapsedRef.current);
      setTimeout(() => {
        if (mode === 'giveWord') navigation.replace('WordGive', { roomId: data.roomId });
        else navigation.replace('EcurieGame', { roomId: data.roomId, mode });
      }, 1700);
    });

    conn.on('MatchmakingError', (err: string) => {
      store.setError(err);
      errorModal.open({ message: err });
    });

    conn.start()
      .then(() => conn.invoke('JoinMatchmaking', mode))
      .catch(() => errorModal.open({ message: 'Sunucuya bağlanılamadı.' }));

    // Elapsed counter
    elapsedRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      conn.invoke('LeaveMatchmaking').catch(() => {});
      conn.stop();
    };
  }, [accessToken, mode]);

  const handleCancel = useCallback(async () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    store.cancel();
    await connRef.current?.invoke('LeaveMatchmaking').catch(() => {});
    await connRef.current?.stop();
    navigation.goBack();
  }, [navigation, store]);

  const handleModeSwitch = useCallback(async (m: Mode) => {
    if (m === mode) return;
    // Eski bağlantıyı bırak
    await connRef.current?.invoke('LeaveMatchmaking').catch(() => {});
    setMode(m);
    setElapsed(0);
    setOpponentFound(false);
    setOpponent(null);
  }, [mode]);

  const modeLabel = mode === 'sameWord' ? 'Aynı Kelime' : 'Kelime Ver';

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleCancel}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.title}>Rakip Ara</Text>
          <Text style={s.subtitle}>Eküri modu · {modeLabel}</Text>
        </View>
      </View>

      {/* Mod seçici */}
      <View style={s.pills}>
        {(['sameWord', 'giveWord'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[s.pill, mode === m && s.pillActive]}
            onPress={() => handleModeSwitch(m)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18, marginBottom: 3 }}>{m === 'sameWord' ? '🔤' : '🔄'}</Text>
            <Text style={[s.pillLabel, mode === m && s.pillLabelActive]}>
              {m === 'sameWord' ? 'Aynı Kelime' : 'Kelime Ver'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Body */}
      <View style={s.body}>

        {/* Oyuncu satırı */}
        <View style={s.playerRow}>
          <PlayerCard initial={username.charAt(0).toUpperCase()} name={username} score="3.840 puan · #47" />

          {opponentFound ? (
            <View style={s.vsBadge}><Text style={s.vsText}>VS</Text></View>
          ) : (
            <View style={s.vsPlaceholder}><Text style={{ color: 'rgba(189,195,199,0.2)', fontSize: 18 }}>?</Text></View>
          )}

          <PlayerCard
            initial={opponentFound ? (opponent?.name.charAt(0).toUpperCase() ?? 'A') : '?'}
            name={opponentFound ? (opponent?.name ?? '…') : 'Bekleniyor…'}
            score={opponentFound ? '— puan' : '— puan'}
            accent={opponentFound ? Colors.green : Colors.silver}
            isFound={opponentFound}
          />
        </View>

        {/* Spinner */}
        <TripleSpinner />

        {/* Durum */}
        <Text style={[s.status, opponentFound && { color: Colors.green }]}>
          {opponentFound ? 'Rakip bulundu!' : 'Uygun rakip aranıyor…'}
        </Text>
        <Text style={s.elapsed}>{elapsed} saniye</Text>

        {/* Bilgi kutusu */}
        <View style={s.infoBox}>
          <Text style={s.infoText}>
            <Text style={{ color: Colors.silver, fontWeight: '600' }}>İlk gelen alır.</Text>
            {' '}Her oyuncu yalnızca tek bir rakiple eşleşir. Kuyruğa girdin!
          </Text>
        </View>

        {/* İptal */}
        {!opponentFound && (
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} activeOpacity={0.75}>
            <Text style={s.cancelText}>İptal Et</Text>
          </TouchableOpacity>
        )}
      </View>

      <InfoModal
        visible={errorModal.isOpen}
        title="Bağlantı Hatası"
        message={errorModal.data?.message ?? 'Bir hata oluştu.'}
        variant="error"
        buttonLabel="Geri Dön"
        onClose={() => { errorModal.close(); navigation.goBack(); }}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark2 },

  header: { paddingTop: 12, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark3, borderWidth: 1, borderColor: Colors.creamAlpha07, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: Colors.silver, lineHeight: 28, fontWeight: '300' },
  headerInfo: { flex: 1 },
  title:    { fontSize: 18, fontWeight: '800', color: Colors.cream },
  subtitle: { fontSize: 11, color: Colors.muted, marginTop: 2 },

  pills: { flexDirection: 'row', gap: 8, padding: 20, paddingBottom: 0 },
  pill: { flex: 1, padding: 11, borderRadius: Colors.radius, borderWidth: 1.5, borderColor: Colors.silverAlpha10, backgroundColor: 'transparent', alignItems: 'center' },
  pillActive: { borderColor: Colors.orange, backgroundColor: Colors.orangeAlpha10 },
  pillLabel: { fontSize: 10, fontWeight: '600', color: Colors.silver },
  pillLabelActive: { color: Colors.orange },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 20 },

  playerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  vsBadge:      { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vsText:       { fontSize: 11, fontWeight: '800', color: '#fff' },
  vsPlaceholder:{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.silverAlpha18, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  status:  { fontSize: 14, fontWeight: '600', color: Colors.cream, textAlign: 'center' },
  elapsed: { fontSize: 11, color: Colors.muted, textAlign: 'center' },

  infoBox: { width: '100%', backgroundColor: Colors.creamAlpha04, borderRadius: Colors.radius, padding: 12, borderWidth: 1, borderColor: Colors.creamAlpha07 },
  infoText:{ fontSize: 11, color: Colors.muted, textAlign: 'center', lineHeight: 17 },

  cancelBtn: { width: '100%', padding: 13, borderRadius: Colors.radius, borderWidth: 1, borderColor: Colors.silverAlpha10, alignItems: 'center', marginTop: 4 },
  cancelText:{ fontSize: 13, fontWeight: '600', color: Colors.muted },
});
