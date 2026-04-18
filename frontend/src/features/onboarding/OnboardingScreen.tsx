import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Dimensions, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../shared/constants/colors';

const { width: W } = Dimensions.get('window');

// ── Slide 1 — Grid Örneği ────────────────────────────────
const GridDemo: React.FC = () => (
  <View style={g.grid}>
    {([
      [['f','E'],['f','L'],['f','M'],['f','A']],
      [['g','A'],['y','R'],['x','M'],['x','U']],
      [['g','A'],['g','L'],['g','I'],['g','M']],
    ] as [string,string][][]).map((row, ri) => (
      <View key={ri} style={g.row}>
        {row.map(([v, letter], ci) => (
          <View key={ci} style={[g.cell, v==='g'&&g.cg, v==='y'&&g.cy, v==='x'&&g.cx, v==='f'&&g.cf]}>
            <Text style={[g.letter, v==='g'&&{color:'#7efaaa'}, v==='y'&&{color:'#ffb84d'}, v==='x'&&{color:Colors.silver}, v==='f'&&{color:Colors.cream}]}>
              {letter}
            </Text>
          </View>
        ))}
      </View>
    ))}
  </View>
);
const g = StyleSheet.create({
  grid: { gap: 7 },
  row:  { flexDirection: 'row', gap: 7 },
  cell: { width: 52, height: 52, borderRadius: Colors.radius, borderWidth: 1.5, borderColor: Colors.creamAlpha07, backgroundColor: Colors.creamAlpha04, alignItems: 'center', justifyContent: 'center' },
  cg: { backgroundColor: Colors.greenBg, borderColor: Colors.greenBorder },
  cy: { backgroundColor: Colors.yellowBg, borderColor: Colors.yellowBorder },
  cx: { backgroundColor: Colors.grayBg, borderColor: Colors.grayBorder },
  cf: { borderColor: 'rgba(236,240,241,0.22)' },
  letter: { fontSize: 22, fontWeight: '800' },
});

// ── Slide 2 — VS Demo ────────────────────────────────────
const VSDemo: React.FC = () => (
  <View style={v.wrap}>
    <View style={v.player}>
      <View style={[v.av, { backgroundColor: 'rgba(230,126,34,0.14)', borderColor: 'rgba(230,126,34,0.38)' }]}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.orange }}>S</Text>
      </View>
      <Text style={v.name}>Sen</Text>
      <View style={v.rows}>
        {[
          ['rgba(39,174,96,.55)','rgba(230,126,34,.55)','rgba(189,195,199,.18)','rgba(39,174,96,.55)'],
          ['rgba(39,174,96,.55)','rgba(39,174,96,.55)','rgba(39,174,96,.55)','rgba(39,174,96,.55)'],
        ].map((row, ri) => (
          <View key={ri} style={v.miniRow}>
            {row.map((bg, ci) => <View key={ci} style={[v.mc, { backgroundColor: bg }]} />)}
          </View>
        ))}
      </View>
    </View>
    <View style={v.vsBadge}><Text style={v.vsText}>VS</Text></View>
    <View style={v.player}>
      <View style={[v.av, { backgroundColor: 'rgba(44,62,80,.45)', borderColor: Colors.silverAlpha18 }]}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.muted }}>?</Text>
      </View>
      <Text style={v.name}>Rakip</Text>
      <View style={v.rows}>
        {['rgba(189,195,199,.15)','rgba(189,195,199,.09)'].map((bg, ri) => (
          <View key={ri} style={v.miniRow}>
            {[0,1,2,3].map(ci => <View key={ci} style={[v.mc, { backgroundColor: bg }]} />)}
          </View>
        ))}
      </View>
    </View>
  </View>
);
const v = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', gap: 22 },
  player:  { alignItems: 'center', gap: 8 },
  av:      { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  name:    { fontSize: 10, color: Colors.muted },
  rows:    { gap: 5 },
  miniRow: { flexDirection: 'row', gap: 4 },
  mc:      { width: 20, height: 20, borderRadius: 3 },
  vsBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  vsText:  { fontSize: 12, fontWeight: '800', color: '#fff' },
});

