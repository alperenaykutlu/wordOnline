import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../shared/constants/colors';

Dimensions.get('window');

const TILES: { letter: string; variant: 'default' | 'green' | 'orange' }[] = [
  { letter: 'W', variant: 'default' },
  { letter: 'O', variant: 'green'   },
  { letter: 'R', variant: 'orange'  },
  { letter: 'D', variant: 'default' },
  { letter: 'L', variant: 'default' },
  { letter: 'E', variant: 'green'   },
];

const TILE_DELAYS = [0, 120, 240, 120, 240, 360];
const RING_SIZES  = [110, 190, 280, 380, 490];
const RING_DELAYS = [0, 350, 700, 1050, 1400];

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // Tile animasyonları
  const tileAnims = TILES.map(() => ({
    opacity:   useRef(new Animated.Value(0)).current,
    translateY:useRef(new Animated.Value(-44)).current,
    scale:     useRef(new Animated.Value(0.6)).current,
  }));

  // Metin animasyonları
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY       = useRef(new Animated.Value(10)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const tagY        = useRef(new Animated.Value(10)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  // Dot bounce
  const dotAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  // Halka animasyonları
  const ringAnims = RING_SIZES.map(() => ({
    opacity: useRef(new Animated.Value(0)).current,
    scale:   useRef(new Animated.Value(0.65)).current,
  }));

  // ── Ekran geçiş animasyonu ───────────────────────────
  // Splash içeriği yukarı çıkarken onboarding alttan kayar
  const exitTranslateY = useRef(new Animated.Value(0)).current;
  const exitOpacity    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Tile drop-in
    tileAnims.forEach((a, i) => {
      Animated.sequence([
        Animated.delay(280 + TILE_DELAYS[i]),
        Animated.parallel([
          Animated.spring(a.opacity,    { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.spring(a.translateY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.spring(a.scale,      { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]),
      ]).start();
    });

    // ONLINE kelimesi
    Animated.sequence([
      Animated.delay(920),
      Animated.parallel([
        Animated.timing(wordOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(wordY,       { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();

    // Tagline
    Animated.sequence([
      Animated.delay(1110),
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(tagY,       { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();

    // Loader dots
    Animated.sequence([
      Animated.delay(1300),
      Animated.timing(loaderOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      dotAnims.forEach((dot, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 160),
            Animated.timing(dot, { toValue: -10, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(dot, { toValue:   0, duration: 420, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
          ])
        ).start();
      });
    });

    // Halka pulse loop
    ringAnims.forEach((r, i) => {
      const loop = () => {
        r.opacity.setValue(0);
        r.scale.setValue(0.65);
        Animated.sequence([
          Animated.delay(RING_DELAYS[i]),
          Animated.parallel([
            Animated.timing(r.opacity, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(r.scale,   { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.timing(r.opacity, { toValue: 0, duration: 1400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(RING_DELAYS[RING_SIZES.length - 1] - RING_DELAYS[i]),
        ]).start(loop);
      };
      loop();
    });

    // ── Çıkış animasyonu — navigation.replace'ten ÖNCE ──
    // 3200ms: tüm içerik hafifçe yukarı kayarken solar
    // 3600ms: geçiş tamamlanır, onboarding fade-in olarak gelir
    const navTimeout = setTimeout(() => {
      Animated.parallel([
        // İçerik yukarı kayar
        Animated.timing(exitTranslateY, {
          toValue:  -30,
          duration: 500,
          easing:   Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Tüm splash solar
        Animated.timing(exitOpacity, {
          toValue:  0,
          duration: 450,
          easing:   Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Loader dots da hızla solar
        Animated.timing(loaderOpacity, {
          toValue:  0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.replace('Onboarding');
      });
    }, 3100);

    return () => clearTimeout(navTimeout);
  }, []);

  const tileStyle = (variant: 'default' | 'green' | 'orange') => {
    if (variant === 'green')  return s.tileGreen;
    if (variant === 'orange') return s.tileOrange;
    return s.tileDefault;
  };
  const tileColor = (variant: 'default' | 'green' | 'orange') => {
    if (variant === 'green')  return '#7efaaa';
    if (variant === 'orange') return Colors.orange;
    return Colors.cream;
  };

  return (
    <View style={s.container}>
      {/* Pulse rings — bunlar sabit kalır (exitTranslateY uygulanmaz) */}
      {ringAnims.map((r, i) => (
        <Animated.View
          key={i}
          style={[
            s.ring,
            {
              width:  RING_SIZES[i],
              height: RING_SIZES[i],
              opacity:  r.opacity,
              transform:[{ scale: r.scale }],
            },
          ]}
        />
      ))}

      {/* Center content — exit animasyonu bu bloğa uygulanır */}
      <Animated.View style={[
        s.center,
        {
          opacity:   exitOpacity,
          transform: [{ translateY: exitTranslateY }],
        },
      ]}>
        {/* Tiles */}
        <View style={s.tilesRow}>
          {tileAnims.map((a, i) => (
            <Animated.View
              key={i}
              style={[
                s.tile,
                tileStyle(TILES[i].variant),
                {
                  opacity:   a.opacity,
                  transform: [{ translateY: a.translateY }, { scale: a.scale }],
                },
              ]}
            >
              <Text style={[s.tileLetter, { color: tileColor(TILES[i].variant) }]}>
                {TILES[i].letter}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* ONLINE */}
        <Animated.Text style={[
          s.wordText,
          { opacity: wordOpacity, transform: [{ translateY: wordY }] },
        ]}>
          ONLINE
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[
          s.tagText,
          { opacity: tagOpacity, transform: [{ translateY: tagY }] },
        ]}>
          Kelime bulmacasında yarış
        </Animated.Text>

        {/* Loader */}
        <Animated.View style={[s.loaderRow, { opacity: loaderOpacity }]}>
          {dotAnims.map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                s.dot,
                i === 0 && { backgroundColor: Colors.orange  },
                i === 1 && { backgroundColor: Colors.silver  },
                i === 2 && { backgroundColor: Colors.orange2 },
                { transform: [{ translateY: dot }] },
              ]}
            />
          ))}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark2,
    alignItems:      'center',
    justifyContent:  'center',
    overflow:        'hidden',
  },
  ring: {
    position:    'absolute',
    borderRadius:9999,
    borderWidth: 1,
    borderColor: 'rgba(230,126,34,0.11)',
  },
  center:   { alignItems: 'center', zIndex: 1 },
  tilesRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tile: {
    width: 48, height: 48,
    borderRadius: Colors.radius,
    alignItems:   'center',
    justifyContent:'center',
    borderWidth:  1.5,
  },
  tileDefault:{ backgroundColor: Colors.creamAlpha04, borderColor: Colors.creamAlpha10 },
  tileGreen:  { backgroundColor: Colors.greenBg,      borderColor: 'rgba(39,174,96,0.45)' },
  tileOrange: { backgroundColor: Colors.orangeAlpha18,borderColor: 'rgba(230,126,34,0.45)' },
  tileLetter: { fontSize: 22, fontWeight: '800' },
  wordText: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 9, color: Colors.silver,
    marginBottom: 6,
  },
  tagText:    { fontSize: 13, color: Colors.muted },
  loaderRow:  { flexDirection: 'row', gap: 9, marginTop: 56 },
  dot:        { width: 7, height: 7, borderRadius: 3.5 },
});
