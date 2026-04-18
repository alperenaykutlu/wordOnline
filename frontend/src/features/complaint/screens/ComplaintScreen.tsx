import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { useNavigation }  from '@react-navigation/native';
import { useSelector }    from 'react-redux';
import { apiClient }      from '../../../shared/api/apiClient';
import { AppButton }      from '../../../shared/components/ui/Button/AppButton';
import { AppInput }       from '../../../shared/components/ui/Input/AppInput';
import { ConfirmModal }   from '../../../shared/components/ui/Modal/ConfirmModal';
import { InfoModal }      from '../../../shared/components/ui/Modal/InfoModal';
import { useModal }       from '../../../shared/hooks/useModal';
import type { RootState } from '../../../shared/store';

type ComplaintType = 'Bug' | 'Suggestion' | 'Abuse' | 'Other';

const TYPES: { key: ComplaintType; label: string; icon: string; desc: string }[] = [
  { key: 'Bug',        label: 'Hata Bildirimi', icon: '🐛', desc: 'Oyunda karşılaştığım bir sorun' },
  { key: 'Suggestion', label: 'Öneri',          icon: '💡', desc: 'Yeni özellik veya iyileştirme' },
  { key: 'Abuse',      label: 'Kural İhlali',   icon: '⚠️', desc: 'Uygunsuz davranış bildirimi' },
  { key: 'Other',      label: 'Diğer',          icon: '📝', desc: 'Başka bir konu' },
];

const MAX_LENGTH = 1000;

