import React, {
  useEffect, useState, useCallback, useRef,
} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, ActivityIndicator,
  Animated, Easing,
} from 'react-native';
import { apiClient }    from '../../../shared/api/apiClient';
import { ConfirmModal } from '../../../shared/components/ui/Modal/ConfirmModal';
import { InfoModal }    from '../../../shared/components/ui/Modal/InfoModal';
import { useModal }     from '../../../shared/hooks/useModal';
import { toast }        from '../../../shared/components/ui/Toast/Toast';

// ── Y2K Renk paleti (admin-only, global Colors'tan ayrı) ──
const Y = {
  bg:     '#080612',
  bg1:    '#0e0a1f',
  bg2:    '#130f28',
  bg3:    '#1a1438',
  cyan:   '#00f5ff',
  pink:   '#ff0090',
  lime:   '#aaff00',
  purple: '#9b30ff',
  orange: '#ff6a00',
  white:  '#e8e0ff',
  muted:  'rgba(180,160,255,0.45)',
  border: 'rgba(0,245,255,0.12)',
} as const;

// ── Tipler ────────────────────────────────────────────────
interface DailyStats  { date: string; soloGames: number; ecurieGames: number }
interface ComplaintItem {
  id: string; username: string; type: string;
  message: string; status: string; createdAt: string;
}
interface DashboardData {
  totalGamesPlayed:     number;
  totalSoloGames:       number;
  totalEcurieGames:     number;
  activeRooms:          number;
  totalPlayers:         number;
  totalAdFreePurchases: number;
  openComplaints:       number;
  totalComplaints:      number;
  onlinePlayers:        number;
  recentComplaints:     ComplaintItem[];
  dailyStats:           DailyStats[];
}

// ── Complaint type renk haritası ──────────────────────────
const TYPE_COLOR: Record<string, string> = {
  Bug: Y.pink, Suggestion: Y.cyan,
  Abuse: Y.orange, Other: Y.purple,
};
const TYPE_LABEL: Record<string, string> = {
  Bug: 'HATA', Suggestion: 'ÖNERİ', Abuse: 'İHLAL', Other: 'DİĞER',
};

// ════════════════════════════════════════════════════════
// Pulse Dot — neon nabız
// ════════════════════════════════════════════════════════
const PulseDot: React.FC<{ color: string }> = ({ color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.2] });
  return (
    <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: color, transform: [{ scale }], opacity }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
};