// ── Slide 3 — Kupa ───────────────────────────────────────
const TrophyDemo: React.FC = () => (
  <View style={{ alignItems: 'center', gap: 6 }}>
    <Text style={{ fontSize: 68 }}>🏆</Text>
    <Text style={{ fontSize: 34, fontWeight: '900', color: Colors.orange }}>+420</Text>
    <Text style={{ fontSize: 12, color: Colors.muted }}>puan kazandın</Text>
    <View style={{ flexDirection: 'row', gap: 5, marginTop: 8 }}>
      {['⭐','⭐','⭐'].map((s, i) => <Text key={i} style={{ fontSize: 20 }}>{s}</Text>)}
    </View>
  </View>
);

const SLIDES = [
  { art: <GridDemo />,   title: 'Kelimeyi Bul',        desc: 'Sistem ilk harfi verir. Geri kalanını bulmak sana kalır. Yeşil doğru, sarı yanlış konumda.' },
  { art: <VSDemo />,     title: 'Eküri Mod',            desc: 'Gerçek rakiplerle 5 raunt duel. Aynı kelime ya da rakibine kelime ver — sen seç.' },
  { art: <TrophyDemo />, title: 'Puan Kazan, Yüksel',   desc: 'Her doğru harf 10 puan. Süre bonusu ve 5 raunt sistemiyle global sıralamada yerini al.' },
];

// ── Ana Ekran ─────────────────────────────────────────────
export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [page, setPage] = useState(0);
  const scrollRef  = useRef<ScrollView>(null);

  // ── Giriş animasyonu: aşağıdan yukarı yükselme ──────
  const enterY       = useRef(new Animated.Value(40)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Splash'ın çıkış animasyonu ~450ms sürdüğünden
    // kısa bir gecikmeyle başlatıyoruz — böylece geçiş örtüşüyor
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue:  1,
        duration: 480,
        easing:   Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(enterY, {
        toValue:  0,
        duration: 520,
        easing:   Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Sayfa geçişi — slide animasyonu
  const slideAnim = useRef(new Animated.Value(1)).current;

  const goNext = useCallback(() => {
    if (page < SLIDES.length - 1) {
      // İçerik sola doğru kısa bir kayma ile geçer
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        const next = page + 1;
        scrollRef.current?.scrollTo({ x: next * W, animated: false });
        setPage(next);
        Animated.timing(slideAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      });
    } else {
      navigation.replace('Login');
    }
  }, [page, navigation, slideAnim]);

  return (
    <Animated.View style={[
      s.container,
      { opacity: enterOpacity, transform: [{ translateY: enterY }] },
    ]}>
      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={s.slide}>
            <Animated.View style={[
              s.artWrap,
              i === page && { opacity: slideAnim, transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
            ]}>
              {slide.art}
            </Animated.View>
            <Animated.View style={[
              { gap: 0 },
              i === page && { opacity: slideAnim },
            ]}>
              <Text style={s.title}>{slide.title}</Text>
              <Text style={s.desc}>{slide.desc}</Text>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom */}
      <View style={s.bottom}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === page && s.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={s.btn} onPress={goNext} activeOpacity={0.85}>
          <Text style={s.btnText}>
            {page < SLIDES.length - 1 ? 'Devam' : 'Başla'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.replace('Login')} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
          <Text style={s.skip}>Geç</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark2 },
  slide: {
    width: W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    paddingBottom: 170,
  },
  artWrap: { height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 34, width: '100%' },
  title: { fontSize: 23, fontWeight: '800', color: Colors.cream, textAlign: 'center', lineHeight: 28, marginBottom: 11 },
  desc:  { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 28, paddingBottom: 36, alignItems: 'center', gap: 14 },
  dots:   { flexDirection: 'row', gap: 7 },
  dot:    { height: 4, width: 16, borderRadius: 2, backgroundColor: Colors.silverAlpha18 },
  dotActive: { width: 30, backgroundColor: Colors.orange },
  btn:    { width: '100%', padding: 14, borderRadius: Colors.radius, backgroundColor: Colors.orange, alignItems: 'center' },
  btnText:{ fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  skip:   { fontSize: 11, color: Colors.muted, paddingVertical: 4 },
});
