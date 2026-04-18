import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/store';

declare const process: { env: Record<string, string | undefined> };

const AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : process.env.GOOGLE_ADS_BANNER_ID ?? TestIds.BANNER;

interface AdBannerProps {
  onRemoveAdsPress?: () => void;
}

/// <summary>
/// Ad-free kullanıcılarda hiç render olmaz.
/// Normal kullanıcılarda Google AdMob banner gösterir.
/// Sağ köşede "Reklamları Kaldır" butonu bulunur.
/// </summary>
export const AdBanner: React.FC<AdBannerProps> = ({ onRemoveAdsPress }) => {
  const isAdFree = useSelector((s: RootState) => s.payment.isAdFree);
  const isChecked= useSelector((s: RootState) => s.payment.isChecked);
  const slideAnim= useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (isChecked && !isAdFree) {
      Animated.spring(slideAnim, {
        toValue: 0, tension: 50, friction: 10, useNativeDriver: true,
      }).start();
    }
  }, [isChecked, isAdFree]);

  // Ad-free veya henüz kontrol edilmediyse hiçbir şey gösterme
  if (!isChecked || isAdFree) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      {/* Google AdMob Banner */}
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />

      {/* Reklamları kaldır butonu */}
      {onRemoveAdsPress && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemoveAdsPress}
          activeOpacity={0.75}
        >
          <Text style={styles.removeBtnText}>✕ Reklamları Kaldır</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D0D1A',
    borderTopWidth:  1,
    borderTopColor:  '#1E1E3E',
    alignItems:      'center',
    paddingTop:      4,
    paddingBottom:   4,
  },
  removeBtn: {
    marginTop:       4,
    paddingVertical: 3,
    paddingHorizontal:10,
  },
  removeBtnText: {
    color:    '#3A4A6A',
    fontSize: 11,
    textDecorationLine:'underline',
  },
});
