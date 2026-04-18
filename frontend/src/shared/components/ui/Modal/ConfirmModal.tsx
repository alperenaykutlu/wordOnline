import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseModal }  from './BaseModal';
import { AppButton }  from '../Button/AppButton';

export type ConfirmVariant = 'info' | 'warning' | 'danger' | 'success';

interface ConfirmModalProps {
  visible:       boolean;
  title:         string;
  message:       string;
  variant?:      ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?:  string;
  onConfirm:     () => void;
  onCancel:      () => void;
  loading?:      boolean;
  icon?:         string;
}

const VARIANT_CONFIG: Record<ConfirmVariant, { icon: string; accent: string }> = {
  info:    { icon: 'ℹ️', accent: '#2980B9' },
  warning: { icon: '⚠️', accent: '#F39C12' },
  danger:  { icon: '🗑️', accent: '#E74C3C' },
  success: { icon: '✅', accent: '#27AE60' },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible, title, message, variant = 'info',
  confirmLabel = 'Onayla', cancelLabel = 'Vazgeç',
  onConfirm, onCancel, loading = false, icon,
}) => {
  const cfg = VARIANT_CONFIG[variant];

  return (
    <BaseModal visible={visible} onClose={onCancel} position="center">
      {/* Accent çizgisi */}
      <View style={[styles.accentBar, { backgroundColor: cfg.accent }]} />

      {/* İkon */}
      <Text style={styles.icon}>{icon ?? cfg.icon}</Text>

      {/* Başlık */}
      <Text style={styles.title}>{title}</Text>

      {/* Mesaj */}
      <Text style={styles.message}>{message}</Text>

      {/* Butonlar */}
      <View style={styles.buttons}>
        <View style={styles.btnWrap}>
          <AppButton
            label={cancelLabel}
            onPress={onCancel}
            variant="secondary"
            size="md"
            fullWidth
            disabled={loading}
          />
        </View>
        <View style={styles.btnWrap}>
          <AppButton
            label={confirmLabel}
            onPress={onConfirm}
            variant={variant === 'danger' ? 'danger' : variant === 'success' ? 'success' : 'primary'}
            size="md"
            fullWidth
            loading={loading}
          />
        </View>
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  accentBar: { height: 3, borderRadius: 2, marginBottom: 20 },
  icon:      { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  title:     { fontSize: 18, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  message:   { fontSize: 14, color: '#8A9ABE', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  buttons:   { flexDirection: 'row', gap: 10 },
  btnWrap:   { flex: 1 },
});