export const ComplaintScreen: React.FC = () => {
  const navigation = useNavigation();
  useSelector((s: RootState) => s.auth.username ?? '');

  const [selectedType, setSelectedType] = useState<ComplaintType>('Bug');
  const [message,      setMessage]      = useState('');
  const [msgError,     setMsgError]     = useState<string | null>(null);
  const [isSending,    setIsSending]    = useState(false);

  const confirmModal = useModal<null>();
  const successModal = useModal<null>();
  const errorModal   = useModal<{ message: string }>();

  // ── Validasyon ─────────────────────────────────────────
  const validate = useCallback((): boolean => {
    if (message.trim().length < 10) {
      setMsgError('Lütfen en az 10 karakter yazın.');
      return false;
    }
    if (message.trim().length > MAX_LENGTH) {
      setMsgError(`En fazla ${MAX_LENGTH} karakter girilebilir.`);
      return false;
    }
    setMsgError(null);
    return true;
  }, [message]);

  // ── Gönder ─────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    confirmModal.close();
    setIsSending(true);
    try {
      await apiClient.post('/social/complaints', {
        type:    selectedType,
        message: message.trim(),
      });
      setMessage('');
      successModal.open(null);
    } catch (err: any) {
      errorModal.open({
        message: err?.response?.data?.error ?? 'Gönderim başarısız. Lütfen tekrar deneyin.',
      });
    } finally {
      setIsSending(false);
    }
  }, [confirmModal, successModal, errorModal, selectedType, message]);

  const handlePressSubmit = useCallback(() => {
    if (!validate()) return;
    confirmModal.open(null);
  }, [validate, confirmModal]);

  const charPercent  = Math.round((message.length / MAX_LENGTH) * 100);
  const selectedMeta = TYPES.find(t => t.key === selectedType)!;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View style={s.header}>
          <Text style={s.headerIcon}>📬</Text>
          <Text style={s.headerTitle}>Şikayet & Öneri</Text>
          <Text style={s.headerSub}>
            Geri bildiriminiz ekibimize direkt iletilir.
          </Text>
        </View>

        {/* Tür seçimi */}
        <Text style={s.sectionLabel}>Konu türü</Text>
        <View style={s.typeGrid}>
          {TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.typeCard, selectedType === t.key && s.typeCardActive]}
              onPress={() => setSelectedType(t.key)}
              activeOpacity={0.75}
            >
              <Text style={s.typeIcon}>{t.icon}</Text>
              <Text style={[s.typeLabel, selectedType === t.key && s.typeLabelActive]}>
                {t.label}
              </Text>
              <Text style={s.typeDesc}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mesaj alanı */}
        <View style={s.messageSection}>
          <AppInput
            label={`Mesajınız — ${selectedMeta.label}`}
            placeholder={`${selectedMeta.icon}  ${selectedMeta.desc} hakkında detay yazın…`}
            value={message}
            onChangeText={t => { setMessage(t); if (msgError) setMsgError(null); }}
            error={msgError ?? undefined}
            hint={`En az 10, en fazla ${MAX_LENGTH.toLocaleString('tr-TR')} karakter.`}
            multiline
            numberOfLines={6}
            maxLength={MAX_LENGTH}
          />

          {/* Karakter sayacı çubuğu */}
          <View style={s.charRow}>
            <View style={s.charBarBg}>
              <View style={[
                s.charBarFill,
                charPercent > 90 && s.charBarWarn,
                { width: `${Math.min(charPercent, 100)}%` as any },
              ]} />
            </View>
            <Text style={[s.charCount, charPercent > 90 && s.charCountWarn]}>
              {message.length} / {MAX_LENGTH}
            </Text>
          </View>
        </View>

        {/* Gönder */}
        <AppButton
          label="Gönder"
          onPress={handlePressSubmit}
          variant="primary"
          size="lg"
          fullWidth
          loading={isSending}
          icon="📤"
        />

        {/* Bilgi notu */}
        <View style={s.note}>
          <Text style={s.noteText}>
            Mesajınız yönetici ekibine iletilir. Yanıt gerektiren durumlarda sizinle iletişime
            geçilebilir. Kişisel bilgileriniz üçüncü taraflarla paylaşılmaz.
          </Text>
        </View>
      </ScrollView>

      {/* ── Onay Modalı ────────────────────────────────── */}
      <ConfirmModal
        visible={confirmModal.isOpen}
        title={`${selectedMeta.icon}  ${selectedMeta.label}`}
        message="Mesajınız yönetici ekibine iletilecek. Onaylıyor musunuz?"
        variant="info"
        confirmLabel="Evet, Gönder"
        cancelLabel="Düzenle"
        onConfirm={handleSend}
        onCancel={confirmModal.close}
        loading={isSending}
      />

      {/* ── Başarı Modalı ───────────────────────────────── */}
      <InfoModal
        visible={successModal.isOpen}
        title="Gönderildi!"
        message="Geri bildiriminiz için teşekkürler. Ekibimiz en kısa sürede inceleyecek."
        variant="success"
        icon="🎉"
        buttonLabel="Tamam"
        onClose={() => {
          successModal.close();
          navigation.goBack();
        }}
      />

      {/* ── Hata Modalı ─────────────────────────────────── */}
      <InfoModal
        visible={errorModal.isOpen}
        title="Gönderim Başarısız"
        message={errorModal.data?.message ?? 'Bir hata oluştu.'}
        variant="error"
        buttonLabel="Tekrar Dene"
        onClose={errorModal.close}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  scroll:    { padding: 20, paddingBottom: 50, gap: 16 },

  header: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  headerIcon:  { fontSize: 44 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerSub:   { fontSize: 13, color: '#4A5A7A', textAlign: 'center' },

  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#5A6A8A', textTransform: 'uppercase', letterSpacing: 1 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    width:           '48%',
    backgroundColor: '#13132A',
    borderRadius:    12,
    padding:         12,
    borderWidth:     1.5,
    borderColor:     '#1E1E3E',
    gap:             4,
  },
  typeCardActive: {
    borderColor:     '#2980B9',
    backgroundColor: '#0D1E2E',
  },
  typeIcon:  { fontSize: 20 },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#A0B4D8' },
  typeLabelActive: { color: '#5DADE2' },
  typeDesc:  { fontSize: 11, color: '#3A4A6A', lineHeight: 16 },

  messageSection: { gap: 6 },

  charRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    marginTop:      4,
  },
  charBarBg: {
    flex:            1,
    height:          3,
    backgroundColor: '#1E1E3E',
    borderRadius:    2,
    overflow:        'hidden',
  },
  charBarFill: {
    height:          '100%',
    backgroundColor: '#2980B9',
    borderRadius:    2,
  },
  charBarWarn:  { backgroundColor: '#E74C3C' },
  charCount:    { fontSize: 11, color: '#3A4A6A', minWidth: 56, textAlign: 'right' },
  charCountWarn:{ color: '#E74C3C' },

  note: {
    backgroundColor: '#0A0A18',
    borderRadius:    10,
    padding:         12,
    borderWidth:     1,
    borderColor:     '#1A1A3E',
  },
  noteText: { color: '#2A3A5A', fontSize: 11, lineHeight: 18, textAlign: 'center' },
});
