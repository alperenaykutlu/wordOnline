import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseModal } from './BaseModal';
import { AppButton } from '../Button/AppButton';
import { AppInput }  from '../Input/AppInput';

interface InputModalProps {
  visible:        boolean;
  title:          string;
  message?:       string;
  label:          string;
  placeholder?:   string;
  defaultValue?:  string;
  hint?:          string;
  maxLength?:     number;
  icon?:          string;
  confirmLabel?:  string;
  cancelLabel?:   string;
  validate?:      (value: string) => string | null;  // hata mesajı döner
  onConfirm:      (value: string) => void;
  onCancel:       () => void;
  loading?:       boolean;
}

export const InputModal: React.FC<InputModalProps> = ({
  visible, title, message, label, placeholder,
  defaultValue = '', hint, maxLength = 20, icon,
  confirmLabel = 'Kaydet', cancelLabel = 'Vazgeç',
  validate, onConfirm, onCancel, loading = false,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(defaultValue);
      setError(null);
    }
  }, [visible, defaultValue]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Bu alan boş bırakılamaz.');
      return;
    }
    if (validate) {
      const err = validate(trimmed);
      if (err) { setError(err); return; }
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <BaseModal visible={visible} onClose={onCancel} position="center">

      {/* Başlık */}
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}

      {/* Input */}
      <View style={styles.inputWrap}>
        <AppInput
          label={label}
          placeholder={placeholder}
          value={value}
          onChangeText={(t) => { setValue(t); setError(null); }}
          error={error ?? undefined}
          hint={hint}
          maxLength={maxLength}
          clearable
          onClear={() => { setValue(''); setError(null); }}
          autoFocus
        />
        <Text style={styles.charCount}>{value.length}/{maxLength}</Text>
      </View>

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
            onPress={handleConfirm}
            variant="primary"
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
  icon:      { fontSize: 36, textAlign: 'center', marginBottom: 10 },
  title:     { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  message:   { fontSize: 13, color: '#7A8AAE', lineHeight: 20, marginBottom: 16 },
  inputWrap: { marginBottom: 20, gap: 4 },
  charCount: { color: '#3A4A6A', fontSize: 11, textAlign: 'right' },
  buttons:   { flexDirection: 'row', gap: 10 },
  btnWrap:   { flex: 1 },
});
