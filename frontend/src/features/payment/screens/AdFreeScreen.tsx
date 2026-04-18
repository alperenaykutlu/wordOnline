import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, Animated,
} from 'react-native';
import { useAdFree }     from '../hooks/useAdFree';
import { AppButton }     from '@shared/components/ui/Button/AppButton';
import { ConfirmModal }  from '@shared/components/ui/Modal/ConfirmModal';
import { InfoModal }     from '@shared/components/ui/Modal/InfoModal';
import { useModal }      from '@shared/hooks/useModal';

const FEATURES = [
  { icon: '🚫', title: 'Sıfır Reklam',         desc: 'Hiç reklam görmeden oyna. Sonsuza kadar.' },
  { icon: '⚡', title: 'Kesintisiz Oyun',       desc: 'Reklam arası yok, akışın hiç bozulmuyor.' },
  { icon: '🏆', title: 'Premium Oyuncu Rozeti', desc: 'Profilinde özel rozet ile öne çık.' },
  { icon: '❤️', title: 'Gelişimi Destekle',     desc: 'Reklamı kaldırarak oyunun gelişimine katkı sağla.' },
];

export const AdFreeScreen: React.FC = () => {
  const {
    isAdFree, isPurchasing, product,
    iapReady, isLoadingProduct,
    loadProduct, startPurchase,
  } = useAdFree();

  const confirmModal = useModal<null>();
  const alreadyModal = useModal<null>();

  const glowAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Parıltı animasyonu
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  }, [glowAnim]);

  const handlePressRemoveAds = () => {
    if (isAdFree) { alreadyModal.open(null); return; }
    confirmModal.open(null);
  };

  const handleConfirmPurchase = async () => {
    confirmModal.close();
    await startPurchase();
  };

  const priceText = product?.localizedPrice ?? '₺XX.XX';
  const borderColor = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['#1A2A4E', '#F39C12'],
  });

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <Animated.View style={[s.hero, { borderColor }]}>
          <Text style={s.heroIcon}>👑</Text>
          <Text style={s.heroTitle}>Reklamsız Deneyim</Text>
          <Text style={s.heroSub}>Tek ödeme, ömür boyu reklamsız oyun</Text>
          {isAdFree && (
            <View style={s.activeBadge}>
              <Text style={s.activeBadgeText}>✓ AKTİF</Text>
            </View>
          )}
        </Animated.View>

        {/* Özellikler */}
        <View style={s.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <View style={s.featureText}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Fiyat kartı */}
        {!isAdFree && (
          <View style={s.priceCard}>
            <View style={s.priceLeft}>
              <Text style={s.priceLabel}>Tek Seferlik Ödeme</Text>
              <Text style={s.priceValue}>{isLoadingProduct ? '...' : priceText}</Text>
              <Text style={s.priceNote}>KDV dahil • Abonelik değil</Text>
            </View>
            <View style={s.priceDivider} />
            <View style={s.priceRight}>
              <Text style={s.priceCompare}>Günlük reklam yerine</Text>
              <Text style={s.priceForever}>Sonsuza Kadar</Text>
              <Text style={s.priceForeverSub}>reklamsız oyna</Text>
            </View>
          </View>
        )}

        {/* CTA Butonu */}
        <View style={s.ctaSection}>
          {isAdFree ? (
            <View style={s.alreadyBox}>
              <Text style={s.alreadyIcon}>🎉</Text>
              <Text style={s.alreadyText}>Reklamsız deneyim aktif!</Text>
              <Text style={s.alreadySub}>Reklamlardan tamamen kurtuldun.</Text>
            </View>
          ) : (
            <>
              <AppButton
                label={isPurchasing ? 'Doğrulanıyor…' : `Reklamları Kaldır — ${priceText}`}
                onPress={handlePressRemoveAds}
                variant="primary"
                size="lg"
                fullWidth
                loading={isPurchasing}
                disabled={!iapReady || isLoadingProduct}
                icon={isPurchasing ? undefined : '👑'}
              />
              <Text style={s.legalText}>
                Satın alma işlemi Google Play üzerinden güvenle gerçekleştirilir.
                Satın alma onaylandıktan sonra iade yapılmaz.
              </Text>
            </>
          )}
        </View>

      </ScrollView>

      {/* Onay Modalı */}
      <ConfirmModal
        visible={confirmModal.isOpen}
        title="Reklamları Kaldır"
        message={`${priceText} karşılığında reklamları sonsuza kadar kaldır. Google Play üzerinden güvenli ödeme.`}
        variant="info"
        icon="👑"
        confirmLabel={`${priceText} Öde`}
        cancelLabel="Vazgeç"
        onConfirm={handleConfirmPurchase}
        onCancel={confirmModal.close}
        loading={isPurchasing}
      />

      {/* Zaten sahip */}
      <InfoModal
        visible={alreadyModal.isOpen}
        title="Zaten Aktif!"
        message="Reklamsız deneyim hesabına bağlı. Reklamları görmüyorsun."
        variant="success"
        icon="🎉"
        buttonLabel="Harika!"
        onClose={alreadyModal.close}
      />

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  scroll:    { padding: 20, paddingBottom: 60, gap: 16 },

  hero: {
    backgroundColor: '#13132A',
    borderRadius:    20,
    padding:         28,
    alignItems:      'center',
    borderWidth:     2,
    gap:             8,
  },
  heroIcon:  { fontSize: 56 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  heroSub:   { fontSize: 14, color: '#7A8AAA', textAlign: 'center' },
  activeBadge: {
    backgroundColor: '#0D2A18', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 1, borderColor: '#27AE60', marginTop: 8,
  },
  activeBadgeText: { color: '#27AE60', fontWeight: '800', fontSize: 13 },

  features: { gap: 10 },
  featureRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#13132A',
    borderRadius:    14,
    padding:         16,
    borderWidth:     1,
    borderColor:     '#1E1E3E',
    gap:             14,
  },
  featureIcon:  { fontSize: 28, width: 40 },
  featureText:  { flex: 1, gap: 3 },
  featureTitle: { color: '#E0E8FF', fontSize: 14, fontWeight: '700' },
  featureDesc:  { color: '#4A5A7A', fontSize: 12, lineHeight: 17 },

  priceCard: {
    backgroundColor: '#1A2A4E',
    borderRadius:    16,
    padding:         20,
    flexDirection:   'row',
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     '#F39C12',
  },
  priceLeft:    { flex: 1, gap: 4 },
  priceRight:   { flex: 1, alignItems: 'flex-end', gap: 2 },
  priceDivider: { width: 1, height: 60, backgroundColor: '#2A3A6E', marginHorizontal: 16 },
  priceLabel:   { color: '#F39C12', fontSize: 12, fontWeight: '600' },
  priceValue:   { color: '#FFF', fontSize: 30, fontWeight: '900' },
  priceNote:    { color: '#4A5A7A', fontSize: 11 },
  priceCompare: { color: '#4A5A7A', fontSize: 11, textAlign: 'right' },
  priceForever: { color: '#27AE60', fontSize: 20, fontWeight: '900', textAlign: 'right' },
  priceForeverSub: { color: '#5A8A6A', fontSize: 11, textAlign: 'right' },

  ctaSection: { gap: 12 },
  legalText:  { color: '#2A3A5A', fontSize: 11, textAlign: 'center', lineHeight: 16 },

  alreadyBox: {
    backgroundColor: '#0D2A18',
    borderRadius:    16,
    padding:         24,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     '#27AE60',
    gap:             8,
  },
  alreadyIcon: { fontSize: 40 },
  alreadyText: { color: '#27AE60', fontSize: 18, fontWeight: '800' },
  alreadySub:  { color: '#5A8A6A', fontSize: 13, textAlign: 'center' },
});
