/**
 * Wordle Online — Design Token'ları
 * Tüm bileşenler bu renklerden türetilir. Hiçbir yerde hardcode hex kullanılmaz.
 */
export const Colors = {
  // ── Ana Palet ────────────────────────────────────────
  cream:   '#ecf0f1',   // Ana metin, açık yüzeyler
  silver:  '#bdc3c7',   // İkincil metin, border
  orange:  '#e67e22',   // Aksan, CTA, aktif öğe
  orange2: '#d35400',   // Orange hover / pressed
  dark:    '#2c3e50',   // Ana arka plan
  dark2:   '#1a252f',   // Derin arka plan (screen bg)
  dark3:   '#243342',   // Kart arka planı
  mid:     '#34495e',   // Pressed state, orta ton
  muted:   '#7f8c8d',   // Placeholder, label

  // ── Semantik ─────────────────────────────────────────
  green:   '#27ae60',   // Correct harf
  greenBg: 'rgba(39,174,96,0.22)',
  greenBorder: 'rgba(39,174,96,0.50)',

  yellow:  '#f39c12',   // Wrong position harf
  yellowBg: 'rgba(230,126,34,0.20)',
  yellowBorder: 'rgba(230,126,34,0.48)',

  grayBg:     'rgba(189,195,199,0.10)',
  grayBorder: 'rgba(189,195,199,0.18)',

  // ── Alpha varyantları ─────────────────────────────────
  orangeAlpha10: 'rgba(230,126,34,0.10)',
  orangeAlpha18: 'rgba(230,126,34,0.18)',
  orangeAlpha22: 'rgba(230,126,34,0.22)',

  creamAlpha04: 'rgba(236,240,241,0.04)',
  creamAlpha07: 'rgba(236,240,241,0.07)',
  creamAlpha10: 'rgba(236,240,241,0.10)',
  creamAlpha22: 'rgba(236,240,241,0.22)',

  silverAlpha10: 'rgba(189,195,199,0.10)',
  silverAlpha18: 'rgba(189,195,199,0.18)',

  // ── Border radius ─────────────────────────────────────
  radius: 6,
  radiusLg: 14,
  radiusXl: 20,
  radiusPill: 40,
} as const;

export type ColorKey = keyof typeof Colors;
