import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseModal } from './BaseModal';
import { AppButton } from '../Button/AppButton';

type InfoVariant = 'info' | 'success' | 'error' | 'warning';

interface InfoModalProps {
  visible:      boolean;
  title:        string;
  message:      string;
  variant?:     InfoVariant;
  buttonLabel?: string;
  onClose:      () => void;
  icon?:        string;
  extraContent?:React.ReactNode;
}

const VARIANT_CONFIG: Record<InfoVariant, { icon: string; accent: string; btnVariant: any }> = {
  info:    { icon: 'ℹ️', accent: '#2980B9', btnVariant: 'primary'   },
  success: { icon: '🎉', accent: '#27AE60', btnVariant: 'success'   },
  error:   { icon: '❌', accent: '#E74C3C', btnVariant: 'danger'    },
  warning: { icon: '⚠️', accent: '#F39C12', btnVariant: 'secondary' },
};

export const InfoModal: React.FC<InfoModalProps> = ({
  visible, title, message, variant = 'info',
  buttonLabel = 'Tamam', onClose, icon, extraContent,
}) => {
  const cfg = VARIANT_CONFIG[variant];

  return (
    <BaseModal visible={visible} onClose={onClose} position="center">
      <View style={[styles.accentBar, { backgroundColor: cfg.accent }]} />

      <Text style={styles.icon}>{icon ?? cfg.icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {extraContent}

      <View style={styles.btnWrap}>
        <AppButton
          label={buttonLabel}
          onPress={onClose}
          variant={cfg.btnVariant}
          size="md"
          fullWidth
        />
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  accentBar: { height: 3, borderRadius: 2, marginBottom: 20 },
  icon:      { fontSize: 44, textAlign: 'center', marginBottom: 12 },
  title:     { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 8 },
  message:   { fontSize: 14, color: '#8A9ABE', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btnWrap:   { width: '100%' },
});
