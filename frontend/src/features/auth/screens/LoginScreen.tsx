import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { Colors } from '../../../shared/constants/colors';

// Tile yapılandırması
const LOGO_TILES: { letter: string; variant: 'default' | 'green' | 'orange' }[] = [
  { letter: 'W', variant: 'default' },
  { letter: 'O', variant: 'green'   },
  { letter: 'R', variant: 'orange'  },
  { letter: 'D', variant: 'default' },
  { letter: 'L', variant: 'default' },
  { letter: 'E', variant: 'green'   },
];

const LogoTile: React.FC<{ letter: string; variant: 'default' | 'green' | 'orange' }> = ({ letter, variant }) => {
  const bgMap = {
    default: Colors.creamAlpha04,
    green:   Colors.greenBg,
    orange:  Colors.orangeAlpha18,
  };
  const borderMap = {
    default: Colors.creamAlpha10,
    green:   'rgba(39,174,96,0.42)',
    orange:  'rgba(230,126,34,0.42)',
  };
  const colorMap = {
    default: Colors.cream,
    green:   '#7efaaa',
    orange:  Colors.orange,
  };
  return (
    <View style={[s.tile, { backgroundColor: bgMap[variant], borderColor: borderMap[variant] }]}>
      <Text style={[s.tileLetter, { color: colorMap[variant] }]}>{letter}</Text>
    </View>
  );
};

export const LoginScreen: React.FC = () => {
  const { signIn, loading, error } = useGoogleAuth();

  return (
    <SafeAreaView style={s.container}>
      {/* Dekoratif arka plan halkaları */}
      <View style={s.bgRings} pointerEvents="none">
        {[320, 230, 145].map((size, i) => (
          <View key={i} style={[s.bgRing, { width: size, height: size, borderRadius: size / 2 }]} />
        ))}
      </View>

      {/* Logo bölümü */}
      <View style={s.logoSection}>
        <View style={s.tilesRow}>
          {LOGO_TILES.map((t, i) => <LogoTile key={i} {...t} />)}
        </View>
        <Text style={s.brand}>
          WORDLE <Text style={{ color: Colors.orange }}>·</Text>
        </Text>
        <Text style={s.subtitle}>ONLINE</Text>
      </View>

      {/* Giriş kartı */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Başlamaya hazır mısın?</Text>
        <Text style={s.cardSub}>
          Google Play hesabınla tek tıkla giriş yap. Başka hesap gerekmez.
        </Text>

        {error && <Text style={s.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[s.googleBtn, loading && s.googleBtnDisabled]}
          onPress={signIn}
          disabled={loading}
          activeOpacity={0.87}
        >
          {loading ? (
            <ActivityIndicator color={Colors.dark2} size="small" />
          ) : (
            <>
              <View style={s.gCircle}><Text style={s.gG}>G</Text></View>
              <Text style={s.googleLabel}>Google Play ile Devam Et</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.divLine} />
          <Text style={s.divText}>Güvenli giriş</Text>
          <View style={s.divLine} />
        </View>

        <Text style={s.legal}>
          Giriş yaparak{' '}
          <Text style={s.legalLink}>Kullanım Koşulları</Text>
          {' '}ve{' '}
          <Text style={s.legalLink}>Gizlilik Politikası</Text>
          {'\'nı'} kabul etmiş olursunuz.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark2, justifyContent: 'flex-end' },

  bgRings: {
    position:'absolute', top: 0, left: 0, right: 0, height: 390,
    alignItems:'center', justifyContent:'center',
  },
  bgRing: {
    position:   'absolute',
    borderWidth: 1,
    borderColor:'rgba(230,126,34,0.08)',
  },

  logoSection: {
    position:   'absolute',
    top: 0, left: 0, right: 0,
    height:     390,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 1,
  },
  tilesRow:  { flexDirection: 'row', gap: 7 },
  tile: {
    width: 42, height: 42,
    borderRadius: Colors.radius,
    borderWidth:  1.5,
    alignItems:   'center',
    justifyContent:'center',
  },
  tileLetter:{ fontSize: 19, fontWeight: '800' },

  brand: {
    fontSize:     30,
    fontWeight:   '900',
    color:        Colors.cream,
    letterSpacing:6,
  },
  subtitle: {
    fontSize:     10,
    color:        Colors.muted,
    letterSpacing:4,
    fontWeight:   '600',
  },

  card: {
    backgroundColor: Colors.dark3,
    borderRadius:    Colors.radiusXl,
    borderTopWidth:  1,
    borderColor:     Colors.creamAlpha07,
    padding:         28,
    paddingBottom:   36,
    zIndex:          1,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.cream, marginBottom: 5 },
  cardSub:   { fontSize: 12, color: Colors.muted, marginBottom: 22, lineHeight: 18 },

  errorText: { color: '#e74c3c', fontSize: 12, marginBottom: 10 },

  googleBtn: {
    backgroundColor: Colors.cream,
    borderRadius:    Colors.radius,
    padding:         15,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             11,
  },
  googleBtnDisabled: { opacity: 0.6 },
  gCircle: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: '#4285f4',
    alignItems:      'center',
    justifyContent:  'center',
  },
  gG:          { fontSize: 13, fontWeight: '900', color: '#fff' },
  googleLabel: { fontSize: 14, fontWeight: '700', color: Colors.dark2 },

  divider:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  divLine:   { flex: 1, height: 1, backgroundColor: 'rgba(189,195,199,0.09)' },
  divText:   { fontSize: 10, color: Colors.muted },

  legal:     { fontSize: 10, color: Colors.muted, textAlign: 'center', lineHeight: 16 },
  legalLink: { color: Colors.silver },
});
