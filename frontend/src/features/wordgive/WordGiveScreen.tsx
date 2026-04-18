import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppButton }    from '../../shared/components/ui/Button/AppButton';
import { ConfirmModal } from '../../shared/components/ui/Modal/ConfirmModal';
import { InfoModal }    from '../../shared/components/ui/Modal/InfoModal';
import { useModal }     from '../../shared/hooks/useModal';
import { toast }        from '../../shared/components/ui/Toast/Toast';
import { isValidWord }  from '../../shared/utils/sanitizer';
import { Colors }       from '../../shared/constants/colors';
import { gameApi }      from '../game/shared/api/gameApi';

const LENGTHS = [3, 4, 5, 6, 7];

// ── Tile — önizleme kutusu ───────────────────────────────
const Tile: React.FC<{
  letter:    string;
  index:     number;
  isFirst:   boolean;
  isCurrent: boolean;
}> = ({ letter, index, isFirst, isCurrent }) => (
  <View style={[
    t.tile,
    isFirst    && t.tileFirst,
    !!letter   && t.tileFilled,
    isCurrent  && t.tileCurrent,
  ]}>
    <Text style={[t.letter, isFirst && t.letterFirst]}>{letter}</Text>
    <Text style={t.idx}>{index + 1}</Text>
    {isCurrent && !letter && <View style={t.cursor} />}
  </View>
);

const t = StyleSheet.create({
  tile: { width: 44, height: 50, borderRadius: Colors.radius, borderWidth: 1.5, borderColor: Colors.silverAlpha10, backgroundColor: Colors.creamAlpha04, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, position: 'relative', overflow: 'hidden' },
  tileFirst:   { borderColor: 'rgba(230,126,34,0.38)', backgroundColor: Colors.orangeAlpha10 },
  tileFilled:  { borderColor: Colors.creamAlpha22 },
  tileCurrent: { borderColor: Colors.creamAlpha22 },
  letter:      { fontSize: 19, fontWeight: '800', color: Colors.cream, lineHeight: 22 },
  letterFirst: { color: Colors.orange },
  idx:         { fontSize: 8, color: Colors.muted, fontWeight: '500' },
  cursor:      { position: 'absolute', bottom: 6, width: 12, height: 2, backgroundColor: Colors.orange, borderRadius: 1 },
});

