import React, { useRef } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, Animated,
  ActivityIndicator, View,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label:      string;
  onPress:    () => void;
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  disabled?:  boolean;
  icon?:      string;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary:  { bg: '#2980B9', text: '#FFF', border: '#3498DB' },
  secondary:{ bg: '#2C2C4E', text: '#A0B4D8', border: '#3A3A6E' },
  danger:   { bg: '#922B21', text: '#FFF', border: '#E74C3C' },
  ghost:    { bg: 'transparent', text: '#7ABAFF', border: '#2A3A6E' },
  success:  { bg: '#1E8449', text: '#FFF', border: '#27AE60' },
};

const SIZE_STYLES: Record<ButtonSize, { padding: number; fontSize: number; radius: number }> = {
  sm: { padding: 8,  fontSize: 13, radius: 8  },
  md: { padding: 13, fontSize: 15, radius: 10 },
  lg: { padding: 16, fontSize: 17, radius: 12 },
};

export const AppButton: React.FC<AppButtonProps> = ({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, fullWidth = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const vs        = VARIANT_STYLES[variant];
  const ss        = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };

  return (
    <Animated.View style={[
      { transform: [{ scale: scaleAnim }] },
      fullWidth && styles.fullWidth,
    ]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          styles.btn,
          {
            backgroundColor:   vs.bg,
            borderColor:       vs.border,
            paddingVertical:   ss.padding,
            borderRadius:      ss.radius,
          },
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={vs.text} size="small" />
        ) : (
          <View style={styles.inner}>
            {icon && <Text style={[styles.icon, { fontSize: ss.fontSize + 2 }]}>{icon}</Text>}
            <Text style={[styles.label, { color: vs.text, fontSize: ss.fontSize }]}>
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  btn: {
    borderWidth:    1,
    paddingHorizontal: 20,
    alignItems:     'center',
    justifyContent: 'center',
    minWidth:       80,
  },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.45 },
  inner:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon:      { },
  label:     { fontWeight: '700', letterSpacing: 0.2 },
});