// ════════════════════════════════════════════════════════
// StatCard — Y2K neon kart
// ════════════════════════════════════════════════════════
const StatCard: React.FC<{
  label: string; value: string | number;
  sub: string; delta?: string; color: string;
}> = ({ label, value, sub, delta, color }) => {
  const borderAnim = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  const handleIn = () => {
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(glowAnim,   { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
  };
  const handleOut = () => {
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(glowAnim,   { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [`${color}30`, `${color}60`] });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={{ flex: 1 }}
    >
      <Animated.View style={[
        sc.card,
        { borderColor, borderTopColor: color, borderTopWidth: 2 },
      ]}>
        {/* Köşe dekorasyon */}
        <View style={[sc.corner, { borderColor: `${color}40` }]} />

        <Text style={[sc.label, { color: `${color}cc` }]}>{label}</Text>
        <Text style={[sc.value, { color, textShadowColor: `${color}60`, textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }]}>
          {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
        </Text>
        <Text style={sc.sub}>{sub}</Text>
        {delta ? <Text style={[sc.delta, { color: Y.lime }]}>{delta}</Text> : null}
      </Animated.View>
    </TouchableOpacity>
  );
};

const sc = StyleSheet.create({
  card: {
    backgroundColor: Y.bg1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.15)',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute', top: 0, right: 0,
    width: 32, height: 32,
    borderTopWidth: 1.5, borderRightWidth: 1.5,
    borderTopRightRadius: 8,
  },
  label: { fontWeight: '700', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  value: { fontSize: 34, fontWeight: '900', lineHeight: 38, letterSpacing: -1, marginBottom: 4 },
  sub:   { fontSize: 11, color: Y.muted, fontWeight: '400' },
  delta: { fontSize: 10, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },
});

// ════════════════════════════════════════════════════════
// SegmentBar — maç dağılımı çubuk
// ════════════════════════════════════════════════════════
const SegBar: React.FC<{ label: string; value: string; pct: number; color: string }> = ({ label, value, pct, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct, duration: 900,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [pct]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct * 100}%`] });
  return (
    <View style={sb.row}>
      <Text style={sb.label}>{label}</Text>
      <View style={sb.track}>
        <Animated.View style={[sb.fill, { width, backgroundColor: color, shadowColor: color, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }]} />
      </View>
      <Text style={[sb.val, { color }]}>{value}</Text>
    </View>
  );
};
const sb = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 11, color: Y.muted, fontWeight: '600', width: 90 },
  track: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 2 },
  val:   { fontWeight: '700', fontSize: 11, width: 38, textAlign: 'right' },
});

// ════════════════════════════════════════════════════════
// BarChart — 7 günlük trend
// ════════════════════════════════════════════════════════
const BarChart: React.FC<{ data: DailyStats[] }> = ({ data }) => {
  const max = Math.max(...data.map(d => d.soloGames + d.ecurieGames), 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 72 }}>
        {data.map((d, i) => {
          const sh = Math.round((d.soloGames   / max) * 58);
          const eh = Math.round((d.ecurieGames / max) * 58);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <View style={{ justifyContent: 'flex-end', height: 66, gap: 2 }}>
                <AnimatedBar height={sh} color={Y.cyan}   delay={i * 60} />
                <AnimatedBar height={eh} color={Y.purple} delay={i * 60 + 40} />
              </View>
              <Text style={{ fontSize: 8, color: Y.muted, fontWeight: '700', letterSpacing: 0.5 }}>{d.date.slice(0, 3)}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
        {[{ color: Y.cyan, label: 'SOLO' }, { color: Y.purple, label: 'EKÜRİ' }].map(l => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.color }} />
            <Text style={{ fontSize: 9, color: Y.muted, fontWeight: '700', letterSpacing: 1 }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const AnimatedBar: React.FC<{ height: number; color: string; delay: number }> = ({ height, color, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay + 200),
      Animated.timing(anim, {
        toValue: height, duration: 700,
        easing: Easing.out(Easing.back(1.3)), useNativeDriver: false,
      }),
    ]).start();
  }, [height]);
  return (
    <Animated.View style={{
      width: '100%', height: anim,
      borderRadius: 3,
      backgroundColor: color,
      shadowColor: color, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
    }} />
  );
};

// ════════════════════════════════════════════════════════
// ComplaintRow — şikayet satırı
// ════════════════════════════════════════════════════════
const ComplaintRow: React.FC<{
  item:      ComplaintItem;
  onResolve: () => void;
  onDismiss: () => void;
}> = ({ item, onResolve, onDismiss }) => {
  const color = TYPE_COLOR[item.type] ?? Y.muted;
  const date  = new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  const isOpen= item.status === 'Open' || item.status === 'InReview';
  return (
    <View style={cr.row}>
      {/* Tür pill */}
      <View style={[cr.pill, { borderColor: `${color}50`, backgroundColor: `${color}12` }]}>
        <Text style={[cr.pillText, { color }]}>{TYPE_LABEL[item.type] ?? item.type.toUpperCase()}</Text>
      </View>
      {/* İçerik */}
      <View style={cr.info}>
        <Text style={cr.user}>@{item.username}</Text>
        <Text style={cr.msg} numberOfLines={1}>{item.message}</Text>
      </View>
      {/* Tarih */}
      <Text style={cr.date}>{date}</Text>
      {/* Aksiyonlar */}
      {isOpen ? (
        <View style={cr.acts}>
          <TouchableOpacity style={[cr.actBtn, cr.actOk]} onPress={onResolve}>
            <Text style={[cr.actText, { color: Y.lime }]}>ÇÖZ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[cr.actBtn, cr.actNo]} onPress={onDismiss}>
            <Text style={[cr.actText, { color: Y.muted }]}>RET</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[cr.date, { color: Y.lime, fontSize: 9 }]}>ÇÖZÜLDÜ</Text>
      )}
    </View>
  );
};
const cr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: 'transparent', marginBottom: 3 },
  pill:     { borderRadius: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  info:     { flex: 1, gap: 2 },
  user:     { fontSize: 11, color: Y.white, fontWeight: '600' },
  msg:      { fontSize: 10, color: Y.muted },
  date:     { fontSize: 9, color: Y.muted, letterSpacing: 0.5 },
  acts:     { flexDirection: 'row', gap: 4 },
  actBtn:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  actOk:    { borderColor: 'rgba(170,255,0,0.3)',  backgroundColor: 'rgba(170,255,0,0.06)' },
  actNo:    { borderColor: 'rgba(180,160,255,0.15)', backgroundColor: 'transparent' },
  actText:  { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
});

// ════════════════════════════════════════════════════════
// LogFeed — canlı sistem akışı
// ════════════════════════════════════════════════════════
interface LogEntry { time: string; text: string; accent?: string }

const LogFeed: React.FC<{ entries: LogEntry[] }> = ({ entries }) => (
  <View style={{ gap: 8 }}>
    {entries.map((e, i) => (
      <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <Text style={{ fontWeight: '700', fontSize: 9, color: Y.cyan, letterSpacing: 1, minWidth: 54 }}>{e.time}</Text>
        <Text style={{ fontSize: 11, color: Y.muted, flex: 1, lineHeight: 15 }}>
          {e.accent
            ? <><Text style={{ color: Y.white, fontWeight: '600' }}>{e.accent}</Text></>
            : null}
          {e.text}
        </Text>
      </View>
    ))}
  </View>
);

// ════════════════════════════════════════════════════════
// Ana Ekran
// ════════════════════════════════════════════════════════
const FILTER_OPTIONS = ['Açık', 'Tümü', 'Çözüldü'] as const;
type FilterOption = typeof FILTER_OPTIONS[number];
const STATUS_MAP: Record<FilterOption, string | null> = {
  'Açık': 'Open', 'Tümü': null, 'Çözüldü': 'Resolved',
};

export const AdminDashboardScreen: React.FC = () => {
  const [data,      setData]      = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter,    setFilter]    = useState<FilterOption>('Açık');
  const [logFeed,   setLogFeed]   = useState<LogEntry[]>([
    { time: '--:--:--', text: 'Sistem bağlantısı kuruluyor…' },
  ]);

  const resolveModal = useModal<{ id: string; isDismiss: boolean; username: string }>();
  const errorModal   = useModal<{ message: string }>();

  // ── Veri yükle ─────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: d } = await apiClient.get<DashboardData>('/admin/dashboard');
      setData(d);
      addLog(`Dashboard verileri yüklendi`, 'SYSTEM');
    } catch {
      errorModal.open({ message: 'Dashboard verisi alınamadı.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Canlı log ekle ─────────────────────────────────
  const addLog = useCallback((text: string, accent?: string) => {
    const now = new Date().toLocaleTimeString('tr-TR', { hour12: false });
    setLogFeed(prev => [{ time: now, text, accent }, ...prev].slice(0, 8));
  }, []);

  // ── Otomatik log akışı ──────────────────────────────
  useEffect(() => {
    const events = [
      { text: ' eşleşme kuruldu',  accent: 'WordlePro vs Ahmet_52' },
      { text: ' solo maç +260p',   accent: 'player_42' },
      { text: ' reklamsız aktif',  accent: 'selin_42' },
      { text: ' kelime havuzu güncellendi', accent: undefined },
      { text: ' matchmaking kuyrukta',      accent: '3 oyuncu' },
      { text: ' yeni kayıt',       accent: 'user_2024' },
    ];
    const id = setInterval(() => {
      const e = events[Math.floor(Math.random() * events.length)];
      addLog(e.text, e.accent);
    }, 5000);
    return () => clearInterval(id);
  }, [addLog]);

  // ── Çöz / Reddet ────────────────────────────────────
  const handleAction = useCallback(async () => {
    if (!resolveModal.data) return;
    const { id, isDismiss, username } = resolveModal.data;
    resolveModal.close();
    try {
      await apiClient.post(`/admin/complaints/${id}/resolve`, {
        dismiss: isDismiss,
        note:    isDismiss ? 'Admin tarafından reddedildi.' : 'Admin tarafından çözümlendi.',
      });
      toast.show({
        message: isDismiss ? 'Şikayet reddedildi.' : 'Şikayet çözümlendi.',
        variant: isDismiss ? 'warning' : 'success',
      });
      addLog(isDismiss ? ' şikayeti reddedildi' : ' şikayeti çözümlendi', `@${username}`);
      load();
    } catch {
      toast.show({ message: 'İşlem başarısız.', variant: 'error' });
    }
  }, [resolveModal, load, addLog]);

  // ── Filtrelenmiş şikayetler ─────────────────────────
  const filtered = (data?.recentComplaints ?? []).filter(c => {
    const target = STATUS_MAP[filter];
    if (!target) return true;
    return c.status === target || (target === 'Open' && c.status === 'InReview');
  });

  if (isLoading) return (
    <SafeAreaView style={s.root}>
      <View style={s.loading}>
        <ActivityIndicator color={Y.cyan} size="large" />
        <Text style={s.loadingText}>SİSTEM YÜKLENİYOR…</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Başlık ─────────────────────────────────── */}
        <View style={s.topbar}>
          <View>
            <Text style={s.crumb}>ADMIN // DASHBOARD</Text>
            <Text style={s.title}>KONTROL{'\n'}PANELİ</Text>
          </View>
          <View style={{ gap: 10, alignItems: 'flex-end' }}>
            {/* Tile strip */}
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {[
                { l: 'W', s: 'c' }, { l: 'O', s: 'g' },
                { l: 'R', s: 'y' }, { l: 'D', s: 'x' }, { l: 'E', s: 'e' },
              ].map((t, i) => {
                const colMap: Record<string, string> = {
                  c: Y.cyan, g: Y.lime, y: Y.orange, x: Y.muted, e: Y.muted,
                };
                const bgMap: Record<string, string> = {
                  c: 'rgba(0,245,255,0.07)', g: 'rgba(170,255,0,0.07)',
                  y: 'rgba(255,106,0,0.07)', x: 'rgba(255,255,255,0.02)', e: 'transparent',
                };
                return (
                  <View key={i} style={[s.tile, {
                    borderColor: `${colMap[t.s]}50`,
                    backgroundColor: bgMap[t.s],
                  }]}>
                    <Text style={[s.tileLetter, { color: colMap[t.s] }]}>{t.l}</Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity style={s.refreshBtn} onPress={load}>
              <Text style={s.refreshText}>↻ YENİLE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stat Kartları ──────────────────────────── */}
        <View style={s.statGrid}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard
              label="Kayıtlı Oyuncu"
              value={data?.totalPlayers ?? 0}
              sub="Toplam kullanıcı"
              delta="↑ +2.4% bu hafta"
              color={Y.cyan}
            />
            <StatCard
              label="Toplam Maç"
              value={data?.totalGamesPlayed ?? 0}
              sub="Tüm zamanlar"
              delta={`↑ ${data?.activeRooms ?? 0} aktif oda`}
              color={Y.purple}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard
              label="Açık Şikayet"
              value={data?.openComplaints ?? 0}
              sub="İnceleme bekliyor"
              delta={(data?.openComplaints ?? 0) > 0 ? '⚠ Dikkat gerekli' : '✓ Temiz'}
              color={Y.pink}
            />
            <StatCard
              label="Reklamsız Satış"
              value={data?.totalAdFreePurchases ?? 0}
              sub="Satın alma"
              delta="↑ Gelir artışı"
              color={Y.lime}
            />
          </View>
        </View>

        {/* ── Maç Dağılımı ───────────────────────────── */}
        <View style={s.panel}>
          <View style={s.panelHead}>
            <PulseDot color={Y.cyan} />
            <Text style={[s.panelTitle, { color: Y.cyan }]}>// MAÇ DAĞILIMI</Text>
          </View>
          <View style={s.panelBody}>
            <SegBar label="Solo"       value={(data?.totalSoloGames   ?? 0).toLocaleString('tr-TR')} pct={0.686} color={Y.cyan}   />
            <SegBar label="Aynı Kelime"value={(data?.totalEcurieGames ?? 0).toLocaleString('tr-TR')} pct={0.220} color={Y.pink}   />
            <SegBar label="Kelime Ver"  value="265"                                                   pct={0.094} color={Y.purple} />
            <View style={s.divider} />
            <SegBar label="Aktif Oda"  value={String(data?.activeRooms   ?? 0)} pct={0.23} color={Y.lime}   />
            <SegBar label="Online"     value={String(data?.onlinePlayers ?? 0)} pct={0.55} color={Y.orange} />
          </View>
        </View>

        {/* ── 7 Günlük Trend ─────────────────────────── */}
        {(data?.dailyStats?.length ?? 0) > 0 && (
          <View style={s.panel}>
            <View style={s.panelHead}>
              <PulseDot color={Y.lime} />
              <Text style={[s.panelTitle, { color: Y.lime }]}>// 7 GÜNLÜK TREND</Text>
            </View>
            <View style={s.panelBody}>
              <BarChart data={data!.dailyStats} />
            </View>
          </View>
        )}

        {/* ── Şikayetler ─────────────────────────────── */}
        <View style={s.panel}>
          <View style={s.panelHead}>
            <PulseDot color={Y.pink} />
            <Text style={[s.panelTitle, { color: Y.pink }]}>// ŞİKAYETLER</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>{data?.openComplaints ?? 0} AÇIK</Text>
            </View>
            {/* Filtre */}
            <View style={{ flexDirection: 'row', gap: 4, marginLeft: 'auto' }}>
              {FILTER_OPTIONS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.filt, filter === f && s.filtActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[s.filtText, filter === f && s.filtTextActive]}>{f.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.panelBody}>
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ color: Y.muted, fontSize: 12, letterSpacing: 1 }}>VERİ YOK</Text>
              </View>
            ) : (
              filtered.map(item => (
                <ComplaintRow
                  key={item.id}
                  item={item}
                  onResolve={() => resolveModal.open({ id: item.id, isDismiss: false, username: item.username })}
                  onDismiss={() => resolveModal.open({ id: item.id, isDismiss: true,  username: item.username })}
                />
              ))
            )}
          </View>
        </View>

        {/* ── Canlı Log ──────────────────────────────── */}
        <View style={[s.panel, { borderColor: 'rgba(155,48,255,0.15)' }]}>
          <View style={s.panelHead}>
            <PulseDot color={Y.purple} />
            <Text style={[s.panelTitle, { color: Y.purple }]}>// CANLI SİSTEM AKIŞI</Text>
          </View>
          <View style={s.panelBody}>
            <LogFeed entries={logFeed} />
          </View>
        </View>

      </ScrollView>

      {/* Modals */}
      <ConfirmModal
        visible={resolveModal.isOpen}
        title={resolveModal.data?.isDismiss ? 'Şikayeti Reddet' : 'Şikayeti Çözümle'}
        message={resolveModal.data?.isDismiss
          ? `@${resolveModal.data?.username} şikayeti geçersiz olarak kapatılacak.`
          : `@${resolveModal.data?.username} şikayeti çözümlendi olarak işaretlenecek.`}
        variant={resolveModal.data?.isDismiss ? 'warning' : 'success'}
        confirmLabel={resolveModal.data?.isDismiss ? 'Reddet' : 'Çözümle'}
        cancelLabel="Vazgeç"
        onConfirm={handleAction}
        onCancel={resolveModal.close}
      />

      <InfoModal
        visible={errorModal.isOpen}
        title="Bağlantı Hatası"
        message={errorModal.data?.message ?? 'Bir hata oluştu.'}
        variant="error"
        buttonLabel="Tamam"
        onClose={errorModal.close}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Y.bg },
  scroll:{ padding: 16, paddingBottom: 48, gap: 14 },

  loading:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontWeight: '700', fontSize: 11, color: Y.cyan, letterSpacing: 3 },

  topbar:{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Y.border },
  crumb: { fontSize: 9, color: Y.muted, fontWeight: '700', letterSpacing: 2.5, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: Y.white, letterSpacing: -0.5, lineHeight: 32 },

  tile:       { width: 30, height: 30, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileLetter: { fontSize: 11, fontWeight: '900' },

  refreshBtn:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,245,255,0.25)', backgroundColor: 'rgba(0,245,255,0.05)' },
  refreshText: { fontSize: 9, fontWeight: '700', color: Y.cyan, letterSpacing: 1.5 },

  statGrid: { gap: 10 },

  panel:    { backgroundColor: Y.bg1, borderRadius: 8, borderWidth: 1, borderColor: Y.border, overflow: 'hidden' },
  panelHead:{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  panelTitle:{ fontWeight: '700', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  panelBody: { padding: 14 },

  badge:     { backgroundColor: 'rgba(255,106,0,0.12)', borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,106,0,0.3)', paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '700', color: Y.orange },

  filt:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(180,160,255,0.15)' },
  filtActive:   { borderColor: 'rgba(0,245,255,0.4)', backgroundColor: 'rgba(0,245,255,0.07)' },
  filtText:     { fontSize: 8, fontWeight: '700', color: Y.muted, letterSpacing: 1 },
  filtTextActive:{ color: Y.cyan },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 8 },
});