// ── Klavye tuşu ──────────────────────────────────────────
const Key: React.FC<{ label: string; onPress: () => void; wide?: boolean }> = ({ label, onPress, wide }) => (
  <TouchableOpacity
    style={[k.key, wide && k.wide]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={k.label}>{label}</Text>
  </TouchableOpacity>
);

const k = StyleSheet.create({
  key:   { height: 40, minWidth: 27, flex: 1, maxWidth: 33, borderRadius: 5, backgroundColor: Colors.dark3, borderWidth: 1, borderColor: Colors.creamAlpha07, alignItems: 'center', justifyContent: 'center' },
  wide:  { maxWidth: 46, minWidth: 38 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.cream },
});

const ROWS = [
  ['E','R','T','Y','U','I','O','P','Ğ','Ü'],
  ['A','S','D','F','G','H','J','K','L','Ş','İ'],
  ['Z','C','V','B','N','M','Ö','Ç'],
];

// ── Ana Ekran ─────────────────────────────────────────────
export const WordGiveScreen: React.FC = () => {
  const navigation  = useNavigation<any>();
  const route       = useRoute<any>();
  const roomId      = route.params?.roomId as string;
  const opponentName= route.params?.opponentName ?? 'Rakibin';
  const roundNumber = route.params?.round ?? 1;

  const [wordLen,  setWordLen]  = useState(5);
  const [letters,  setLetters]  = useState<string[]>([]);
  const [isSending,setIsSending]= useState(false);

  const confirmModal = useModal<{ word: string }>();
  const successModal = useModal<null>();
  const errorModal   = useModal<{ message: string }>();

  // Uzunluk değişince harfleri kırp
  useEffect(() => {
    setLetters(prev => prev.slice(0, wordLen));
  }, [wordLen]);

  const addLetter = useCallback((l: string) => {
    setLetters(prev => prev.length < wordLen ? [...prev, l.toUpperCase()] : prev);
  }, [wordLen]);

  const deleteLetter = useCallback(() => {
    setLetters(prev => prev.slice(0, -1));
  }, []);

  const handleSend = useCallback(() => {
    const word = letters.join('');
    if (letters.length < wordLen) {
      toast.show({ message: `Kelime ${wordLen} harf olmalı.`, variant: 'warning' });
      return;
    }
    if (!isValidWord(word)) {
      toast.show({ message: 'Geçerli bir kelime giriniz.', variant: 'error' });
      return;
    }
    confirmModal.open({ word });
  }, [letters, wordLen, confirmModal]);

  const handleConfirmSend = useCallback(async () => {
    const word = confirmModal.data?.word;
    if (!word) return;
    confirmModal.close();
    setIsSending(true);
    try {
      await gameApi.assignWord(roomId, word);
      successModal.open(null);
    } catch (err: any) {
      errorModal.open({ message: err?.response?.data?.error ?? 'Kelime gönderilemedi.' });
    } finally {
      setIsSending(false);
    }
  }, [confirmModal, roomId, successModal, errorModal]);

  const word       = letters.join('');
  const isComplete = letters.length === wordLen;
  const firstLetter= letters[0] ?? '';

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.title}>Kelime Ver</Text>
          <Text style={s.subtitle}>Rakibine bulmaca hazırla</Text>
        </View>
      </View>

      {/* Rakip bilgi kartı */}
      <View style={s.oppCard}>
        <View style={s.oppAv}>
          <Text style={s.oppAvText}>{opponentName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={s.oppInfo}>
          <Text style={s.oppLabel}>Rakibin</Text>
          <Text style={s.oppName}>{opponentName}</Text>
        </View>
        <View style={s.rauntBadge}>
          <Text style={s.rauntText}>Raunt {roundNumber}</Text>
        </View>
      </View>

      {/* Açıklama */}
      <Text style={s.note}>
        Rakibine bulmak için bir kelime yaz.{' '}
        <Text style={{ color: Colors.silver, fontWeight: '600' }}>İlk harf her zaman açık gelir</Text>
        {' '}— bunu bilerek seç.
      </Text>

      {/* Tile önizleme */}
      <View style={s.builder}>
        <View style={s.tilesRow}>
          {Array.from({ length: wordLen }).map((_, i) => (
            <Tile
              key={i}
              letter={letters[i] ?? ''}
              index={i}
              isFirst={i === 0}
              isCurrent={i === letters.length && i < wordLen}
            />
          ))}
        </View>

        {/* Uzunluk seçici */}
        <View style={s.lenChips}>
          {LENGTHS.map(len => (
            <TouchableOpacity
              key={len}
              style={[s.lchip, wordLen === len && s.lchipActive]}
              onPress={() => setWordLen(len)}
            >
              <Text style={[s.lchipText, wordLen === len && s.lchipTextActive]}>{len}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Klavye */}
        <View style={s.kbd}>
          {ROWS.map((row, ri) => (
            <View key={ri} style={s.krow}>
              {ri === 2 && <Key label="⌫" onPress={deleteLetter} wide />}
              {row.map(l => <Key key={l} label={l} onPress={() => addLetter(l)} />)}
            </View>
          ))}
        </View>
      </View>

      {/* Gönder butonu */}
      <View style={s.sendWrap}>
        <AppButton
          label={isComplete ? `"${word}" Gönder` : `${letters.length}/${wordLen} harf`}
          onPress={handleSend}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isComplete || isSending}
          loading={isSending}
        />
      </View>

      {/* Onay modalı */}
      <ConfirmModal
        visible={confirmModal.isOpen}
        title={`"${confirmModal.data?.word ?? ''}" gönderilsin mi?`}
        message={`${opponentName} bu ${wordLen} harfli kelimeyi bulmaya çalışacak. İlk harf (${firstLetter}) açık gelecek. Gönderildikten sonra değiştirilemez.`}
        variant="info"
        icon="🔄"
        confirmLabel="Gönder"
        cancelLabel="Değiştir"
        onConfirm={handleConfirmSend}
        onCancel={confirmModal.close}
        loading={isSending}
      />

      {/* Başarı modalı */}
      <InfoModal
        visible={successModal.isOpen}
        title="Kelime Gönderildi!"
        message={`${opponentName}'nin de sana kelime göndermesi bekleniyor. Hazır olduğunda oyun başlayacak.`}
        variant="success"
        icon="✓"
        buttonLabel="Oyunu Bekle"
        onClose={() => { successModal.close(); navigation.navigate('Home'); }}
      />

      {/* Hata modalı */}
      <InfoModal
        visible={errorModal.isOpen}
        title="Gönderim Başarısız"
        message={errorModal.data?.message ?? 'Bir hata oluştu.'}
        variant="error"
        buttonLabel="Tamam"
        onClose={errorModal.close}
      />

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark2 },

  header:    { paddingTop: 12, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 0 },
  backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark3, borderWidth: 1, borderColor: Colors.creamAlpha07, alignItems: 'center', justifyContent: 'center' },
  backText:  { fontSize: 22, color: Colors.silver, lineHeight: 28, fontWeight: '300' },
  headerInfo:{ flex: 1 },
  title:     { fontSize: 18, fontWeight: '800', color: Colors.cream },
  subtitle:  { fontSize: 11, color: Colors.muted, marginTop: 2 },

  oppCard:   { margin: 20, marginTop: 16, backgroundColor: Colors.dark3, borderRadius: Colors.radius, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(230,126,34,0.14)' },
  oppAv:     { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.orangeAlpha10, borderWidth: 2, borderColor: 'rgba(230,126,34,0.28)', alignItems: 'center', justifyContent: 'center' },
  oppAvText: { fontSize: 17, fontWeight: '800', color: Colors.orange },
  oppInfo:   { flex: 1 },
  oppLabel:  { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  oppName:   { fontSize: 14, fontWeight: '700', color: Colors.cream, marginTop: 1 },
  rauntBadge:{ backgroundColor: Colors.orangeAlpha10, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  rauntText: { fontSize: 10, fontWeight: '700', color: Colors.orange },

  note: { marginHorizontal: 22, fontSize: 12, color: Colors.muted, lineHeight: 18, marginBottom: 16 },

  builder: { flex: 1, alignItems: 'center', gap: 13, paddingHorizontal: 10 },
  tilesRow: { flexDirection: 'row', gap: 8 },

  lenChips: { flexDirection: 'row', gap: 6 },
  lchip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: Colors.silverAlpha10, backgroundColor: 'transparent' },
  lchipActive:    { borderColor: Colors.orange, backgroundColor: Colors.orangeAlpha10 },
  lchipText:      { fontSize: 11, fontWeight: '600', color: Colors.muted },
  lchipTextActive:{ color: Colors.orange },

  kbd:  { width: '100%', gap: 5 },
  krow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },

  sendWrap: { padding: 22, paddingTop: 10 },
});
