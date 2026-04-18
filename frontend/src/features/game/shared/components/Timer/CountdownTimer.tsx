import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import Sound from 'react-native-sound';

interface CountdownTimerProps {
  totalSeconds: number;
  onExpire:     () => void;
  onTick?:      (remaining: number) => void;
  paused?:      boolean;
}

Sound.setCategory('Playback');

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  totalSeconds,
  onExpire,
  onTick,
  paused = false,
}) => {
  const [remaining, setRemaining] = React.useState(totalSeconds);

  const scaleAnim    = useRef(new Animated.Value(1)).current;
  const opacityAnim  = useRef(new Animated.Value(1)).current;
  const pulseLoop    = useRef<Animated.CompositeAnimation | null>(null);
  const tensionSound = useRef<Sound | null>(null);
  const tickSound    = useRef<Sound | null>(null);
  const expireCalled = useRef(false);

  const isCritical   = remaining <= 10 && remaining > 0;
  const isDangerous  = remaining <= 5  && remaining > 0;

  // ── Ses Yükleme ──────────────────────────────────────
  useEffect(() => {
    tensionSound.current = new Sound('tension.mp3', Sound.MAIN_BUNDLE, (err) => {
      if (!err) tensionSound.current!.setNumberOfLoops(-1); // loop
    });
    tickSound.current = new Sound('tick.mp3', Sound.MAIN_BUNDLE);

    return () => {
      tensionSound.current?.stop();
      tensionSound.current?.release();
      tickSound.current?.release();
    };
  }, []);

  // ── Geri Sayım ───────────────────────────────────────
  useEffect(() => {
    if (paused || remaining <= 0) return;

    const timer = setTimeout(() => {
      const next = remaining - 1;
      setRemaining(next);
      onTick?.(next);

      if (next <= 0 && !expireCalled.current) {
        expireCalled.current = true;
        tensionSound.current?.stop();
        onExpire();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [remaining, paused, onExpire, onTick]);

  // ── Pulse Animasyon — Son 10 saniye ──────────────────
  useEffect(() => {
    if (isCritical) {
      tensionSound.current?.play();

      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue:        isDangerous ? 1.5 : 1.35,
              duration:       isDangerous ? 400 : 500,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue:        0.75,
              duration:       isDangerous ? 400 : 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue:        1,
              duration:       isDangerous ? 400 : 500,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue:        1,
              duration:       isDangerous ? 400 : 500,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseLoop.current.start();
    } else {
      tensionSound.current?.stop();
      pulseLoop.current?.stop();
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
    }

    return () => {
      pulseLoop.current?.stop();
    };
  }, [isCritical, isDangerous, scaleAnim, opacityAnim]);

  // ── Renk ─────────────────────────────────────────────
  const timerColor = isDangerous
    ? '#E74C3C'
    : isCritical
    ? '#F39C12'
    : '#FFFFFF';

  const progressRatio = remaining / totalSeconds;
  const progressColor = isDangerous
    ? '#E74C3C'
    : isCritical
    ? '#F39C12'
    : '#27AE60';

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[
          styles.progressFill,
          {
            width:           `${progressRatio * 100}%`,
            backgroundColor: progressColor,
          }
        ]} />
      </View>

      {/* Büyüyüp küçülen rakam */}
      <Animated.Text style={[
        styles.timer,
        {
          color:    timerColor,
          transform:[{ scale: scaleAnim }],
          opacity:  opacityAnim,
        },
        isCritical  && styles.criticalTimer,
        isDangerous && styles.dangerousTimer,
      ]}>
        {remaining}
      </Animated.Text>

      {isCritical && (
        <Text style={[styles.label, { color: timerColor }]}>
          {isDangerous ? '⚠️ ACELE ET!' : '⏱ Son saniyeler'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems:    'center',
    paddingVertical: 8,
  },
  progressBar: {
    width:           '100%',
    height:          6,
    backgroundColor: '#2C2C3E',
    borderRadius:    3,
    overflow:        'hidden',
    marginBottom:    8,
  },
  progressFill: {
    height:      '100%',
    borderRadius: 3,
  },
  timer: {
    fontSize:   48,
    fontWeight: '900',
    color:      '#FFFFFF',
    fontVariant:['tabular-nums'],
    letterSpacing: 2,
  },
  criticalTimer: {
    fontSize:    56,
    fontWeight:  '900',
    textShadowColor:  '#F39C12',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  dangerousTimer: {
    fontSize:    64,
    textShadowColor:  '#E74C3C',
    textShadowRadius: 16,
  },
  label: {
    fontSize:    13,
    fontWeight:  '600',
    marginTop:   4,
    letterSpacing: 1,
  },
});
