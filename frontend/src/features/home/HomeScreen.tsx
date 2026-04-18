import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector }   from 'react-redux';
import { BaseModal }     from '../../shared/components/ui/Modal/BaseModal';
import { AppButton }     from '../../shared/components/ui/Button/AppButton';
import { useModal }      from '../../shared/hooks/useModal';
import { Colors }        from '../../shared/constants/colors';
import type { RootState }from '../../shared/store';

const WORD_LENGTHS = [3, 4, 5, 6, 7, 8];

// ── Skor bar item ─────────────────────────────────────────
const ScoreItem: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <View style={s.sbi}>
    <Text style={s.sbiVal}>{value}</Text>
    <Text style={s.sbiLbl}>{label}</Text>
  </View>
);

// ── Mod kartı ─────────────────────────────────────────────
const ModeCard: React.FC<{
  icon:    string;
  title:   string;
  desc:    string;
  accent:  string;
  onPress: () => void;
}> = ({ icon, title, desc, accent, onPress }) => (
  <TouchableOpacity style={[s.mc, { borderLeftColor: accent }]} onPress={onPress} activeOpacity={0.8}>
    <View style={[s.mcIcon, { backgroundColor: `${accent}18` }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
    </View>
    <View style={s.mcInfo}>
      <Text style={s.mcTitle}>{title}</Text>
      <Text style={s.mcDesc}>{desc}</Text>
    </View>
    <View style={s.mcArr}><Text style={s.mcArrText}>›</Text></View>
  </TouchableOpacity>
);

// ── Hızlı erişim ─────────────────────────────────────────
const QuickBtn: React.FC<{ icon: string; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={s.qi} onPress={onPress} activeOpacity={0.75}>
    <Text style={{ fontSize: 20 }}>{icon}</Text>
    <Text style={s.qiLabel}>{label}</Text>
  </TouchableOpacity>
);

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const username   = useSelector((s: RootState) => s.auth.username ?? 'Oyuncu');

  const soloModal   = useModal<null>();
  const ecurieModal = useModal<null>();
  const [selLen, setSelLen] = useState(5);

  const handleStartSolo = useCallback(() => {
    soloModal.close();
    navigation.navigate('SoloGame', { wordLength: selLen });
  }, [selLen, navigation, soloModal]);

  const handleEcurieMode = useCallback((mode: 'sameWord' | 'giveWord') => {
    ecurieModal.close();
    navigation.navigate('Matchmaking', { mode });
  }, [navigation, ecurieModal]);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greet}>Hoş geldin</Text>
            <Text style={s.name}>{username}</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{username.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        {/* Skor bar */}
        <View style={s.scoreBar}>
          <ScoreItem value="#47"   label="Sıra"    />
          <View style={s.div} />
          <ScoreItem value="3.840" label="Puan"    />
          <View style={s.div} />
          <ScoreItem value="22"    label="Galibiyet" />
          <View style={s.div} />
          <ScoreItem value="%71"   label="Kazanma" />
        </View>

        {/* Mod kartları */}
        <Text style={s.sectLabel}>Oyun Modu</Text>
        <View style={s.modeList}>
          <ModeCard
            icon="🎯" title="Tek Başına"
            desc="Kelime uzunluğunu seç, süreye karşı yarış"
            accent={Colors.green}
            onPress={() => soloModal.open(null)}
          />
          <ModeCard
            icon="⚔️" title="Eküri Mod"
            desc="Gerçek rakip, 5 raunt, anlık rekabet"
            accent={Colors.orange}
            onPress={() => ecurieModal.open(null)}
          />
        </View>

        {/* Hızlı erişim */}
        <View style={s.quickRow}>
          <QuickBtn icon="🏆" label="Sıralama"   onPress={() => navigation.navigate('Leaderboard')} />
          <QuickBtn icon="👤" label="Profil"      onPress={() => navigation.navigate('Profile')}     />
          <QuickBtn icon="👥" label="Arkadaşlar" onPress={() => navigation.navigate('Friends')}     />
          <QuickBtn icon="🔄" label="Kelime Ver"  onPress={() => navigation.navigate('WordGive')}    />
        </View>

      </ScrollView>

      {/* Solo — kelime uzunluğu modalı */}
      <BaseModal visible={soloModal.isOpen} onClose={soloModal.close}
        title="🎯 Tek Kişilik Oyun" position="bottom" showHandle>
        <Text style={s.modalDesc}>Kaç harfli kelime oynamak istersin?</Text>
        <View style={s.lenGrid}>
          {WORD_LENGTHS.map(len => (
            <TouchableOpacity key={len}
              style={[s.lenBtn, selLen === len && s.lenBtnActive]}
              onPress={() => setSelLen(len)}>
              <Text style={[s.lenNum, selLen === len && s.lenNumActive]}>{len}</Text>
              <Text style={[s.lenSub, selLen === len && s.lenSubActive]}>harf</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.modalInfo}>
          <Text style={s.modalInfoText}>
            ⏱ 60 sn  ·  {selLen + 1} tahmin hakkı  ·  İlk harf verilir
          </Text>
        </View>
        <AppButton label={`${selLen} Harfli Başlat`} onPress={handleStartSolo}
          variant="success" size="lg" fullWidth icon="▶" />
      </BaseModal>

      {/* Eküri — mod seçim modalı */}
      <BaseModal visible={ecurieModal.isOpen} onClose={ecurieModal.close}
        title="⚔️ Eküri Mod" position="bottom" showHandle>
        <Text style={s.modalDesc}>Oyun modunu seç:</Text>
        {[
          { icon:'🔤', title:'Aynı Kelime', desc:'İkisi de aynı sistematik kelimeyi bulmaya çalışır', mode:'sameWord' as const },
          { icon:'🔄', title:'Kelime Ver',  desc:'Rakibine kelime ver, birbirinizin ekranını izleyebilirsiniz', mode:'giveWord' as const },
        ].map(item => (
          <TouchableOpacity key={item.mode} style={s.ecurieOpt}
            onPress={() => handleEcurieMode(item.mode)} activeOpacity={0.8}>
            <Text style={{ fontSize: 26 }}>{item.icon}</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.ecurieOptTitle}>{item.title}</Text>
              <Text style={s.ecurieOptDesc}>{item.desc}</Text>
            </View>
            <Text style={{ color: Colors.muted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ))}
        <Text style={s.ecurieNote}>5 raunt  ·  En çok puan alan kazanır</Text>
      </BaseModal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark2 },
  scroll:    { padding: 20, paddingBottom: 40, gap: 0 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginBottom: 18 },
  greet:  { fontSize: 10, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5 },
  name:   { fontSize: 20, fontWeight: '800', color: Colors.cream, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  scoreBar: {
    backgroundColor: Colors.dark3,
    borderRadius:    Colors.radius,
    padding:         14,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    borderWidth:     1,
    borderColor:     Colors.creamAlpha04,
    marginBottom:    22,
  },
  sbi:    { flex: 1, alignItems: 'center', gap: 2 },
  sbiVal: { fontSize: 18, fontWeight: '800', color: Colors.cream },
  sbiLbl: { fontSize: 9, fontWeight: '500', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  div:    { width: 1, height: 28, backgroundColor: Colors.silverAlpha10 },

  sectLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  modeList:  { gap: 9, marginBottom: 9 },
  mc: {
    borderRadius:    Colors.radius,
    borderWidth:     1,
    borderLeftWidth: 3,
    borderColor:     Colors.creamAlpha07,
    backgroundColor: Colors.dark3,
    flexDirection:   'row',
    alignItems:      'center',
    padding:         15,
    gap:             14,
  },
  mcIcon:  { width: 42, height: 42, borderRadius: Colors.radius, alignItems: 'center', justifyContent: 'center' },
  mcInfo:  { flex: 1 },
  mcTitle: { fontSize: 14, fontWeight: '700', color: Colors.cream, marginBottom: 2 },
  mcDesc:  { fontSize: 11, color: Colors.muted, lineHeight: 15 },
  mcArr:   { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.creamAlpha04, alignItems: 'center', justifyContent: 'center' },
  mcArrText: { color: Colors.muted, fontSize: 16, lineHeight: 20 },

  quickRow: { flexDirection: 'row', gap: 8 },
  qi: { flex: 1, backgroundColor: Colors.dark3, borderRadius: Colors.radius, padding: 12, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: Colors.creamAlpha04 },
  qiLabel: { fontSize: 10, color: Colors.muted, fontWeight: '500' },

  // Modal
  modalDesc:     { color: Colors.muted, fontSize: 13, marginBottom: 16 },
  lenGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  lenBtn:        { width: 68, backgroundColor: Colors.dark2, borderRadius: Colors.radius, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.silverAlpha10 },
  lenBtnActive:  { borderColor: Colors.green, backgroundColor: 'rgba(39,174,96,0.1)' },
  lenNum:        { color: Colors.silver, fontSize: 22, fontWeight: '900' },
  lenNumActive:  { color: Colors.green },
  lenSub:        { color: Colors.muted, fontSize: 10 },
  lenSubActive:  { color: 'rgba(39,174,96,0.7)' },
  modalInfo:     { backgroundColor: Colors.dark2, borderRadius: Colors.radius, padding: 10, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.creamAlpha04 },
  modalInfoText: { color: Colors.muted, fontSize: 12 },

  ecurieOpt: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark2, borderRadius: Colors.radius, padding: 16, borderWidth: 1, borderColor: Colors.silverAlpha10, marginBottom: 10, gap: 12 },
  ecurieOptTitle:{ color: Colors.cream, fontSize: 14, fontWeight: '700' },
  ecurieOptDesc: { color: Colors.muted, fontSize: 11, lineHeight: 16 },
  ecurieNote:    { color: Colors.muted, fontSize: 11, textAlign: 'center', marginTop: 4 },
});
